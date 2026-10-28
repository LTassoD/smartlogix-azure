#!/usr/bin/env python3
"""
Productor de eventos `order.created` para la EP3 - SmartLogix.

Fase 0: genera un flujo continuo de pedidos sinteticos pero REALISTAS, con el
mismo contrato que emite order-service (DTO OrderCreatedEvent):

    {
      "orderId": 1284,
      "orderNumber": "ORD-20261028-01284",
      "customerId": 57,
      "totalAmount": 24990.00,
      "items": [
        {"productId": 17, "warehouseId": 1, "sku": "TEC-017",
         "productName": "Teclado Mecanico", "quantity": 2, "unitPrice": 12495.00}
      ],
      "createdAt": "2026-10-28T12:34:56"
    }

La key del mensaje es el orderNumber (orden garantizado por pedido) y lleva el
header `eventType=order.created`, igual que la propiedad JMS de Service Bus.

Uso:
    python kafka/producer_orders.py                  # ~1 pedido cada 0,8 s, infinito
    python kafka/producer_orders.py --count 50       # 50 pedidos y termina
    python kafka/producer_orders.py --rate 20        # ~20 pedidos/s (prueba de carga)
"""
from __future__ import annotations

import argparse
import json
import random
import signal
import sys
import threading
import time
from datetime import datetime
from itertools import count

from confluent_kafka import Producer

TOPIC = "smartlogix.orders.events"

# Catalogo de ejemplo: mismos campos que inventory-service (productId, warehouseId, sku...)
CATALOGO = [
    {"productId": 1,  "warehouseId": 1, "sku": "PER-001", "productName": "Perifericos USB-C",      "unitPrice": 8990.0},
    {"productId": 4,  "warehouseId": 1, "sku": "MON-004", "productName": "Monitor 27''",           "unitPrice": 189990.0},
    {"productId": 7,  "warehouseId": 2, "sku": "TEC-007", "productName": "Teclado Mecanico",       "unitPrice": 44990.0},
    {"productId": 9,  "warehouseId": 1, "sku": "MOU-009", "productName": "Mouse Inalambrico",      "unitPrice": 15990.0},
    {"productId": 12, "warehouseId": 2, "sku": "AUD-012", "productName": "Audifonos Bluetooth",    "unitPrice": 29990.0},
    {"productId": 15, "warehouseId": 1, "sku": "SSD-015", "productName": "SSD NVMe 1TB",           "unitPrice": 79990.0},
    {"productId": 17, "warehouseId": 2, "sku": "HUB-017", "productName": "Hub USB 7 puertos",      "unitPrice": 12495.0},
    {"productId": 21, "warehouseId": 1, "sku": "WEB-021", "productName": "Webcam Full HD",         "unitPrice": 34990.0},
    {"productId": 23, "warehouseId": 3, "sku": "SIL-023", "productName": "Silla Ergonomica",       "unitPrice": 129990.0},
    {"productId": 28, "warehouseId": 1, "sku": "CAR-028", "productName": "Cargador 65W",           "unitPrice": 22990.0},
]

_enviados = 0
_errores = 0
_lock = threading.Lock()


def _on_delivery(err, msg) -> None:
    """Callback de entrega: confirma particion/offset o registra el fallo."""
    global _enviados, _errores
    with _lock:
        if err is not None:
            _errores += 1
            print(f"  [x] ERROR al publicar: {err}", flush=True)
        else:
            _enviados += 1
            if _enviados <= 5 or _enviados % 10 == 0:
                print(
                    f"  [>] {msg.key().decode()} -> p{msg.partition()}@{msg.offset()} "
                    f"({len(msg.value())} bytes)",
                    flush=True,
                )


def construir_pedido(seq: int) -> dict:
    """Arma un pedido con 1-3 lineas, igual que el DTO real."""
    elegidos = random.sample(CATALOGO, k=random.randint(1, 3))
    items = []
    total = 0.0
    for prod in elegidos:
        cantidad = random.randint(1, 3)
        total += prod["unitPrice"] * cantidad
        items.append(
            {
                "productId": prod["productId"],
                "warehouseId": prod["warehouseId"],
                "sku": prod["sku"],
                "productName": prod["productName"],
                "quantity": cantidad,
                "unitPrice": prod["unitPrice"],
            }
        )
    ahora = datetime.now()
    return {
        "orderId": seq,
        "orderNumber": f"ORD-{ahora:%Y%m%d}-{seq:05d}",
        "customerId": random.randint(1, 250),
        "totalAmount": round(total, 2),
        "items": items,
        "createdAt": ahora.strftime("%Y-%m-%dT%H:%M:%S"),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Productor continuo de pedidos hacia Kafka")
    parser.add_argument("--bootstrap", default="localhost:9092")
    parser.add_argument("--topic", default=TOPIC)
    parser.add_argument("--count", type=int, default=0, help="0 = infinito")
    parser.add_argument("--rate", type=float, default=0.0, help="pedidos/segundo (0 = ~1 cada 0,8 s)")
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    productor = Producer(
        {
            "bootstrap.servers": args.bootstrap,
            "client.id": "smartlogix-order-service",
            "acks": "all",                 # espera confirmacion del broker
            "enable.idempotence": True,    # sin duplicados en reintentos
            "linger.ms": 5,                # micro-batching: mas throughput
        }
    )

    detener = False

    def _parar(*_):
        nonlocal detener
        detener = True

    signal.signal(signal.SIGINT, _parar)

    print(f"Productor -> {args.bootstrap} / topic '{args.topic}'")
    print("Ctrl+C para detener.\n")

    inicio = time.time()
    seq = 0
    for seq in count(1):
        if detener or (args.count and seq > args.count):
            break

        pedido = construir_pedido(seq)
        productor.produce(
            topic=args.topic,
            key=pedido["orderNumber"].encode(),
            value=json.dumps(pedido).encode(),
            headers=[
                ("eventType", b"order.created"),
                ("orderNumber", pedido["orderNumber"].encode()),
                ("source", b"smartlogix-order-service"),
            ],
            on_delivery=_on_delivery,
        )
        productor.poll(0)

        if args.rate > 0:
            time.sleep(1.0 / args.rate)
        else:
            time.sleep(random.uniform(0.4, 1.2))

    productor.flush(10)
    transcurrido = max(time.time() - inicio, 0.001)
    print(
        f"\nResumen: {_enviados} publicados, {_errores} errores, "
        f"{transcurrido:.1f} s ({_enviados / transcurrido:.1f} pedidos/s)."
    )
    return 0 if _errores == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
