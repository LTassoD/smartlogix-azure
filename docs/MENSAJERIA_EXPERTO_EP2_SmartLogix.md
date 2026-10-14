# Mensajería en SmartLogix — Guía de experto para la presentación (EP2)

> Basada en el **código real** (rama `azure-deploy`) y en la **configuración real** del
> namespace `sb-smartlogix-ns` (Azure Service Bus, AMQP 1.0, clientes Qpid JMS + Spring JMS).
> El profe aceptó este diseño como equivalente a RabbitMQ; los conceptos son los mismos.

---

## 0. Mapa mental de la arquitectura (memorízalo)

```
                         ┌──────────────────────────── Azure Service Bus ───────────────────────────┐
                         │                                                                          │
  order-service          │   TOPIC  smartlogix.orders.topic                                         │
  (publisher) ──publish──┼─▶ ├─ Sub inventory-sub         (SqlFilter eventType='order.created')     │
                         │   ├─ Sub shipping-created-sub  (eventType='order.created')               │
                         │   └─ SUB shipping-cancelled-sub(eventType='order.cancelled')             │
                         │                                                                          │
  order-service          │   COLAS (síncrono request/reply)                                         │
  (cliente RPC) ────────►│   smartlogix.stock-check.req  ──► inventory-service (responde)          │
            ◄────────────┼── smartlogix.stock-check.reply                                          │
                         │                                                                          │
                         │   Cada subscription y cada cola tiene su DLQ nativa /$deadletterqueue    │
                         └──────────────────────────────────────────────────────────────────────────┘
```

| Elemento | Nombre | Config |
|---|---|---|
| Topic | `smartlogix.orders.topic` | 3 subscriptions, filtros por `eventType` |
| Subscription | `inventory-sub` | TTL `PT30S`, maxDelivery `3`, DLQ on expire = true |
| Subscription | `shipping-created-sub` | filtro `eventType='order.created'` |
| Subscription | `shipping-cancelled-sub` | filtro `eventType='order.cancelled'` |
| Cola (sync) | `smartlogix.stock-check.req` | TTL `PT2M`, maxDelivery 3 |
| Cola (sync) | `smartlogix.stock-check.reply` | TTL `PT2M`, maxDelivery 3 |
| Namespace | `sb-smartlogix-ns` | tier **Standard**, AMQP 1.0, auth SAS |

**Quién hace qué**
- `order-service` → **publica** `order.created` / `order.cancelled` (solo al confirmar/cancelar) y **cliente** del request/reply de stock.
- `inventory-service` → **consume** `order.created` (descuenta stock) + **servidor** del request/reply de stock.
- `shipping-service` → **consume** `order.created` (crea despacho) y `order.cancelled` (cancela despacho).

Archivos clave:
`order-service/.../config/ServiceBusConfig.java`, `.../messaging/publisher/OrderEventPublisher.java`,
`.../messaging/client/StockCheckClient.java`, `order-service/.../service/impl/OrderServiceImpl.java`,
`inventory-service/.../config/ServiceBusConfig.java`, `.../messaging/consumer/*`,
`shipping-service/.../config/ServiceBusConfig.java`, `.../messaging/consumer/*`.

---

## 1. Mensajería síncrona vs asíncrona

### Concepto
- **Asíncrona:** el emisor **no espera** respuesta. Publica un evento y sigue. Desacopla emisor y
  receptor en tiempo y disponibilidad (si el receptor está caído, el mensaje queda en el broker).
- **Síncrona:** el emisor **espera** la respuesta para continuar. Acopla temporalmente a ambos.

### Cómo está en el proyecto (¡y en el MISMO flujo!)
`OrderServiceImpl.confirm()` mezcla las dos, y eso es lo bonito para explicar:

1. **Síncrono (RPC sobre colas):** antes de confirmar, order-service **pregunta stock** y **espera**:
   `StockCheckClient.checkStock(...)` → envía a `smartlogix.stock-check.req` y bloquea hasta
   `smartlogix.stock-check.reply` (timeout **10 s**). Si no hay stock → `BusinessRuleException`.
   (`OrderServiceImpl.java:160-171`, `StockCheckClient.java:77-127`)
2. **Asíncrono (evento pub/sub):** confirmado el pedido, **publica** `order.created` al topic y **no
   espera** a inventory ni shipping. (`OrderServiceImpl.java:173-177`,
   `OrderEventPublisher.java:22-85`)

Evidencia en vivo (la tuvimos en la validación): `POST /confirm` devolvió **200** al instante y, unos
segundos después, el stock bajó (10→9) y apareció el despacho → eso es la parte asíncrona trabajando por detrás.

### Por qué así y no REST
- No hay llamadas HTTP directas entre microservicios: el **sync** se hace con **dos colas** (RPC desacoplado
  del HTTP y con reintento/durabilidad del broker), y el **async** con el topic.

### Cómo lo explicas (30 s)
> “El ordenamiento es mixto. Al confirmar necesito una **respuesta** (¿hay stock?), y eso lo resuelvo con
> request/reply sobre dos colas: envío a `.req` y espero en `.reply`. Una vez confirmado, lo demás es
> **event-driven**: publico `order.created` y me olvido; inventario y despacho reaccionan a su ritmo.
> Por eso el `200` vuelve rápido y los efectos aparecen después.”

**Pregunta probable:** *¿Por qué no todo async?* → Porque la confirmación **depende** del resultado del
stock; sin respuesta no puedo decidir. Y *¿por qué no todo sync?* → Porque crear despacho / descontar stock
no debe bloquear ni acoplar: si shipping está caído, el pedido igual se confirma y shipping se pone al día.

---

## 2. ACK (acuses) y semántica de entrega

### Concepto
ACK = confirmación de que un mensaje fue **procesado**. Define la garantía: si no hay ACK, el mensaje se
**reentrega** → garantía *at-least-once* (al menos una vez).

### Cómo está en el proyecto
Service Bus usa **PeekLock** (recibir-y-bloquear), no ACK-en-la-entrega:

- El mensaje se **bloquea** (invisible para otros consumidores) mientras corre el `@JmsListener`.
- Si el método **retorna OK** → se **completa (ACK)**.
- Si **lanza excepción** → **no** se ACKea; al expirar el lock el broker lo **reentrega** y suma
  `DeliveryCount`; al llegar a **max-delivery-count = 3** → **DLQ**.
- Config: `sessionTransacted=false`, `spring.jms.listener.acknowledge-mode=auto`
  (`inventory-service/.../application.properties:63`, `shipping...:78`).

Código que lo prueba — en los consumidores el `catch` **relanza** para forzar la NO-ACK:
`inventory OrderCreatedConsumer.java:51-61` (`throw new RuntimeException(exception)`),
`shipping OrderCreatedConsumer.java:46-54`.

Detalle fino (de experto): el **cliente síncrono** usa `Session.AUTO_ACKNOWLEDGE`
(`StockCheckClient.java:101`) porque su consumidor del reply se crea al vuelo y vive solo para esa
respuesta; ahí el auto-ACK al recibir es correcto.

### Cómo lo explicas (30 s)
> “No acuso al recibir, acuso al **terminar bien**. Es PeekLock: mientras proceso, el mensaje queda
> bloqueado. Si mi listener tira excepción, no lo acuso, Service Bus lo reentrega y al tercer intento lo
> manda a la DLQ. Eso me da entrega *at-least-once*.”

**Pregunta probable:** *¿No debería ser “exactly once”?* → En sistemas distribuidos el exactly-once real
casi no existe; se resuelve con *at-least-once* + **idempotencia** en el consumidor
(`InventoryOrderEventService` evita descontar dos veces el mismo pedido).

---

## 3. Durabilidad

### Concepto
Que un mensaje **no se pierda** aunque el broker o el consumidor se caigan. En mensajería persistente, el
mensaje se **escribe a disco replicado** antes de considerarlo aceptado.

### Cómo está en el proyecto
- Service Bus (tier Standard) persiste los mensajes en almacenamiento **replicado síncronamente (3 copias
  en la región)** hasta que se *completan* o **expiran** por TTL. Sobrevive reinicios del broker y caídas
  de los microservicios (lo vivimos: apagamos la VM y los mensajes/entidades seguían ahí).
- Las entidades son **durables**: `autoDeleteOnIdle` ≈ infinito (`P10675199...`) → no se autoborran.
- `order-service` publica *fire-and-forget*: **no** espera confirmación del broker. Pero además es
  **resistente**: si el publish falla, se loguea un `warn` y **no** se rompe la transacción del pedido
  (`OrderEventPublisher.java:82-84`). La durabilidad la garantiza el broker, no el cliente.
- Equivalentes RabbitMQ: *durable queue* + *persistent message*. Aquí es nativo.

### Cómo lo explicas (30 s)
> “El broker persiste el mensaje en almacenamiento replicado antes de soltarlo. Aunque se caiga un
> consumidor o el propio broker, el mensaje sigue ahí y se reentrega. La durabilidad no la hace mi código,
> la asegura Service Bus; mi código solo evita tumbar el pedido si el publish falla.”

---

## 4. Publish / Subscribe (pub/sub)

### Concepto
Un **publisher** emite a un **topic**; **N subscribers** reciben **su propia copia**. Fan-out: cada
suscripción es independiente. (Se diferencia de la **cola**, donde un mensaje lo procesa **un solo**
consumidor — *competing consumers*.)

### Cómo está en el proyecto
- **1 publisher** (`order-service`) → **topic** `smartlogix.orders.topic` → **3 subscriptions**.
- **Filtrado por suscripción** con `SqlFilter` sobre la propiedad `eventType` (esto reemplaza la *routing
  key* del exchange de RabbitMQ):
  - `inventory-sub` → `eventType='order.created'`
  - `shipping-created-sub` → `eventType='order.created'`
  - `shipping-cancelled-sub` → `eventType='order.cancelled'`
- **Requisito crítico:** el publisher **debe** setear `eventType` en el mensaje
  (`OrderEventPublisher.java:46,106-107`); si no, **ninguna** regla matchea y las suscripciones reciben
  **cero** mensajes (trampa real documentada en el propio código).
- **Por qué shipping tiene DOS subscriptions:** una suscripción reparte sus mensajes en **round-robin**
  entre consumidores competidores. Si `OrderCreated` y `OrderCancelled` escucharan la **misma** suscripción,
  un `order.created` podría caer en el consumidor de cancelaciones y morir en la DLQ. Dos suscripciones con
  filtros distintos **aíslan** los flujos. (`shipping ServiceBusConfig.java:28-35`)

Evidencia en vivo: **un** `confirm` publicó **un** evento y **dos** consumidores reaccionaron
(inventario descontó stock; shipping creó despacho) → fan-out puro.

### Cómo lo explicas (30 s)
> “Un solo evento `order.created` llega a varias suscripciones, cada una con su copia. Cada suscripción
> tiene un filtro por la propiedad `eventType`, que es lo que en RabbitMQ hacía la routing key. Así
> inventario y despacho reaccionan **en paralelo** y sin acoplarse.”

**Pregunta probable:** *¿Pub/sub no duplica el procesamiento?* → A propósito: cada suscripción representa
un **interés distinto**. Lo que no queremos es que dos consumidores del *mismo* interés compitan (ahí sí
que el mensaje iría a uno solo, como en las colas req/reply).

---

## 5. DLX / DLQ (dead-letter)

### Concepto
Cola de mensajes **no procesables** (vencidos o con demasiados fallos) para **diagnóstico** y **reproceso**.

### RabbitMQ vs Service Bus (muy vendible como expertise)
| RabbitMQ | Service Bus (aquí) |
|---|---|
| Declaras un **DLX** (exchange) + **DLQ** + bindings + `x-dead-letter-exchange` | **DLQ nativa** por suscripción/cola, sufijo `/$deadletterqueue` — **no se declara** |
| Cabecera `x-death` con el motivo | Propiedades `DeadLetterReason`, `DeadLetterErrorDescription`, `DeadLetterSource` |
| DLQ manual | Automática al agotar `maxDeliveryCount` **o** al expirar el TTL con `deadLetteringOnMessageExpiration=true` |

### Cómo está en el proyecto
- Confirmado en Azure: **subscriptions y colas** con `maxDeliveryCount=3` y
  `deadLetteringOnMessageExpiration=true`. El TTL de las suscripciones es **PT30S** y el de las colas
  **PT2M**.
- Los consumidores **de la DLQ** leen esas propiedades y **loguean** para diagnóstico:
  `inventory .../DeadLetterConsumer.java:31-42` y `shipping .../DeadLetterConsumer.java:31-42`
  (shipping tiene **dos** listeners DLQ porque tiene dos suscripciones).
- Destinos DLQ en config: `.../Subscriptions/<sub>/$deadletterqueue`
  (`inventory application.properties:58`, `shipping application.properties:57-58`).
- Dato real: hoy la cola `smartlogix.stock-check.req` tiene **1 mensaje en DLQ** (de una prueba previa) —
  sirve como ejemplo de que el mecanismo funciona.

### Cómo lo explicas (30 s)
> “En RabbitMQ armo un DLX, una DLQ y los bindings. En Service Bus es **nativa**: cada suscripción tiene su
> DLQ, y el mensaje cae ahí solo cuando supera 3 intentos o se vence su TTL. En lugar de `x-death`, el
> broker me deja `DeadLetterReason` y `DeadLetterErrorDescription`, que mis `DeadLetterConsumer` loguean.”

**Pregunta probable:** *¿Cómo reproceso la DLQ?* → Con Service Bus Explorer / SDK se reenvían los mensajes a
la entidad original; la DLQ es el *parking* para hacerlo con seguridad.

---

## 6. Políticas de retención (TTL / auto-delete)

### Concepto
Cuánto **vive** un mensaje y cuándo se **purga** una entidad. En mensajería = **TTL** (time-to-live) +
**autoDeleteOnIdle** + **dead-lettering por expiración**.

### Cómo está en el proyecto (valores reales de Azure)
| Entidad | TTL | maxDelivery | Dead-letter al vencer | autoDeleteOnIdle |
|---|---|---|---|---|
| `inventory-sub` | **PT30S** (30 s) | 3 | **Sí** | ∞ (durable) |
| `shipping-created-sub` | **PT30S** | 3 | **Sí** | ∞ |
| `shipping-cancelled-sub` | **PT30S** | 3 | **Sí** | ∞ |
| `smartlogix.stock-check.req` | **PT2M** | 3 | **Sí** | ∞ |
| `smartlogix.stock-check.reply` | **PT2M** | 3 | **Sí** | ∞ |

- **Lectura de experto:** como `deadLetteringOnMessageExpiration=true`, un mensaje que **no se consuma
  dentro de su TTL** **no se pierde: cae en la DLQ**. Eso es una política de retención **con red de
  seguridad**.
- Las entidades **no se autoborran** (`autoDeleteOnIdle` infinito): la topología persiste.
- **Sin deduplicación** (`requiresDuplicateDetection=false`): la idempotencia se resuelve en la aplicación.
- (Aparte) **Log Analytics** `log-smartlogix` retiene logs **30 días** — es retención de *observabilidad*,
  no de mensajes; útil si quieres mencionarlo.

### Cómo lo explicas (30 s)
> “La retención de mensajes la gobierna el TTL. Mis suscripciones viven 30 segundos: si en ese lapso nadie
> los consume, no se pierden, **se dead-letterean**. Las colas de stock viven 2 minutos, que es más que el
> timeout de 10 s del request/reply. Y las entidades no se autoborran: la topología queda fija.”

---

## 7. Alertas (si aplica — ¡aquí SÍ aplica!)

### Cómo está en el proyecto
**3 alertas métricas** sobre el namespace `sb-smartlogix-ns`, todas **habilitadas**, evaluación cada **1
minuto** y ventana de **5 minutos**, notificando al action group `ag-smartlogix-alerts`:

| Alerta | Métrica | Condición | Severidad |
|---|---|---|---|
| `alert-sb-deadletter` | `DeadletteredMessages` | **> 0** | **1 (crítica)** |
| `alert-sb-servererrors` | `ServerErrors` | > 0 | 2 |
| `alert-sb-backlog` | `ActiveMessages` | **> 50** | 2 |

Están pensadas para los 3 síntomas de mensajería: **DLQ** (mensaje muerto), **errores del broker** y
**acumulación/backlog** (consumidor lento o caído).

### ✅ Notificación configurada
El action group `ag-smartlogix-alerts` ahora tiene un **email receiver** activo:
`smartlogix-ops` → **lu.tasso@duocuc.cl** (estado *Enabled*). Ante `DeadletteredMessages > 0`,
`ServerErrors > 0` o `ActiveMessages > 50`, además de verse en el portal, **llega correo**.

> Nota: Azure puede enviar un correo de **confirmación** al receptor la primera vez; si llega, hay que
> aceptarlo una vez.

Además, el `DeadLetterConsumer` **emite un log estructurado** que podría usarse para una *scheduled query
alert* sobre Log Analytics (alerta basada en logs, complementaria a las métricas).

### Cómo lo explicas (30 s)
> “Tengo tres alertas métricas sobre el namespace: DLQ > 0 (severidad crítica, aviso temprano de fallos),
> error del servidor y más de 50 mensajes activos (backlog). Evalúan cada minuto / 5 de ventana. Lo único
> que debo mostrar es que **disparan**, y puedo mencionar que el action group entrega por correo.”

---

## 8. Tabla resumen RabbitMQ ↔ Service Bus (chuleta)

| Concepto | RabbitMQ | Service Bus (tu proyecto) |
|---|---|---|
| Publicación 1-a-muchos | DirectExchange durable | Topic `smartlogix.orders.topic` |
| Routing/filtrado | Routing key en el binding | `SqlFilter` sobre property `eventType` |
| Cola por servicio | Cola propia | Subscription propia (`inventory-sub`, …) |
| Dead letter | DLX + DLQ + bindings | DLQ nativa `/$deadletterqueue` |
| Motivo del fallo | Cabecera `x-death` | `DeadLetterReason` / `DeadLetterErrorDescription` |
| Expiración | `x-message-ttl` | `default-message-time-to-live` |
| Reintentos | requeue=false + reintentos | `maxDeliveryCount` + reentrega PeekLock |
| Sync request/reply | `convertSendAndReceive` | 2 colas `.req`/`.reply` + correlación por property |
| ACK | `basic.ack` | *Complete* del message (PeekLock) |

---

## 9. Guion de demo (2 minutos, orden sugerido)

1. `POST /api/auth/login` → token (identity 8084 vía gateway 8080).
2. `POST /api/orders` → **201** (queda en `CREATED`, **no** publica evento).
3. `PATCH /api/orders/{id}/confirm` → **200**.
   - Decir: *“aquí ocurre el **sync**: consultó stock por `.req`/`.reply` y esperó la respuesta; luego el
     **async**: publicó `order.created`.”*
4. Mostrar efectos: **stock 10→9** y **despacho creado** → *“un evento, dos consumidores”* (**pub/sub**).
5. Mostrar la topología en el portal de Service Bus: topic + 3 subs + DLQ + las 3 alertas.

---

## 10. Preguntas de examen y respuestas cortas

- **¿Qué pasa si shipping está caído cuando confirmo?** El pedido igual se confirma; el mensaje queda
  **durable** en la suscripción y se reentrega al volver (hasta agotar TTL/`maxDeliveryCount` → DLQ).
- **¿Es exactly-once?** No; **at-least-once** + **idempotencia** en el consumidor.
- **¿Dónde está el ACK?** Al **retornar OK** el `@JmsListener`; si lanza excepción, no hay ACK → reentrega.
- **¿Por qué dos colas para el stock?** Para separar petición y respuesta y correlacionar por `stockCheckId`
  sin bloquear la cola de entrada.
- **¿Por qué no Sessions de Service Bus?** Se probó que **Qpid JMS no soporta receptores sessionful** en
  colas (`enableSession=false`), así que la correlación es por property. (Está documentado en el código.)
- **¿Qué pasa con un mensaje veneno?** Tras **3** entregas fallidas va a la **DLQ** y dispara
  `alert-sb-deadletter`.
- **¿Cómo filtro eventos sin routing key?** Con `SqlFilter` sobre `eventType`; el publisher debe setear esa
  property o no llega nada.

---

## 11. Cosas a dejar perfectas antes de presentar

- [x] **Action group** → email receiver `smartlogix-ops` → lu.tasso@duocuc.cl agregado. ✅
- [x] **DLQ limpiada** → se purgó 1 mensaje (`TTLExpiredException`) de `smartlogix.stock-check.req`. ✅
- [ ] Mostrar en el portal la **DLQ** y las **3 alertas** configuradas.
- [ ] Arrancar la **VM `p44`** y `docker compose up -d` el día de la demo (hoy está deallocated).
