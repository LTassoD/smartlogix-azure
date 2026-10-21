# Conceptos de mensajería y DÓNDE se configuran (EP2)

Guía de apoyo para la defensa. Cada concepto tiene: qué es → dónde se configura → valor real
del proyecto → cómo se demuestra en vivo.

---

## 0. MAPA MAESTRO: concepto → configuración → valor

| Concepto | Knob de configuración | Valor en SmartLogix | Efecto observable |
|---|---|---|---|
| **Síncrono** | 2 colas + timeout de espera | `smartlogix.stock-check.req` / `.reply`, `timeout-ms=10000` | El `POST /confirm` **tarda ~2,5 s** y decide CONFIRMED / error |
| **Asíncrono** | 1 topic + N subscriptions | `smartlogix.orders.topic` + 4 subs con SqlFilter | El `POST /confirm` **responde al instante**; el efecto pasa después |
| **ACK** | `spring.jms.listener.acknowledge-mode` | `auto` (AUTO_ACKNOWLEDGE) | El broker borra el mensaje **solo si** el listener retorna sin excepción |
| **Dead-letter** | `maxDeliveryCount` + `deadLetteringOnMessageExpiration` | `3` + `true` | Al 3er fallo o al vencer el TTL, el mensaje va a la DLQ |
| **DLQ** | **nativa, no se declara** | `.../$deadletterqueue` (existe siempre) | Pestaña "Dead-letter" del portal + métrica `DeadletteredMessages` |
| **DLX** | **no existe en Service Bus** | — (en RabbitMQ: `smartlogix.inventory.dlx`, `smartlogix.shipping.dlx`) | En SB no hay exchange de DL que declarar |
| **Retención** | `defaultMessageTimeToLive` | `PT30S` (subs) · `PT2M` (colas) | El mensaje se auto-elimina / pasa a DLQ |
| **Alertas** | Reglas de alerta del namespace | `deadletter>0` (Sev1) · `backlog>50` (Sev2) · `servererrors>0` (Sev2) | Correo a `lu.tasso@duocuc.cl` |
| **Purga** | `autoDeleteOnIdle` | `P10675199DT2H48M5...` (~10675199 días = **infinito**) | Las entidades **no se borran solas** |

---

## 1. ACK (acuse de recibo)

**Qué es.** El cliente le dice al broker: *"ya procesé este mensaje, puedes borrarlo"*. En AMQP/JMS
la operación se llama *complete* (completar la entrega). Si el cliente **no** acusa, el broker
**conserva** el mensaje y lo vuelve a entregar.

**Analogía.** Un repartidor entrega un paquete. Si **firmas** (ACK) → el repartidor se lo lleva y
listo. Si **no firmas** → el paquete vuelve al depósito y te lo vuelven a entregar.

**Dónde se configura.**

| Dónde | Qué | Valor |
|---|---|---|
| `application.properties` (los 3 servicios) | `spring.jms.listener.acknowledge-mode` | `auto` → `AUTO_ACKNOWLEDGE` |
| `application.properties` (los 3 servicios) | `spring.jms.session-transacted` | `false` (no hay transacción) |
| Código | el `catch` que **relanza** la excepción | `throw new RuntimeException(e)` |

**Cómo funciona `auto`:** el broker da el mensaje **bloqueado** (PeekLock) → el listener procesa →
**si retorna normalmente, Spring envía el ACK** y el broker lo elimina; **si lanza excepción, no
hay ACK**, el lock se libera y el broker **reentrega** el mismo mensaje, incrementando
`DeliveryCount`.

> ⚠️ **El detalle que hay que saber explicar:** si el `catch` se comiera la excepción (sin relanzarla),
> Spring haría ACK igual y **el mensaje se perdería** aunque el procesamiento fallara. Por eso el
> `catch` **relanza**: es el que "le avisa" al broker que la operación falló.

**Dónde se ve en el portal.** No hay un interruptor de ACK. Se ve en las **métricas**:
`DeliveryCount` de un mensaje y el contador `DeadletteredMessages` de la suscripción.

---

## 2. Dead-letter (la acción) vs DLQ (el donde)

- **Dead-letter** = la **acción** de mover un mensaje a la DLQ.
- **DLQ** = la **cola** donde queda el mensaje que no se pudo procesar.
- **DLX** = en RabbitMQ, el *exchange* al que se enruta el mensaje muerto.

**Analogía.** ElCorreo: "carta devuelta" (dead-letter) → "bandeja de devoluciones" (DLQ) →
"oficina de reenvíos" (DLX).

**Cuándo se dispara el dead-letter en tu proyecto (2 disparadores):**

1. **`maxDeliveryCount=3`**: el mensaje falló 3 veces (se agotó el reintento).
2. **TTL vencido** + `deadLetteringOnMessageExpiration=true`: el mensaje se quedó demasiado tiempo
   sin ser consumido (p. ej. el consumidor estuvo caído) → en vez de desaparecer, pasa a la DLQ.

**Dónde se configura.**

| Dónde | Qué | Valor |
|---|---|---|
| Portal → Namespace → **Colas** / **Temas → Suscripciones** | `maxDeliveryCount` | `3` |
| Portal → (idem) | `deadLetteringOnMessageExpiration` | `true` |
| Portal → (idem) | `deadLetteringOnFilterEvaluationExceptions` | `true` (⚠️ ver §6) |
| `application.properties` | destino de la DLQ | `.../Subscriptions/<sub>/$deadletterqueue` |
| Código | `DeadLetterConsumer` (inventory ×1, shipping ×2) | lee `DeadLetterReason`, `DeadLetterErrorDescription`, `DeadLetterSource` |

**Propiedades que el broker adjunta** (equivalente a la cabecera `x-death` de RabbitMQ):
`DeadLetterReason` (por qué), `DeadLetterErrorDescription` (detalle), `DeadLetterSource` (de dónde
vino), `DeadLetterMessageId`.

**Dónde se ve en el portal.** Suscripción → pestaña **"Dead-letter"** (contador + peeking de los
mensajes). Az CLI:
```bash
az servicebus topic subscription show -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns \
  --topic-name smartlogix.orders.topic -n inventory-sub \
  --query "countDetails.deadLetterMessageCount" -o tsv
```

---

## 3. DLX: NO existe en Azure Service Bus (existe en RabbitMQ) ← **la pregunta clásica**

| | **RabbitMQ (EP1)** | **Azure Service Bus (EP2)** |
|---|---|---|
| Modelo | **Declarativo**: creas exchange + colas + bindings | **Implícito**: el broker ya trae la DLQ |
| DLX | exchange `fanout` `smartlogix.inventory.dlx` → `smartlogix.shipping.dlx` | **no hay** |
| DLQ | cola `smartlogix.inventory.dlq` / `smartlogix.shipping.dlq` (la creas tú) | **nativa**: `/$deadletterqueue` de cada entidad |
| Cómo activa el DLX | `x-dead-letter-exchange` + `x-dead-letter-routing-key` en la cola | `maxDeliveryCount` o TTL vencido |
| Reintentos | backoff manual (1s, 2s, 4s) + `default-requeue-rejected=false` | automáticos por el broker (lock duration) |
| Diagnóstico | cabecera `x-death` | `DeadLetterReason` / `DeadLetterErrorDescription` |

**Cómo se ve en el código (contraste real del repo):**
- RabbitMQ → `origin/rabbitmq:inventory-service/.../config/RabbitMQConfig.java` (declara `dlx`)
- Service Bus → `inventory-service/.../config/ServiceBusConfig.java` (**no declara** DLX; solo el
  destino de la DLQ en `application.properties:58`)

**Frase para la defensa:**
> *"En RabbitMQ el DLX hay que **declararlo**: exchange, colas y bindings, con la política de reintentos
> y backoff. En Service Bus la DLQ es **nativa** de cada entidad: no se declara nada, solo se configura
> **cuándo** entra un mensaje (maxDeliveryCount, TTL vencido). El diagnóstico lo da el broker con
> `DeadLetterReason`, que es el equivalente de `x-death`."*

---

## 4. SÍNCRONO (request/reply)

**Qué es.** El cliente **espera** la respuesta antes de seguir. Bloquea el hilo.

**Analogía.** Llamar por teléfono y quedarse esperando hasta que te contesten.

**En tu proyecto.** `confirm()` necesita **saber** si hay stock antes de confirmar el pedido.

```
order-service                          Service Bus                 inventory-service
     │                                      │                             │
     ├─ send ──► smartlogix.stock-check.req ┼──► StockCheckRequestConsumer │
     │                                      │         (responde)           │
     │◄───────── smartlogix.stock-check.reply ┼────────────────────────────┘
     │   (espera hasta 10 s)                  │
```

**Dónde se configura.**

| Dónde | Qué | Valor |
|---|---|---|
| Portal → Colas | `smartlogix.stock-check.req` | TTL `PT2M`, maxDelivery `3` |
| Portal → Colas | `smartlogix.stock-check.reply` | TTL `PT2M`, maxDelivery `3` |
| `order-service/application.properties:52-54` | destinos + timeout | `stock-check.timeout-ms=10000` |
| `order-service/.../StockCheckClient.java:83` | envío + espera | `Session.AUTO_ACKNOWLEDGE` |
| Correlación | property `stockCheckId` | id único por llamada |

**Por qué TTL `PT2M` > timeout `10 s`:** para que un mensaje *temporalmente* sin responder (servicio
caído) **no expire antes** de que el cliente se rinda, y así pueda ir a la DLQ con el motivo correcto.

**Cómo se ve en la demo:** el `POST /confirm` tarda **~2,5 s** (espera real de red + broker) y el
stock baja **después** (parte asíncrona).

---

## 5. ASÍNCRONO (pub/sub)

**Qué es.** El cliente publica y **sigue de largo**. No sabe quién recibirá el mensaje ni cuándo.

**Analogía.** Tirar un aviso en el tablón de anuncios: no esperas respuesta.

**En tu proyecto.** `order.created` / `order.cancelled` / `product.created` son **hechos del negocio**
("esto ya pasó"), no peticiones. Nadie debe esperar por ellos.

```
order-service ──publish order.created──► smartlogix.orders.topic
                                              ├── inventory-sub        (rule: eventType='order.created')
                                              └── shipping-created-sub (rule: eventType='order.created')
```

**Dónde se configura.**

| Dónde | Qué | Valor |
|---|---|---|
| Portal → Temas | `smartlogix.orders.topic` | 3 subscriptions |
| Portal → Temas | `smartlogix.catalog.topic` | 1 subscription (`catalog-audit-sub`) |
| Portal → Suscripción → Reglas | SqlFilter | `eventType = 'order.created'` etc. |
| `order-service/.../OrderEventPublisher.java:59-85` | publica | setea `eventType` (obligatorio) |
| `application.properties` (los 3) | `smartlogix.servicebus.*.subscription-destination` | `amqps://.../Subscriptions/<sub>` |

**Diferencia clave cola vs subscription (la pregunta de examen):**

| | **Cola** | **Subscription** (de un topic) |
|---|---|---|
| Quién recibe | **1** solo consumidor (competing consumers) | **todos** los subscribers (fan-out) |
| Copias del mensaje | 1 | **1 por suscripción** |
| Filtrado | no | sí, por SqlFilter |
| Uso aquí | request/reply de stock | `order.created` → inventory **y** shipping |

---

## 6. ⚠️ La trampa: "lo que no matchea" NO va a la DLQ

Las 4 suscripciones del proyecto tienen **una sola regla explícita y NINGUNA `$Default`**:

| Topic | Suscripción | Regla |
|---|---|---|
| `smartlogix.orders.topic` | `inventory-sub` | `only-created` → `eventType = 'order.created'` |
| `smartlogix.orders.topic` | `shipping-created-sub` | `only-created` → `eventType = 'order.created'` |
| `smartlogix.orders.topic` | `shipping-cancelled-sub` | `only-cancelled` → `eventType = 'order.cancelled'` |
| `smartlogix.catalog.topic` | `catalog-audit-sub` | `productCreatedFilter` → `eventType = 'product.created'` |

Un mensaje con `eventType` desconocido o ausente **no matchea ninguna regla** → **no tiene a quién
entregarse → se descarta en el topic**. **No va a la DLQ.** El publicador **no recibe error**:
es una **pérdida silenciosa de mensajes**.

> `deadLetteringOnFilterEvaluationExceptions = true` **NO** significa "lo que no matchea va a DLQ".
> Esa opción aplica solo cuando la **expresión del filtro lanza una excepción** (filtro mal
> formado), no cuando simplemente no coincide.

**Demo en vivo (30 s):**
```bash
export SB_CONN="$(az servicebus namespace authorization-rule keys list \
  -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns -n smartlogix-admin \
  --query primaryConnectionString -o tsv)"
python docs/demo-scripts/demo_evento_huerfano.py
```
→ Resultado: las 3 subscriptions quedan en `activos=0  dead-letter=0  entregadas=0`.

---

## 7. RETENCIÓN (TTL) y purga

| Entidad | TTL | maxDelivery | Dead-letter al expirar |
|---|---|---|---|
| `smartlogix.stock-check.req` | `PT2M` | 3 | sí |
| `smartlogix.stock-check.reply` | `PT2M` | 3 | sí |
| `inventory-sub` | `PT30S` | 3 | sí |
| `shipping-created-sub` | `PT30S` | 3 | sí |
| `shipping-cancelled-sub` | `PT30S` | 3 | sí |
| `catalog-audit-sub` | `PT30S` | 3 | sí |

- **TTL = 30 s** en las subscriptions: suficiente para procesar, y si el consumidor está caído el
  mensaje no se queda indefinidamente.
- **`autoDeleteOnIdle` = infinito**: las entidades **no se autoborran** (importante: los 4 topics/
  colas de la topología no desaparecen por inactividad).
- **No hay deduplicación** en Service Bus → el consumidor debe ser **idempotente** (es la
  contrapartida del *at-least-once*).

---

## 8. ALERTAS (sí aplican, y son el "wow" de la demo)

| Regla | Métrica | Condición | Severidad | Frecuencia | Acción |
|---|---|---|---|---|---|
| `alert-sb-deadletter` | `DeadletteredMessages` | **> 0** | **Sev 1** | PT1M / PT5M | `ag-smartlogix-alerts` → correo |
| `alert-sb-servererrors` | `ServerErrors` | > 0 | Sev 2 | PT1M / PT5M | mismo |
| `alert-sb-backlog` | `ActiveMessages` | > 50 | Sev 2 | PT1M / PT5M | mismo |

**Por qué importan:** `DeadletteredMessages > 0` detecta **al instante** que hay mensajes muertos,
que es la métrica que de otro modo nadie vería hasta que alguien mire el portal a mano.

---

## 9. Cómo ver cada cosa en el portal (mapa de navegación)

```
Azure Portal → Service Bus → sb-smartlogix-ns
├── Colas
│   ├── smartlogix.stock-check.req    → Entidades (TTL, maxDelivery) · Dead-letter
│   └── smartlogix.stock-check.reply
├── Temas
│   ├── smartlogix.orders.topic
│   │   ├── inventory-sub          → Reglas (only-created) · Dead-letter · Explorador
│   │   ├── shipping-created-sub   → Reglas (only-created)
│   │   └── shipping-cancelled-sub → Reglas (only-cancelled)
│   └── smartlogix.catalog.topic
│       └── catalog-audit-sub      → Reglas (productCreatedFilter)
├── Explorador            → "Inspeccionar" (modo peek) para ver los mensajes
└── Alertas → Reglas de alerta → las 3 de arriba
```

En el **Explorador**, el botón **"Inspeccionar desde el inicio"** permite hacer *peek* de los mensajes
de una cola/suscripción **sin sacarlos** (no los consume) — es la forma segura de mostrar el mensaje
en vivo al profesor.
