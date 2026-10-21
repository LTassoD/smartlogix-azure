"""
Consulta Log Analytics (KQL) con salida legible - SmartLogix EP2.
=============================================================
El workspace `log-smartlogix` recibe, via diagnostic setting `sb-to-loganalytics`:
  - AzureMetrics  : TODAS las metricas de Service Bus (Messages, ActiveMessages,
                    DeadletteredMessages, OutgoingMessages, ServerErrors, ...)
  - ServiceBusAuditLogs (RuntimeAuditLogs) : auditoria por operacion (send/receive/complete)
  - OperationalLogs / DiagnosticErrorLogs

Uso:
  python consultar_log_analytics.py "AzureMetrics | take 5"
  python consultar_log_analytics.py "AzureMetrics | ... " -t P6H
"""

import json
import os
import shutil
import subprocess
import sys

WORKSPACE_GUID = "df8e1c49-09fa-4f06-9d18-57c72e3586b3"
RESOURCE_GROUP = "rg-smartlogix-aca"
WORKSPACE_NAME = "log-smartlogix"


def _az_cmd():
    """Localiza el ejecutable de az (puede ser az.cmd en Windows y no estar en el PATH de Python)."""
    cand = shutil.which("az") or shutil.which("az.cmd")
    if cand:
        return cand
    fijo = r"C:\Program Files (x86)\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
    if os.path.exists(fijo):
        return fijo
    return "az"


CONSULTAS = {
    "mensajes": """
AzureMetrics
| where TimeGenerated > ago(24h)
| where MetricName in ("Messages", "IncomingMessages", "OutgoingMessages", "ActiveMessages", "DeadletteredMessages")
| summarize valor=sum(Total) by bin(TimeGenerated, 5m), MetricName
| order by TimeGenerated asc
""",
    "deadletter": """
AzureMetrics
| where TimeGenerated > ago(24h)
| where MetricName == "DeadletteredMessages"
| summarize total=sum(Total) by bin(TimeGenerated, 5m)
| where total > 0
| order by TimeGenerated asc
""",
    "conexiones": """
AzureMetrics
| where TimeGenerated > ago(24h)
| where MetricName in ("ActiveConnections", "ServerErrors", "UserErrors", "SuccessfulRequests", "FailedRequests")
| summarize valor=sum(Total) by bin(TimeGenerated, 5m), MetricName
| order by TimeGenerated asc
""",
    "auditoria": """
ServiceBusAuditLogs
| where TimeGenerated > ago(24h)
| project TimeGenerated, Operation, Caller, EntityPath, MessageId, DeliveryCount
| order by TimeGenerated asc
""",
    "operational": """
OperationalLogs
| where TimeGenerated > ago(24h)
| project TimeGenerated, EventLevel, EventName, Message
| order by TimeGenerated asc
""",
    "tablas": """
search *
| summarize c=count() by TableName
| order by c desc
""",
}


def query(kql, timespan="P1D"):
    # az.cmd (wrapper batch de Windows) rompe los argumentos con saltos de linea,
    # por eso el KQL se colapsa a una sola linea y las comillas dobles -> simples.
    kql = " ".join(kql.replace('"', "'").split())
    cmd = [
        _az_cmd(), "monitor", "log-analytics", "query",
        "-w", WORKSPACE_GUID,
        "--analytics-query", kql, "-t", timespan, "-o", "json",
    ]
    out = subprocess.run(cmd, capture_output=True, text=True)
    if out.returncode != 0:
        print("ERROR en la consulta:\n", out.stderr[:800], file=sys.stderr)
        return [], []
    data = json.loads(out.stdout or "{}")
    if isinstance(data, list) and data and isinstance(data[0], dict):
        # formato real: lista plana de objetos (una fila por registro)
        cols = list(data[0].keys())
        rows = [[r.get(c) for c in cols] for r in data]
        return cols, rows
    if isinstance(data, list):
        tables = data[0].get("tables", []) if data else []
        value = tables[0] if tables else {}
    else:
        value = (data.get("value") or [{}])[0]
    cols = [c.get("name") for c in value.get("columns", [])]
    rows = value.get("rows", [])
    return cols, rows


def print_tabla(cols, rows, max_rows=200):
    if not rows:
        print("  (sin datos)")
        return
    cols = cols or []
    anchos = []
    for i, c in enumerate(cols):
        ancho = max(len(str(c)), *(len(str(r[i])) for r in rows[:max_rows])) if rows else len(str(c))
        anchos.append(min(ancho, 46))
    print("  " + " | ".join(str(c)[:a].ljust(a) for c, a in zip(cols, anchos)))
    print("  " + "-+-".join("-" * a for a in anchos))
    for r in rows[:max_rows]:
        print("  " + " | ".join(str(v)[:a].ljust(a) for v, a in zip(r, anchos)))


def main():
    args = sys.argv[1:]
    if args and args[0] in CONSULTAS:
        kql = CONSULTAS[args[0]]
        label = args[0]
        args = args[1:]
    elif args:
        kql = args[0]
        label = "consulta"
        args = args[1:]
    else:
        print("consultas disponibles:", ", ".join(CONSULTAS))
        return

    timespan = "P1D"
    if args and args[0] == "-t" and len(args) > 1:
        timespan = args[1]

    cols, rows = query(kql, timespan)
    print(f"\n=== {label}  (timespan {timespan}, {len(rows)} filas) ===")
    print_tabla(cols, rows)


if __name__ == "__main__":
    main()
