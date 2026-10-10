# Implementación RabbitMQ — SmartLogix (rama `rabbitmq`)

Esta rama implementa la mensajería asíncrona de la **Evaluación Parcial 2 (DSY1107)** con **RabbitMQ**, cubriendo los 11 puntos de la presentación y los indicadores de la pauta. La rama `azure-deploy` mantiene la variante desplegada con Azure Service Bus.

---

## 1. Topología de mensajería

### Exchanges
| Exchange | Tipo | Routing keys / patrón | Uso |
|---|---|---|---|
| `smartlogix.orders.exchange` | `direct` | `order.created`, `order.cancelled` | Eventos de pedido (enrutamiento exacto) |
| `smartlogix.orders.topic.exchange` | `topic` | `order.#` | Mismo flujo, enrutado por patrón comodín |
| `smartlogix.inventory.dlx` | `fanout` | — | Dead Letter Exchange de inventory |
| `smartlogix.shipping.dlx` | `fanout` | — | Dead Letter Exchange de shipping |

### Colas y DLQ
| Cola | Servicio | DLX → DLQ | TTL |
|---|---|---|---|
| `smartlogix.orders.created.queue` | order (registro) | — | — |
| `smartlogix.orders.cancelled.queue` | order (registro) | — | — |
| `smartlogix.inventory.order-created.queue` | inventory | `smartlogix.inventory.dlx` → `smartlogix.inventory.dlq` | 30 s |
| `smartlogix.shipping.order-created.queue` | shipping | `smartlogix.shipping.dlx` → `smartlogix.shipping.dlq` | 30 s |
| `smartlogix.shipping.order-cancelled.queue` | shipping | `smartlogix.shipping.dlx` → `smartlogix.shipping.dlq` | 30 s |

Cada DLQ retiene los mensajes fallidos 24 h y un `DeadLetterConsumer` los audita leyendo el header `x-death` (razón y número de intentos).

### Consumidores (`@RabbitListener`)
- `inventory-service`: `OrderCreatedConsumer` (descuenta stock), `DeadLetterConsumer`.
- `shipping-service`: `OrderCreatedConsumer` (crea envío), `OrderCancelledConsumer` (cancela envío), `DeadLetterConsumer`.
- Configuración de reintentos: `max-attempts=3`, backoff `1s → 2s → 4s`, `default-requeue-rejected=false` → al agotar intentos el mensaje va al DLX/DLQ.

### Nombres centralizados
Los nombres de colas, exchanges y bindings viven como constantes en las clases `@Configuration` de cada servicio:
- `order-service/.../config/RabbitMQConfig.java`
- `inventory-service/.../config/RabbitMQConfig.java`
- `shipping-service/.../config/RabbitMQConfig.java`

---

## 2. Consumidores y ACK

Los consumidores `@RabbitListener` procesan en modo **ACK automático** (Spring AMQP confirma al terminar el método) y, ante error, **propagan la excepción**: el contenedor reintenta con backoff y al agotar los intentos el mensaje se rechaza sin requeue y va al DLX/DLQ (`default-requeue-rejected=false`). Cada servicio tiene un `DeadLetterConsumer` que audita la DLQ leyendo el header `x-death`.

---

## 3. Clúster RabbitMQ de 2 nodos

`docker-compose.yml` levanta `rabbitmq1` y `rabbitmq2`:

- Ambos comparten `RABBITMQ_ERLANG_COOKIE` y usan el mismo usuario/clave.
- `rabbitmq2` ejecuta `rabbitmq/join-cluster.sh`, que arranca el nodo, espera a que responda y ejecuta `rabbitmqctl stop_app / reset / join_cluster rabbit@rabbitmq1 / start_app`.
- `rabbitmq1` expone `5672` (AMQP) y `15672` (consola de administración).
- Los servicios de la app apuntan a `rabbitmq1` con `SPRING_RABBITMQ_HOST` y esperan su healthcheck.

Verificación del clúster:

```bash
docker compose up -d rabbitmq1 rabbitmq2
docker exec -it $(docker compose ps -q rabbitmq1) rabbitmqctl cluster_status
docker exec -it $(docker compose ps -q rabbitmq2) rabbitmqctl cluster_status
```

---

## 4. Microservicio administrador REST

`rabbit-admin-service` (puerto **8086**) usa el `AmqpAdmin`/`RabbitAdmin` autoconfigurado de Spring AMQP y encapsula la lógica en `RabbitAdminService`, con validación de entrada (`jakarta.validation`).

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/admin/queues` | Crea una cola (`name`, `durable`, `exclusive`, `autoDelete`, `arguments`) |
| `DELETE` | `/api/admin/queues/{name}` | Elimina una cola |
| `POST` | `/api/admin/exchanges` | Crea un exchange (`name`, `type` = direct/topic/fanout/headers) |
| `DELETE` | `/api/admin/exchanges/{name}` | Elimina un exchange |
| `POST` | `/api/admin/bindings` | Crea un binding (`exchange`, `queue`, `routingKey`) |
| `DELETE` | `/api/admin/bindings` | Elimina un binding |

Ejemplos:

```bash
curl -X POST http://localhost:8086/api/admin/queues \
  -H 'Content-Type: application/json' \
  -d '{"name":"smartlogix.demo.queue","durable":true,"arguments":{"x-message-ttl":30000}}'

curl -X POST http://localhost:8086/api/admin/exchanges \
  -H 'Content-Type: application/json' \
  -d '{"name":"smartlogix.demo.exchange","type":"topic","durable":true}'

curl -X POST http://localhost:8086/api/admin/bindings \
  -H 'Content-Type: application/json' \
  -d '{"exchange":"smartlogix.demo.exchange","queue":"smartlogix.demo.queue","routingKey":"order.#"}'

curl -X DELETE http://localhost:8086/api/admin/queues/smartlogix.demo.queue
```

---

## 5. Mapeo con la pauta

| Punto de la presentación | Implementación en esta rama |
|---|---|
| 8. Dos nodos RabbitMQ en clúster | `rabbitmq1` + `rabbitmq2` en `docker-compose.yml` con `join-cluster.sh` |
| 9. Tres colas con DLQ | 3 colas de trabajo con `x-dead-letter-exchange` hacia DLX `fanout` → DLQ |
| 10. Exchanges `direct` y `topic` | `smartlogix.orders.exchange` (direct) y `smartlogix.orders.topic.exchange` (topic) |
| 11. docker-compose con RabbitMQ | Servicios RabbitMQ definidos en `docker-compose.yml` |
| Indicadores de código (12–15%) nombres centralizados | Constantes en las clases `RabbitMQConfig` de cada servicio |
| (15%) `@RabbitListener` por dominio | Paquete `infrastructure/messaging/consumer` por servicio |
| (20%) ACK/errores + admin REST | Reintentos + DLQ + `rabbit-admin-service` |
| (13% / 10% / 7%) API REST y validación | `RabbitAdminController` + `RabbitAdminService` + DTOs con `@NotBlank`/`@Pattern` |

> Los puntos 1–7 de la pauta (API Manager, IDaaS, OAuth2/OIDC) se cubren con el **API Gateway + JWT propio** de la rama `azure-deploy`; consulta `docs/IMPLEMENTACION_AZURE.md` y `docs/IMPLEMENTACION_EP2.md`.

---

## 6. Arranque local

```bash
# 1) .env con las credenciales del broker
cp .env.example .env
#   completa SMARTLOGIX_RABBITMQ_PASSWORD y SMARTLOGIX_RABBITMQ_COOKIE

# 2) Levantar todo (incluye el clúster)
docker compose up -d --build --wait --wait-timeout 300
docker compose ps

# 3.1) Consola RabbitMQ:   http://localhost:15672
# 3.2) API de admin:       http://localhost:8086/api/admin/queues
```

Flujo de prueba end-to-end:

1. Login en `http://localhost` (admin seed) → JWT.
2. Cargar stock (movimiento `IN`).
3. Crear pedido y confirmarlo → `order-service` publica `order.created`.
4. `inventory-service` descuenta stock y `shipping-service` crea el envío (logs `processed ... shipmentNumber=...`).
5. Cancelar el pedido → `order.cancelled` → shipping cancela el envío.
