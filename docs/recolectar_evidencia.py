"""
RECOLECTA DE EVIDENCIA de la mensajería (EP2) - SmartLogix
==========================================================
Genera un archivo de texto con toda la evidencia demostrable:

  1. Evidencia de CONSUMO: los logs de los contenedores (inventory / order / shipping),
     filtrados a las líneas de mensajería ([AUDIT], eventos, DLQ, WARN/ERROR).
  2. Evidencia de PRODUCCIÓN: el CSV del registro continuo (rondas, pedidos, latencias).
  3. Evidencia del BROKER: snapshot de contadores de Service Bus (4 subs + 2 colas).
  4. Evidencia de OBSERVABILIDAD: métricas de Service Bus en Log Analytics.

Uso:
  python docs/recolectar_evidencia.py            # -> evidencia/evidencia_YYYYMMDD_HHMMSS.txt
"""

import csv
import json
import os
import subprocess
import sys
from datetime import datetime

AZ = r"C:\Program Files (x86)\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
RG = "rg-smartlogix-aca"
VM = "p44"
NS = "sb-smartlogix-ns"
SUB = "1e4ad9ac-651b-4331-9762-d64f69adb469"
WORKSPACE = "log-smartlogix"
# `az monitor log-analytics query -w` exige el GUID (customerId), no el nombre:
# con el nombre devuelve [] silenciosamente.
WORKSPACE_GUID = "df8e1c49-09fa-4f06-9d18-57c72e3586b3"
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA_DIR = os.path.join(RAIZ, "evidencia")
CSV_REGISTRO = os.path.join(RAIZ, "registro_mensajeria.csv")

SCRIPT_VM = (
    "sudo -u azureuser -H sh -c 'cd /opt/smartlogix && for s in inventory order shipping; do "
    'echo "##### $s #####"; '
    "docker compose logs --since 8h --timestamps $s 2>&1 "
    '| grep -Ei "AUDIT|STOCK|eventType|publish|order\\.|product\\.|dead|DLQ|WARN|ERROR" '
    '| grep -vE "JmsSession|DefaultMessageListenerContainer" | tail -60; echo; done\''
)


def _az(*args, capture_json=False):
    cmd = [AZ] + list(args)
    out = subprocess.run(cmd, capture_output=True, text=True)
    if capture_json:
        try:
            return json.loads(out.stdout or "null")
        except json.JSONDecodeError:
            return None
    return out.stdout


def _token():
    out = subprocess.run(
        [AZ, "account", "get-access-token", "--resource", "https://management.azure.com/",
         "--query", "accessToken", "-o", "tsv"],
        capture_output=True, text=True)
    return out.stdout.strip()


def logs_de_contenedores():
    """Ejecuta el script en la VM vía API REST (runCommand es asíncrono: 202 + polling).

    Se usa la API REST y no `az vm run-command invoke` porque az.cmd es un batch de Windows
    y cmd.exe se come los `|` del script (metacaracteres del shell).
    """
    import time
    import urllib.request

    url = (f"https://management.azure.com/subscriptions/{SUB}/resourceGroups/{RG}"
           f"/providers/Microsoft.Compute/virtualMachines/{VM}"
           f"/runCommand?api-version=2023-09-01")
    body = json.dumps({"commandId": "RunShellScript", "script": [SCRIPT_VM]}).encode()
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Authorization": f"Bearer {_token()}", "Content-Type": "application/json"})

    try:
        resp = urllib.request.urlopen(req, timeout=120)
    except Exception as e:  # noqa: BLE001
        return f"(error al lanzar run-command: {e})"

    op = resp.headers.get("Azure-AsyncOperation") or resp.headers.get("Location")
    if not op:
        return "(no se obtuvo la URL de operacion)"
    for _ in range(40):
        time.sleep(5)
        poll = urllib.request.Request(op, headers={"Authorization": f"Bearer {_token()}"})
        try:
            data = json.load(urllib.request.urlopen(poll, timeout=120))
        except Exception:  # noqa: BLE001
            continue
        if data.get("status") in ("Succeeded", "Failed", "Canceled"):
            # runCommand devuelve: properties.output.value[0].message
            salida = ((data.get("properties") or {}).get("output") or {}).get("value") or []
            val = salida[0] if salida else {}
            msg = val.get("message", "")
            i, j = msg.find("[stdout]"), msg.find("[stderr]")
            return (msg[i + 8:j] if i >= 0 and j > i else msg).strip()
    return "(timeout esperando la operacion)"


def contadores_sb():
    from azure.servicebus.management import ServiceBusAdministrationClient
    conn = os.environ["SB_CONN"]
    a = ServiceBusAdministrationClient.from_connection_string(conn)
    lineas = []
    for t, s in (("smartlogix.orders.topic", "inventory-sub"),
                 ("smartlogix.orders.topic", "shipping-created-sub"),
                 ("smartlogix.orders.topic", "shipping-cancelled-sub"),
                 ("smartlogix.catalog.topic", "catalog-audit-sub")):
        p = a.get_subscription_runtime_properties(topic_name=t, subscription_name=s)
        lineas.append(f"  sub {s:24} activos={p.active_message_count:>3} "
                      f"dead-letter={p.dead_letter_message_count:>3} total={p.total_message_count:>5}")
    for q in ("smartlogix.stock-check.req", "smartlogix.stock-check.reply"):
        p = a.get_queue_runtime_properties(queue_name=q)
        lineas.append(f"  cola {q:24} activos={p.active_message_count:>3} "
                      f"dead-letter={p.dead_letter_message_count:>3} total={p.total_message_count:>5}")
    return "\n".join(lineas)


def metricas_la():
    q = ("AzureMetrics | where TimeGenerated > ago(3h) "
         "| where MetricName in ('ActiveConnections','ConnectionsOpened','DeadletteredMessages') "
         "| summarize v=sum(Total) by bin(TimeGenerated,5m), MetricName | where v > 0 "
         "| order by TimeGenerated asc")
    cmd = [AZ, "monitor", "log-analytics", "query", "-w", WORKSPACE_GUID,
           "--analytics-query", q, "-t", "PT3H", "-o", "json"]
    out = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(out.stdout or "[]")
    except json.JSONDecodeError:
        return "(sin datos)"
    if not data:
        return "(sin datos en las ultimas 3h)"
    lineas = []
    for r in data[:40]:
        lineas.append(f"  {r.get('TimeGenerated')}  {r.get('MetricName'):22} = {r.get('v')}")
    return "\n".join(lineas)


def registro_csv():
    if not os.path.exists(CSV_REGISTRO):
        return "(no existe registro_mensajeria.csv)"
    with open(CSV_REGISTRO, encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    out = []
    for r in rows:
        out.append(f"  {r['ts_utc']} | ronda {r['ronda']:>2} | {r['order_number']} | "
                   f"HTTP {r['confirm_http']} en {r['confirm_ms']} ms | {r['order_estado']:<10} | "
                   f"producto {r['product_id']} ({r['product_sku']}) | stock P1={r['stock_producto1']}")
    return f"  ({len(rows)} rondas)\n" + "\n".join(out)


def main():
    os.makedirs(SALIDA_DIR, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    destino = os.path.join(SALIDA_DIR, f"evidencia_{ts}.txt")

    secciones = []
    secciones.append("=" * 100)
    secciones.append(f"EVIDENCIA DE MENSAJERIA - SmartLogix EP2  |  generado {datetime.now():%Y-%m-%d %H:%M:%S %Z}")
    secciones.append("=" * 100)

    secciones.append("\n" + "=" * 100)
    secciones.append("1) REGISTRO CONTINUO DE RONDAS (flujo real: sync stock-check + async order.created/product.created)")
    secciones.append("=" * 100)
    secciones.append(registro_csv())

    secciones.append("\n" + "=" * 100)
    secciones.append("2) CONTADORES DE AZURE SERVICE BUS (broker)")
    secciones.append("=" * 100)
    try:
        secciones.append(contadores_sb())
    except Exception as e:  # noqa: BLE001
        secciones.append(f"(error: {e})")

    secciones.append("\n" + "=" * 100)
    secciones.append("3) LOGS DE LOS CONSUMIDORES (evidencia del lado del consumer)")
    secciones.append("=" * 100)
    secciones.append(logs_de_contenedores())

    secciones.append("\n" + "=" * 100)
    secciones.append("4) OBSERVABILIDAD: metricas de Service Bus en Log Analytics")
    secciones.append("=" * 100)
    secciones.append(metricas_la())

    with open(destino, "w", encoding="utf-8") as fh:
        fh.write("\n".join(secciones) + "\n")
    print(f"evidencia guardada en: {destino}")
    return destino


if __name__ == "__main__":
    main()
