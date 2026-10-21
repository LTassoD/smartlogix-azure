"""
REGISTRO CONTINUO DE MENSAJERIA (EP2) - SmartLogix
=================================================
Ejecuta rondas periodicas que ejercitan el FLUO REAL de la aplicacion y deja
un registro (CSV) con la telemetria de Azure Service Bus de cada ronda.

Cada ronda hace, en orden:
  1. POST /api/inventory/products   -> publica `product.created`  (ASINCRONO, topic catalogo)
  2. POST /api/orders               -> crea el pedido            (sin mensajeria)
  3. PATCH /api/orders/{id}/confirm -> stock check SINCRONO (request/reply con 2 colas)
                                    -> publica `order.created`  (ASINCRONO, topic orders)
  4. Snapshot de contadores de Service Bus (activos / dead-letter / total) de
     las 4 subscriptions y las 2 colas, y se anexa al CSV de registro.

Uso:
  export SB_CONN="Endpoint=sb://...;SharedAccessKeyName=smartlogix-admin;SharedAccessKey=..."
  python registro_mensajeria.py                # una sola ronda
  python registro_mensajeria.py --loop --interval 900 --until 18:45
"""

import argparse
import csv
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

from azure.servicebus.management import ServiceBusAdministrationClient

BASE = os.environ.get("SMARTLOGIX_BASE", "http://20.121.31.149")
CONN = os.environ["SB_CONN"]
CSV_PATH = os.environ.get("REGISTRO_CSV", "registro_mensajeria.csv")

ORDERS_TOPIC = "smartlogix.orders.topic"
CATALOG_TOPIC = "smartlogix.catalog.topic"
SUBS = (
    (ORDERS_TOPIC, "inventory-sub"),
    (ORDERS_TOPIC, "shipping-created-sub"),
    (ORDERS_TOPIC, "shipping-cancelled-sub"),
    (CATALOG_TOPIC, "catalog-audit-sub"),
)
QUEUES = ("smartlogix.stock-check.req", "smartlogix.stock-check.reply")


def call(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def snapshot(admin):
    """Contadores de Service Bus: activos, dead-letter y total (acumulado)."""
    snap = {}
    for topic, sub in SUBS:
        p = admin.get_subscription_runtime_properties(topic_name=topic, subscription_name=sub)
        snap[f"sub:{sub}"] = (p.active_message_count, p.dead_letter_message_count, p.total_message_count)
    for q in QUEUES:
        p = admin.get_queue_runtime_properties(queue_name=q)
        snap[f"q:{q}"] = (p.active_message_count, p.dead_letter_message_count, p.total_message_count)
    return snap


def stock(token, product_id):
    _, d = call("GET", f"/api/inventory/stock/product/{product_id}", token)
    return d.get("data")


def recharge_if_low(token, product_id=1, minimo=8, cargar=30):
    """Repone stock para que las rondas no.ProviderTimeout el stock y la demo final no falle."""
    info = stock(token, product_id) or []
    total = sum(s.get("quantity", 0) for s in info)
    if total < minimo:
        call("POST", "/api/inventory/stock/movements", token, {
            "productId": product_id,
            "warehouseId": 1,
            "type": "IN",
            "quantity": cargar,
            "reason": "Reposicion para registro continuo EP2",
            "referenceCode": f"RECARGA-EP2-{datetime.now().strftime('%H%M%S')}",
        })
        print(f"  [stock] repuesto +{cargar} (habia {total}, minimo {minimo})")
    return total


def round_once(admin, idx):
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    status, login = call("POST", "/api/auth/login", body={"email": "admin@smartlogix.cl", "password": "Admin1234"})
    if status != 200:
        print(f"  [ERROR] login HTTP {status}")
        return None
    token = login["data"]["accessToken"]

    recharge_if_low(token)

    # 1) ASINCRONO catalogo: product.created
    sku = f"EP2-REG-{datetime.now().strftime('%H%M%S')}"
    st, prod = call("POST", "/api/inventory/products", token, {
        "sku": sku,
        "name": f"Producto registro EP2 {idx}",
        "description": "Generado por registro_mensajeria.py",
        "unitPrice": 19990,
    })
    prod_id = prod.get("data", {}).get("id")
    print(f"  [1] product.created  -> HTTP {st} productId={prod_id} sku={sku}")

    # 2) pedido
    st, order = call("POST", "/api/orders", token, {
        "customerId": 1,
        "notes": f"registro continuo EP2 ronda {idx}",
        "items": [{"productId": 1, "warehouseId": 1, "sku": "SKU-001",
                   "productName": "Notebook Lenovo", "unitPrice": 650000, "quantity": 1}],
    })
    oid = order.get("data", {}).get("id")
    number = order.get("data", {}).get("orderNumber")
    print(f"  [2] pedido creado    -> HTTP {st} id={oid} {number}")

    # 3) SINCRONO (stock check) + ASINCRONO (order.created)
    t0 = time.time()
    st, conf = call("PATCH", f"/api/orders/{oid}/confirm", token)
    ms = int((time.time() - t0) * 1000)
    estado = conf.get("data", {}).get("status") or conf.get("message")
    print(f"  [3] confirm          -> HTTP {st} en {ms} ms | estado={estado}")

    time.sleep(4)  # dar tiempo al consumo asincrono

    snap = snapshot(admin)
    stk = stock(token, 1) or []
    total_stock = sum(s.get("quantity", 0) for s in stk)

    row = {
        "ts_utc": ts,
        "ronda": idx,
        "order_number": number,
        "order_id": oid,
        "confirm_http": st,
        "confirm_ms": ms,
        "order_estado": estado,
        "product_id": prod_id,
        "product_sku": sku,
        "stock_producto1": total_stock,
    }
    for k, (a, d, t) in snap.items():
        row[f"{k}__activos"] = a
        row[f"{k}__dlq"] = d
        row[f"{k}__total"] = t
    return row


def write_row(row):
    exists = os.path.exists(CSV_PATH) and os.path.getsize(CSV_PATH) > 0
    with open(CSV_PATH, "a", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(row.keys()))
        if not exists:
            w.writeheader()
        w.writerow(row)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--loop", action="store_true", help="repetir cada --interval minutos")
    ap.add_argument("--interval", type=int, default=900, help="segundos entre rondas (900 = 15 min)")
    ap.add_argument("--until", default="", help="hora local (HH:MM) para dejar de repetir")
    args = ap.parse_args()

    admin = ServiceBusAdministrationClient.from_connection_string(CONN)
    idx = 0
    while True:
        idx += 1
        print(f"\n===== RONDA {idx}  {datetime.now().strftime('%H:%M:%S')} local =====")
        try:
            row = round_once(admin, idx)
            if row:
                write_row(row)
                etiquetas = [f"sub:{s}" for _, s in SUBS] + [f"q:{q}" for q in QUEUES]
                print("  [4] contadores SB   -> " + " | ".join(
                    f"{et}={row[f'{et}__activos']}a/{row[f'{et}__dlq']}dlq/{row[f'{et}__total']}tot"
                    for et in etiquetas))
        except Exception as e:  # noqa: BLE001
            print(f"  [ERROR] ronda {idx}: {e}")

        if not args.loop:
            break

        fin = None
        if args.until:
            fin = datetime.strptime(args.until, "%H:%M").replace(year=datetime.now().year,
                                                                 month=datetime.now().month,
                                                                 day=datetime.now().day)
        if fin and datetime.now() >= fin:
            print(f"\nfin de la ventana de registro ({args.until})")
            break
        print(f"  ... esperando {args.interval // 60} min hasta la proxima ronda")
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
