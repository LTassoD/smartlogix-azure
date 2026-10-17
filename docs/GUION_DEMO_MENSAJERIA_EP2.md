# Guion de demo en vivo — Mensajería EP2 (SmartLogix / Azure Service Bus)

Objetivo: mostrar en vivo, y con evidencia en Azure, los siete puntos que pedirá el profe:
**síncrona, asíncrona, ACK, publish/subscribe, DLX/DLQ, políticas de retención y alertas**.

> Teoría y respuestas de examen: `docs/MENSAJERIA_EXPERTO_EP2_SmartLogix.md`.
> Este documento es el **libreto operativo** (qué hacer, qué mostrar, qué decir).

Duración objetivo: ~10–12 min. Cada bloque tiene **Acción**, **Mostrar (Azure)** y **Decir**.

---

## 0. Pre-flight (antes de que entre el profe)

```bash
# 1) Encender VM y levantar el stack
az vm start -g rg-smartlogix-aca -n p44
az vm run-command invoke -g rg-smartlogix-aca -n p44 --command-id RunShellScript \
  --scripts "sudo -u azureuser -H sh -c 'cd /opt/smartlogix && docker compose up -d'"
# (opcional) esperar ~30s y verificar
curl -s -o /dev/null -w "%{http_code}\n" http://20.121.31.149/    # -> 200
```

```bash
# 2) Cadena de conexión para los scripts de demo (se usa como SB_CONN)
export SB_CONN="$(az servicebus namespace authorization-rule keys list \
  -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns -n smartlogix-app \
  --query primaryConnectionString -o tsv)"
```

Deja abiertas estas pestañas del portal (todas con `auto-refresh` donde se pueda):
1. Namespace → **Información general** (métricas Incoming/Outgoing/Active)
2. **Temas → `smartlogix.orders.topic`** → Suscripciones (las 3)
3. **Temas → `smartlogix.orders.topic`** → `inventory-sub` → Explorador de Service Bus
4. **Colas** → `smartlogix.stock-check.req` y `.reply`
5. **Alertas → Reglas de alerta** (las 3)
6. Carpeta `.../Evaluación 2/demo` con los scripts a mano.

Comando “estado en vivo” (lo usarás varias veces):
```bash
python inspeccionar_eventos.py
# imprime activos/DLQ de las 3 suscripciones + las 2 colas, y hace peek del contenido
```

---

## 1. Mapa del flujo (30 s)

**Decir:** *“Todo el flujo de pedidos pasa por Azure Service Bus, en AMQP 1.0. Tengo **dos patrones**: un
**request/reply síncrono** sobre dos colas para validar stock, y **eventos pub/sub** sobre un topic para
inventario y despacho. Sobre eso puedo mostrar **ACK, DLQ, retención y alertas**.”*

```
order-service ──(sync: .req/.reply)──▶ inventory-service
order-service ──(async: order.created)──▶ topic smartlogix.orders.topic
                                          ├─ inventory-sub
                                          ├─ shipping-created-sub
                                          └─ shipping-cancelled-sub
```

---

## 2. Mensajería SÍNCRONA (request/reply) — ~2 min

### Acción
```bash
python demo_mensajeria.py
```
Esto hace login, consulta stock, **crea y confirma** un pedido, y mide el tiempo del `confirm`.

### Mostrar (Azure)
- **Colas → `smartlogix.stock-check.req` y `.reply`**: en las métricas se ve el **Incoming/Outgoing** subir
  justo al confirmar. (El mensaje vive milisegundos: para “congelarlo”, pausa inventory y confirma.)
- **Código** (pantalla secundaria):
  - `order-service/.../StockCheckClient.java` → envía a `.req` y **espera** en `.reply` (timeout 10 s).
  - `inventory-service/.../StockCheckRequestConsumer.java` → lee `.req` y responde copiando `stockCheckId`.

### Decir
*“Al confirmar necesito una **respuesta**: ¿hay stock? Envío a `.req` y bloqueo esperando `.reply`. Es
síncrono porque el resultado condiciona la decisión; si no hay stock, lanzo excepción y **no** confirmo.”*

**Pregunta probable — ¿por qué no REST?** *“No hay HTTP entre microservicios; el RPC va por el broker, así
heredo reintento, durabilidad y desacople del HTTP.”*

---

## 3. Mensajería ASÍNCRONA (pub/sub) — ~3 min

### Acción
```bash
# Un solo evento -> varios consumidores. Para VERLO retenido, usa la suscripción "observadora".
# (a) crear observador sin consumidor (retiene el mensaje):
az servicebus topic subscription create -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns \
  --topic-name smartlogix.orders.topic -n demo-observer-sub --default-message-time-to-live PT1H
az servicebus topic subscription rule create -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns \
  --topic-name smartlogix.orders.topic --subscription-name demo-observer-sub \
  --name f --filter-sql-expression "eventType = 'order.created'"
az servicebus topic subscription rule delete -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns \
  --topic-name smartlogix.orders.topic --subscription-name demo-observer-sub --name \$Default

# (b) publicar (confirmar un pedido o inyectar):
python demo_mensajeria.py
# o bien:
python inyectar_eventos_demo.py 2 0
```

### Mostrar (Azure)
- **`demo-observer-sub` → Explorador de Service Bus → Inspeccionar desde el inicio** → 1 mensaje con el
  JSON del `OrderCreatedEvent` (¡el mismo evento que ya consumieron los demás!).
- **`inventory-sub` y `shipping-created-sub`** quedan en 0 → *“ya lo procesaron”*.
- Efecto de negocio: **stock baja** y aparece **despacho** → *“un evento, dos reacciones”*.

### Decir
*“Es pub/sub: publico **una** vez y el topic entrega **una copia a cada suscripción**. Inventario y despacho
reaccionan en paralelo y sin acoplarse al publicador. El `PATCH /confirm` volvió **200 al instante**: los
efectos ocurren después, por detrás.”*

### Limpieza
```bash
az servicebus topic subscription delete -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns \
  --topic-name smartlogix.orders.topic -n demo-observer-sub
```

---

## 4. ACK y semántica de entrega — ~2 min

### Acción (mensaje que falla 3 veces → reentrega → DLQ)
Crea un mensaje “venenoso”: JSON inválido con `eventType='order.created'` a `inventory-sub`.
```bash
python - <<'PY'
import os, json
from azure.servicebus import ServiceBusClient, ServiceBusMessage
c = ServiceBusClient.from_connection_string(os.environ["SB_CONN"])
with c.get_topic_sender(topic_name="smartlogix.orders.topic") as s:
    s.send_messages(ServiceBusMessage("{ esto no es json valido }",
        application_properties={"eventType": "order.created"}))
print("veneno enviado")
PY
```
Espera ~1 min (reintentos por PeekLock) y vuelve a correr `python inspeccionar_eventos.py`.

### Mostrar (Azure)
- `inventory-sub`: sube **activos → 1… 2…**, y al 3er intento (**maxDeliveryCount=3**) pasa a **DLQ = 1**.
- **Explorador de Service Bus → pestaña “Dead letter”** → ver **DeadLetterReason** y
  **DeadLetterErrorDescription** (el `payload is not valid JSON`).
- **Código:** `inventory .../OrderCreatedConsumer.java` → el `catch` **relanza** (`throw RuntimeException`)
  ⇒ **no ACKea** ⇒ reentrega. Config: `sessionTransacted=false`, `acknowledge-mode=auto`.

### Decir
*“No acuso al recibir, acuso al **terminar bien** (PeekLock). Mi listener tiró excepción, así que no hubo
ACK; Service Bus lo reintentó y al **tercer** intento lo movió a la **DLQ**. Eso da entrega **at-least-once**
y lo combino con **idempotencia** para no duplicar efectos.”*

**Pregunta probable — ¿exactly once?** *“No; at-least-once + idempotencia en el consumidor.”*

### Limpieza
```bash
python purgar_dlq.py       # o: az servicebus ... (purgar la DLQ de inventory-sub)
```

---

## 5. Publish/Subscribe — filtros (se explica dentro del bloque 3) — ~30 s

### Mostrar (Azure)
- **`smartlogix.orders.topic` → Suscripciones**: `inventory-sub` y `shipping-created-sub` con filtro
  `eventType='order.created'`; `shipping-cancelled-sub` con `eventType='order.cancelled'`.

### Decir
*“El topic no rutea por routing key como RabbitMQ: **cada suscripción filtra por la propiedad `eventType`**
( SqlFilter). Por eso el publicador **debe** setear `eventType`; si no, ninguna regla matchea y no llega
nada. Y por eso shipping tiene **dos** suscripciones: para **aislar** las cancelaciones de las creaciones.”*

---

## 6. DLX / DLQ — ~1 min (se ve en el bloque 4)

### Mostrar (Azure)
- La **DLQ** es nativa: **cada suscripción y cada cola** tiene su `/$deadletterqueue` (no se declara, a
  diferencia del **DLX** de RabbitMQ).
- **Código:** `DeadLetterConsumer` lee `DeadLetterReason`, `DeadLetterErrorDescription`, `DeadLetterSource`
  y los **loguea** (equivalente a la cabecera `x-death` de RabbitMQ).

### Decir
*“En RabbitMQ declaraba DLX + DLQ + bindings; aquí es nativa. El broker adjunta el motivo del fallo y mi
consumidor de DLQ lo registra para diagnóstico/reproceso.”*

---

## 7. Políticas de RETENCIÓN (TTL) — ~1 min

### Acción
```bash
for e in "queue smartlogix.stock-check.req" "queue smartlogix.stock-check.reply"; do :; done
az servicebus queue show -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns -n smartlogix.stock-check.req \
  --query "{ttl:defaultMessageTimeToLive, maxDelivery:maxDeliveryCount, dlOnExpire:deadLetteringOnMessageExpiration}" -o table
az servicebus topic subscription list -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns \
  --topic-name smartlogix.orders.topic --query "[].{name:name, ttl:defaultMessageTimeToLive, maxDelivery:maxDeliveryCount}" -o table
```

### Mostrar (tabla para decir de memoria)
| Entidad | TTL | maxDelivery | Dead-letter al vencer | autoDeleteOnIdle |
|---|---|---|---|---|
| `inventory-sub` / `shipping-*` | **PT30S** | 3 | **Sí** | ∞ (durable) |
| `smartlogix.stock-check.req` / `.reply` | **PT2M** | 3 | **Sí** | ∞ |
| `catalog-audit-sub` (product.created) | **PT30S** | 3 | **Sí** | ∞ |

### Decir
*“La retención la gobierna el **TTL**. Las suscripciones viven 30 s: si nadie las consume, **no se pierden,
se dead-letterean** (deadLetteringOnMessageExpiration=true) — retención con red de seguridad. Las colas de
stock viven 2 min, más que el timeout de 10 s del request/reply. Y las entidades **no se autoborran**:
la topología persiste.”*

---

## 8. ALERTAS (¡SÍ aplican!) — ~2 min

### Mostrar (Azure → namespace → Alertas → Reglas de alerta)
| Alerta | Métrica | Condición | Severidad | Eval/Ventana |
|---|---|---|---|---|
| `alert-sb-deadletter` | DeadletteredMessages | **> 0** | Sev1 (crítica) | PT1M / PT5M |
| `alert-sb-servererrors` | ServerErrors | **> 0** | Sev2 | PT1M / PT5M |
| `alert-sb-backlog` | ActiveMessages | **> 50** | Sev2 | PT1M / PT5M |

Action group **`ag-smartlogix-alerts`** → email a `lu.tasso@duocuc.cl`.

### Acción (disparo en vivo, opcional)
El mensaje venenoso del bloque 4 ya deja **DeadletteredMessages = 1** → en **~1–2 min**,
`alert-sb-deadletter` pasa a **“Alerta”** (y llega correo). Luego purga la DLQ y verás **“Resuelta”**.

### Decir
*“Tengo tres alertas métricas sobre el namespace: **DLQ > 0** (crítica, aviso temprano de fallos),
**errores del servidor** y **más de 50 mensajes activos** (backlog). Evalúan cada minuto y notifican por
correo al action group. Aquí se ve la de DLQ **disparada** por el mensaje venenoso.”*

---

## 9. Cierre (30 s)

*“Resumiendo: **síncrono** con request/reply sobre colas; **asíncrono** con pub/sub sobre un topic;
**ACK** por PeekLock (acuso al terminar); **DLQ** nativa con motivo de fallo; **retención** por TTL con
dead-letter al vencer; y **alertas** que vigilan DLQ, errores y backlog.”*

---

## Anexo A — Comandos rápidos

```bash
# Estado en vivo
python inspeccionar_eventos.py

# Inyectar eventos de demo (N creados, M cancelados, [si] manda 1 a DLQ)
python inyectar_eventos_demo.py 2 1 si

# Flujo síncrono+asíncrono real (login + create + confirm + ver stock)
python demo_mensajeria.py

# Purgar DLQ
python purgar_dlq.py

# Métricas rápidas por entidad
az servicebus topic subscription show -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns \
  --topic-name smartlogix.orders.topic -n inventory-sub --query countDetails
```

## Anexo B — Traducción portal (ES)
Explorador de Service Bus · Modo **Inspeccionar** (peek) · **Dead letter** (cola de mensajes no entregados) ·
**Temas / Suscripciones** · **Reglas de alerta**.

## Anexo C — Si algo no se ve
- **No aparece el mensaje en el Explorador:** el consumidor lo drena al instante. Usa la **suscripción
  observadora** (bloque 3) o **detén** el consumidor (`docker compose stop inventory`) y sube el TTL.
- **La alerta no salta:** espera ~1–2 min (evaluación PT1M/ventana PT5M) y deja `DeadletteredMessages > 0`.
- **El correo de alerta:** Azure puede pedir una **confirmación** al receptor la primera vez; acéptala.
