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
# 2) Cadena de conexión para los scripts de demo (se usa como SB_CONN).
#    IMPORTANTE: usar la regla "smartlogix-admin" (NO "smartlogix-app").
#    Los scripts consultan contadores y hacen peek -> usan el SDK de ADMINISTRACIÓN,
#    que exige el claim "Manage"; la policy de la app solo tiene Send/Listen y
#    responde 401 Unauthorized en get_subscription_runtime_properties.
export SB_CONN="$(az servicebus namespace authorization-rule keys list \
  -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns -n smartlogix-admin \
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

### Acción (mensaje que vence por TTL → **DLQ nativa**)
```bash
export SB_CONN="$(az servicebus namespace authorization-rule keys list \
  -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns -n smartlogix-admin \
  --query primaryConnectionString -o tsv)"
python demo_dlq_ttl.py
```
El script (1) crea la suscripción **`demo-dlq-sub`** (TTL **20 s**, `deadLetteringOnMessageExpiration=true`,
regla `eventType='order.created'`, **sin consumidor**), (2) publica un `order.created` válido y
(3) espera: en **~1 min** el broker lo **dead-letterea** porque venció su TTL.

Salida esperada:
```
  t+ 20s  activos=1  dead-letter=0
  t+ 60s  activos=0  dead-letter=1
== CONTENIDO DE LA DLQ (dead-letter) ==
  DeadLetterReason           : TTLExpiredException
  DeadLetterErrorDescription : The message expired and was dead lettered.
  body                       : {"orderId": 999, "orderNumber": "ORD-DEMO-DLQ", ...}
```

### Mostrar (Azure)
- **Tema `smartlogix.orders.topic` → Suscripciones → `demo-dlq-sub` → Explorador → pestaña
  “Dead letter”** → el mensaje **con el motivo** `TTLExpiredException` y el `body` intacto.
- **Namespace → Métricas → `DeadletteredMessages` = 1** → es lo que dispara `alert-sb-deadletter`
  (bloque 8). *Ojo:* en Log Analytics esta métrica llega **siempre en 0** (limitación del
  diagnóstico de Service Bus); el valor real se ve en el portal o con `az monitor metrics list`.
- **Código:** `inventory .../DeadLetterConsumer.java` lee `DeadLetterReason`,
  `DeadLetterErrorDescription` y `DeadLetterSource` (equivalente a la cabecera `x-death` de RabbitMQ).

### Decir
*“La **retención** y la **DLQ** están conectadas: la suscripción tiene TTL de 30 s y
`deadLetteringOnMessageExpiration=true`, así que un mensaje que **nadie consume no se pierde: se
dead-letterea** con el motivo `TTLExpiredException`. Eso es la **retención con red de seguridad**:
nada se pierde en silencio. Y la DLQ es **nativa** en Service Bus: cada suscripción y cada cola
trae su `/$deadletterqueue`, no hay que declarar un DLX como en RabbitMQ.”*

### Variante: el mensaje “venenoso” (JSON inválido) — qué pasa de verdad
```bash
python - <<'PY'
import os
from azure.servicebus import ServiceBusClient, ServiceBusMessage
c = ServiceBusClient.from_connection_string(os.environ["SB_CONN"])
with c.get_topic_sender(topic_name="smartlogix.orders.topic") as s:
    s.send_messages(ServiceBusMessage("{ esto no es json valido }",
        application_properties={"eventType": "order.created"}))
print("veneno enviado")
PY
```
El consumidor **lo recibe y lo rechaza** (log: `payload is not valid JSON`), pero en este proyecto
**no hay reentrega**: con `acknowledge-mode=auto` y `session-transacted=false` el cliente **Qpid
JMS asienta (pre-ack) el mensaje al entregarlo**, así que la excepción del listener no alcanza a
dejarlo en la subscription para un reintento y **nunca llega a la DLQ**.

> Si el profesor pregunta por qué: para que un mensaje fallido se reintente y termine en la DLQ
> hay que **no asentar hasta procesar bien**, es decir `acknowledge-mode=client` (ACK explícito al
> final) o `session-transacted=true` (rollback ⇒ redelivery). Con el PeekLock de Service Bus el
> modelo correcto es *acknowledge-after-processing*; en esta configuración el consumo es
> *at-most-once* en el camino de error. **Decir esto con seguridad es un punto a favor**: muestra
> que conozco la semántica de entrega y no solo la configuré.

### Limpieza
```bash
python demo_dlq_ttl.py --limpiar   # borra demo-dlq-sub
```

---

## 5. Publish/Subscribe — filtros (se explica dentro del bloque 3) — ~1 min

### Mostrar (Azure)
- **`smartlogix.orders.topic` → Suscripciones**: `inventory-sub` y `shipping-created-sub` con filtro
  `eventType='order.created'`; `shipping-cancelled-sub` con `eventType='order.cancelled'`.
- **`smartlogix.catalog.topic` → Suscripciones**: `catalog-audit-sub` con filtro `eventType='product.created'`.

### Tabla de reglas REAL del proyecto (verificada con `az servicebus topic subscription rule list`)

| Topic | Suscripción | Regla | SqlFilter | ¿`$Default`? |
|---|---|---|---|---|
| `smartlogix.orders.topic` | `inventory-sub` | `only-created` | `eventType = 'order.created'` | **No existe** |
| `smartlogix.orders.topic` | `shipping-created-sub` | `only-created` | `eventType = 'order.created'` | **No existe** |
| `smartlogix.orders.topic` | `shipping-cancelled-sub` | `only-cancelled` | `eventType = 'order.cancelled'` | **No existe** |
| `smartlogix.catalog.topic` | `catalog-audit-sub` | `productCreatedFilter` | `eventType = 'product.created'` | **No existe** |

> Las 4 suscripciones tienen **una sola regla explícita y SIN `$Default`**. Por eso un mensaje con un
> `eventType` desconocido no tiene a quién entregarse. Si existiera `$Default` (regla por defecto que
> matchea todo), ese mensaje **sí** llegaría a la suscripción por esa vía.

### Acción (demo en vivo del filtrado — 30 s, es el punto fuerte de la defensa)
```bash
export SB_CONN="$(az servicebus namespace authorization-rule keys list \
  -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns -n smartlogix-admin \
  --query primaryConnectionString -o tsv)"
python docs/demo-scripts/demo_evento_huerfano.py
```
Publica 2 mensajes que no matchean ninguna regla (uno con `eventType='order.inventado'` y otro **sin**
`eventType`) y muestra que **todas las suscripciones quedan en 0 activos y 0 en dead-letter**.

### Decir
*“El topic no rutea por routing key como RabbitMQ: **cada suscripción filtra por la propiedad `eventType`**
(SqlFilter). Por eso el publicador **debe** setear `eventType`.*

*Y aquí está la trampa: un mensaje que no matchea **no va a la DLQ** — se **descarta en el topic**, porque no
hay ninguna suscripción a la que entregárselo. Ojo, porque en las suscripciones está
`deadLetteringOnFilterEvaluationExceptions = true`, pero eso **no** significa ‘lo que no matchea va a la DLQ’:
esa opción aplica solo cuando la **expresión del filtro lanza una excepción** (filtro mal formado), no cuando
simplemente no coincide. Además **ninguna de mis 4 suscripciones tiene `$Default`**, así que no hay red de
seguridad. Y lo más grave: **el publicador no recibe ningún error**. Es una **pérdida silenciosa de mensajes**,
que es exactamente el riesgo del que nos protege el contrato de eventos (que obliga a setear `eventType` y a
versionar el esquema).”*

---

## 6. DLX / DLQ — ~1 min (se ve en el bloque 4)

### Mostrar (Azure)
- La **DLQ** es nativa: **cada suscripción y cada cola** tiene su `/$deadletterqueue` (no se declara, a
  diferencia del **DLX** de RabbitMQ).
- **Código:** `DeadLetterConsumer` lee `DeadLetterReason`, `DeadLetterErrorDescription`, `DeadLetterSource`
  y los **loguea** (equivalente a la cabecera `x-death` de RabbitMQ). Escucha las DLQ de `inventory-sub`
  y de las dos de shipping; **`demo-dlq-sub` no tiene consumidor de DLQ a propósito**, para que el
  mensaje dead-lettereado **quede visible** en el Explorador durante la demo.

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
La demo de TTL del bloque 4 deja **`DeadletteredMessages = 1`** en el namespace → en **~1–2 min**,
`alert-sb-deadletter` pasa a **“Alerta”** (y llega correo). Luego borras `demo-dlq-sub` y verás **“Resuelta”**.

> Si necesitas que el correo llegue, Azure pide **una confirmación** al receptor la primera vez: ábrela
> desde el correo y confirma la suscripción al action group.

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

# DLQ real: publica, vence por TTL y aparece en la DLQ nativa (visible en el portal)
python demo_dlq_ttl.py
python demo_dlq_ttl.py --limpiar

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
