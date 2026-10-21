# Links de Azure para monitorear la mensajería (SmartLogix EP2)

Suscripción: `1e4ad9ac-651b-4331-9762-d64f69adb469` (Azure for Students)
Resource group: `rg-smartlogix-aca`
Namespace de Service Bus: `sb-smartlogix-ns`
Workspace de Log Analytics: `log-smartlogix` (GUID `df8e1c49-09fa-4f06-9d18-57c72e3586b3`)

> Todos los links usan el formato `https://portal.azure.com/#resource/<resourceId>`: el portal
> resuelve el tenant con la sesión ya iniciada. Si un link cae en la vista general del recurso,
> el botón que buscas está dentro de la hoja.

---

## 1. Service Bus — colas y topics (dónde viven los mensajes)

| Qué | Link |
|---|---|
| **Namespace (métricas y estado)** | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns/overview |
| **Service Bus Explorer** (peek sin consumir) | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns/explorer |
| **Colas (listado)** | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns/queues |
| **Cola `smartlogix.stock-check.req`** (request sync) | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns/queues/smartlogix.stock-check.req |
| **Cola `smartlogix.stock-check.reply`** (reply sync) | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns/queues/smartlogix.stock-check.reply |
| **Topic `smartlogix.orders.topic`** | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns/topics/smartlogix.orders.topic |
| **Sus sus 3 suscripciones** | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns/topics/smartlogix.orders.topic/subscriptions |
| `inventory-sub` | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns/topics/smartlogix.orders.topic/subscriptions/inventory-sub |
| `shipping-created-sub` | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns/topics/smartlogix.orders.topic/subscriptions/shipping-created-sub |
| `shipping-cancelled-sub` | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns/topics/smartlogix.orders.topic/subscriptions/shipping-cancelled-sub |
| **Topic `smartlogix.catalog.topic`** | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns/topics/smartlogix.catalog.topic |
| `catalog-audit-sub` | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns/topics/smartlogix.catalog.topic/subscriptions/catalog-audit-sub |
| **Métricas del namespace** (Deadlettered, Active, etc.) | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns/metrics |
| **Reglas de autorización** (`SB_CONN` de `smartlogix-admin`) | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns/authorizationRules |
| **Diagnostic settings** (`sb-to-loganalytics`) | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns/diagnosticSettings |
| **Activity log del namespace** | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns/activitylog |

### Qué se ve en cada hoja
- **Overview / Métricas del namespace** → `ActiveMessages`, `DeadletteredMessages`, `ConnectionsOpened`,
  `ServerErrors`. Es donde se ve que la alerta de DLQ se dispara.
- **Cola/Topic → Suscripción** → pestañas de **Active messages / Dead-letter messages / Scheduled messages**
  (los contadores reales de la entidad).
- **Explorer** → modo **Inspeccionar (peek)**: muestra el mensaje **sin consumirlo**. Es la forma
  honesta de mostrar el contenido real de un mensaje.

---

## 2. Alertas

| Qué | Link |
|---|---|
| **Alertas del resource group** (las 3 reglas + estado) | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/microsoft.insights/alerts |
| `alert-sb-deadletter` (DLQ > 0, sev1) | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.Insights/metricalerts/alert-sb-deadletter |
| `alert-sb-servererrors` (sev2) | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.Insights/metricalerts/alert-sb-servererrors |
| `alert-sb-backlog` (Active > 50, sev2) | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.Insights/metricalerts/alert-sb-backlog |
| **Action group** `ag-smartlogix-alerts` (correo) | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.Insights/actionGroups/ag-smartlogix-alerts |

> El **estado** “En alerta / Resuelta” de una regla clásica de Azure Monitor **solo se ve en el portal**
> (hoja *Alertas*), no por CLI: `az monitor metrics alert list` no devuelve el estado.

---

## 3. Log Analytics (logs y telemetría del namespace)

| Qué | Link |
|---|---|
| **Workspace `log-smartlogix`** | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.OperationalInsights/workspaces/log-smartlogix/overview |
| **Hoja Logs** (aquí se ejecutan las queries KQL) | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.OperationalInsights/workspaces/log-smartlogix/logs |
| **Tablas** (`AzureMetrics`, `OperationalLogs`, …) | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.OperationalInsights/workspaces/log-smartlogix/tables |

### Queries KQL listas (copiar/pegar en la hoja Logs)
```kql
// 1) Conexiones activas y aperturas (esto sí tiene datos)
AzureMetrics
| where MetricName in ('ActiveConnections','ConnectionsOpened','ConnectionsClosed')
| summarize v=sum(Total) by bin(TimeGenerated,5m), MetricName
| order by TimeGenerated asc

// 2) Todas las métricas disponibles (descubre los MetricName reales)
AzureMetrics | summarize c=count() by MetricName | order by c desc

// 3) Backlog y tamaño
AzureMetrics
| where MetricName in ('ActiveMessages','Size','Messages')
| summarize v=sum(Total) by bin(TimeGenerated,5m), MetricName
| order by TimeGenerated asc

// 4) Logs operativos del namespace (tabla OperationalLogs)
OperationalLogs
| where TimeGenerated > ago(1h)
| project TimeGenerated, Operation, EntityPath, Caller
| order by TimeGenerated desc

// 5) Errores de diagnóstico
DiagnosticErrorLogs
| where TimeGenerated > ago(1h)
| project TimeGenerated, Message
| order by TimeGenerated desc
```

### Desde la terminal (más rápido que la UI)
```bash
python docs/consultar_log_analytics.py conexiones     # consultas predefinidas
python docs/consultar_log_analytics.py mensajes
python docs/consultar_log_analytics.py deadletter
python docs/consultar_log_analytics.py auditoria
python docs/consultar_log_analytics.py operational
python docs/consultar_log_analytics.py tablas
```

> ⚠️ **Límites reales de la telemetría de Service Bus** (verificado): las métricas de mensajes
> acumulados (`IncomingMessages`, `OutgoingMessages`) y **`DeadletteredMessages` llegan siempre en 0**
> a `AzureMetrics`. El valor real de la DLQ se ve en el **portal** (métricas del namespace) o con
> `az monitor metrics list`. Las tablas `OperationalLogs` y `ServiceBusAuditLogs` llegan vacías
> (auditoría de runtime no habilitada en el namespace).

---

## 4. Logs de los consumidores (los contenedores de la VM)

**No están en el portal**: la VM `p44` no tiene agente de Log Analytics ni diagnostic settings
(los logs de Docker no se envían solos). Se leen por `run-command`:

| Qué | Link |
|---|---|
| **VM `p44`** (overview) | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.Compute/virtualMachines/p44 |
| **VM → Logs** (stdout del SO, **no** de los contenedores) | https://portal.azure.com/#resource/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.Compute/virtualMachines/p44/logs |

### Comando rápido para los logs de los consumidores
```bash
az vm run-command invoke -g rg-smartlogix-aca -n p44 --command-id RunShellScript \
  --scripts "sudo -u azureuser -H sh -c 'cd /opt/smartlogix && docker compose logs --since 10m --timestamps inventory order shipping 2>&1 | tail -60'"
```

### O automatizado (ya instalado)
```bash
python docs/recolectar_evidencia.py   # 4 secciones: rondas, contadores, logs, métricas LA
```
Guarda el resultado en `evidencia/evidencia_<fecha>.txt` y hay una **tarea programada a las 18:40**
(`schtasks /Query /TN "SmartLogix-EP2-Evidencia"`) que la ejecuta sola.

### Lo que verás en esos logs (trazabilidad de la demo)
```
[INFO] StockCheckRequestConsumer : StockCheckRequest received orderNumber=ORD-...      <- SINCRONO (request)
[INFO] StockCheckRequestConsumer : StockCheckResponse sent orderNumber=ORD-... available=true
[INFO] OrderCreatedConsumer      : OrderCreatedEvent received in inventory orderId=13    <- ASINCRONO (order.created)
[INFO] ProductCreatedConsumer     : [AUDIT] product.created received productId=12        <- ASINCRONO (product.created)
[WARN] OrderCreatedConsumer      : ... payload is not valid JSON                          <- mensaje invalido
[WARN] DeadLetterConsumer         : [DLQ] Dead letter received subscription=inventory-sub source=... reason=...
[WARN] o.s.j.l.DefaultMessageListenerContainer : Setup of JMS message listener invoker failed ... trying to recover
        ^ benigno: reconexion de Qpid JMS. Para filtrar: grep -vE "JmsSession|DefaultMessageListenerContainer"
```

---

## 5. Atajos de consola (lo más rápido para la defensa)

```bash
# Estado en vivo de subs y colas + peek del contenido
export SB_CONN="$(az servicebus namespace authorization-rule keys list \
  -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns -n smartlogix-admin \
  --query primaryConnectionString -o tsv)"
python inspeccionar_eventos.py

# Métricas clave del namespace
az monitor metrics list --resource \
  "/subscriptions/1e4ad9ac-651b-4331-9762-d64f69adb469/resourceGroups/rg-smartlogix-aca/providers/Microsoft.ServiceBus/namespaces/sb-smartlogix-ns" \
  --metric "DeadletteredMessages" --interval PT1M --output tsv
```
