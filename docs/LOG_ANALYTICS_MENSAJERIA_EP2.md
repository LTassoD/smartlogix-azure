# Log Analytics para la mensajería (EP2) — guía práctica

## 1. El problema: por qué no llegaba nada

Azure Service Bus **no envía sus métricas a Log Analytics automáticamente**. El workspace
`log-smartlogix` existía, pero estaba **vacío**: faltaba el *diagnostic setting* que enruta la
telemetría del namespace hacia el workspace.

Sin ese enlace, la única forma de "revisar la mensajería" era abrir el portal a mano y mirar
contadores sueltos.

## 2. Lo que quedó configurado

**Diagnostic setting `sb-to-loganalytics`** en el namespace `sb-smartlogix-ns`:

```bash
NS="/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns"
WS="/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.OperationalInsights/workspaces/log-smartlogix"

az monitor diagnostic-settings create \
  --name "sb-to-loganalytics" --resource "$NS" --workspace "$WS" \
  --metrics "[{category:AllMetrics,enabled:true}]" \
  --logs "[{category:OperationalLogs,enabled:true},{category:RuntimeAuditLogs,enabled:true},{category:DiagnosticErrorLogs,enabled:true}]"
```

| Categoría | Qué aporta | Tabla en Log Analytics |
|---|---|---|
| `AllMetrics` | todas las métricas del namespace (grano 1 min) | `AzureMetrics` |
| `OperationalLogs` | eventos operativos del broker | `OperationalLogs` |
| `RuntimeAuditLogs` | auditoría por operación (send/receive/complete) | `ServiceBusAuditLogs` |
| `DiagnosticErrorLogs` | errores de diagnóstico | `DiagnosticErrorLogs` |

**Verificar que quedó:**
```bash
az monitor diagnostic-settings list --resource "$NS" --query "[].{name:name,workspace:workspaceId}" -o table
```

> ⚠️ **Las subscriptions NO admiten diagnostic settings**
> (`ResourceTypeNotSupported`). El granularidad de entidad no se puede enrutar a Log Analytics;
> solo funciona a nivel de namespace.

---

## 3. Cómo consultarlo

### 3.1 Desde el portal
1. **Log Analytics** → `log-smartlogix` → **Logs**
2. Consulta KQL (ver §4) → **Run**
3. O: **Azure Monitor → Metrics** sobre el namespace, con la dimensión `EntityName` para ver el
   detalle por cola/suscripción.

### 3.2 Desde la CLI (helper del repo)
```bash
python docs/consultar_log_analytics.py mensajes      # serie temporal de mensajes
python docs/consultar_log_analytics.py conexiones     # conexiones activas / errores
python docs/consultar_log_analytics.py deadletter     # mensajes muertos
python docs/consultar_log_analytics.py tablas         # que tablas existen y cuantas filas
python docs/consultar_log_analytics.py "<KQL libre>" -t P6H
```

> **Trampa técnica (ya resuelta en el helper):** `az.cmd` es un *batch wrapper* de Windows que
> **rompe los argumentos con saltos de línea** y las comillas dobles. El helper colapsa el KQL a
> una sola línea y convierte `"` en `'`. Si consultas con `az` a mano, **escribe el KQL en una
> sola línea**.

### 3.3 KQL directo (una sola línea)
```bash
GUID=$(az monitor log-analytics workspace show -g rg-smartlogix-aca -n log-smartlogix --query customerId -o tsv)

az monitor log-analytics query -w $GUID --analytics-query \
  "AzureMetrics | where MetricName == 'DeadletteredMessages' | summarize total=sum(Total) by bin(TimeGenerated, 5m) | where total > 0" -t P1D -o tsv
```

---

## 4. Consultas útiles (KQL)

**Serie temporal de mensajes y dead-letter**
```kql
AzureMetrics
| where TimeGenerated > ago(24h)
| where MetricName in ('Messages', 'ActiveMessages', 'DeadletteredMessages', 'OutgoingMessages')
| summarize valor=sum(Total) by bin(TimeGenerated, 5m), MetricName
| order by TimeGenerated asc
```

**Conexiones activas y conexiones abiertas** (sirve para ver *cuándo* hubo tráfico)
```kql
AzureMetrics
| where TimeGenerated > ago(24h)
| where MetricName in ('ActiveConnections', 'ConnectionsOpened', 'ServerErrors')
| summarize v=sum(Total) by bin(TimeGenerated, 5m), MetricName
| where v > 0
| order by TimeGenerated asc
```

**Auditoría de operaciones del broker** (si `RuntimeAuditLogs` está activo)
```kql
ServiceBusAuditLogs
| where TimeGenerated > ago(24h)
| project TimeGenerated, Operation, Caller, EntityPath, MessageId, DeliveryCount
| order by TimeGenerated asc
```

---

## 5. Qué se ve realmente (y qué no) — honestidad técnica

| Métrica | ¿Funciona en Log Analytics? | Nota |
|---|---|---|
| `ActiveConnections` | ✅ sí | 32 → 41 → 24 (varía con los contenedores) |
| `ConnectionsOpened` | ✅ sí | marca los picos de tráfico |
| `ActiveMessages` | ✅ sí, valor 0 | **es un medidor**: 0 = todo consumido al instante |
| `DeadletteredMessages` | ⚠️ llega **siempre en 0** | La tabla `AzureMetrics` **sí** contiene la métrica (42 puntos/día) pero **todos valen 0**. El valor real (1 con un mensaje en DLQ) se ve con `az monitor metrics list` o en el portal. No la uses como evidencia en la defensa. |
| `Messages` | ✅ sí, valor 0 | idem, medidor del estado actual |
| `IncomingMessages` / `OutgoingMessages` | ⚠️ devuelven **0** | **Limitación conocida de Azure Monitor**: los contadores acumulados de mensajes no se reportan correctamente a nivel de namespace en Service Bus |
| `OperationalLogs` / `ServiceBusAuditLogs` | ⚠️ tablas vacías | `RuntimeAuditLogs` requiere habilitar la *auditoría* en el namespace por encima del diagnostic setting |

### Métricas que **sí** sirven (medidas sobre 24 h)
`ActiveConnections` · `ConnectionsOpened` · `ConnectionsClosed` · `ActiveMessages` · `Size` ·
`ScheduledMessages` · `Messages` · `OutgoingBytes` · `OutgoingMessages` · `ServerSendLatency` ·
`CompleteMessage` · `IncomingBytes` · `IncomingMessages` · `DeadletteredMessages` (siempre 0)

### Conclusión práctica
> **Log Analytics NO es la mejor fuente para ver el detalle de los mensajes** de Service Bus.
> Para eso están el **Explorador del portal** (peek sin consumir) y la **vista de Logs de los
> contenedores**. Log Analytics sirve para la **telemetría agregada** (conexiones, tamaño,
> dead-letter, backlog) y para **correlacionar en el tiempo**.

---

## 6. Cómo ver los mensajes reales (esto es lo que se muestra en la defensa)

### Portal → Explorador de Service Bus
1. Namespace `sb-smartlogix-ns` → **Explorador**
2. Pestaña **Colas** o **Temas → Suscripciones** → **"Inspeccionar desde el inicio"**
3. Ves el **peek** del mensaje (cuerpo + properties) **sin consumirlo**
4. Copiar mensaje / ver detalles → `eventType`, `stockCheckId`, etc.

### Métricas por entidad en Azure Monitor
```bash
NS="/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns"
az monitor metrics list --resource "$NS" --metric "Messages" \
  --filter "EntityName eq 'inventory-sub'" --interval PT1M \
  --start-time 2026-10-21T19:20:00Z --end-time 2026-10-21T19:40:00Z
```

### El registro propio (CSV)
`docs/registro_mensajeria.py` deja en `registro_mensajeria.csv` una fila por ronda con:
timestamp, número de pedido, HTTP del confirm, **latencia del confirm (ms)**, estado,
stock resultante y los contadores (activos / dead-letter / total) de las 4 subscriptions y
las 2 colas. Es la evidencia tabular que respalda la demo.
