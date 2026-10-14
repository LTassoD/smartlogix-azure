# Guía de estudio — Presentación Evaluación Parcial 2

**Asignatura:** DSY1107 · Desarrollo Cloud Native I
**Proyecto:** SmartLogix (repositorio `LTassoD/smartlogix-azure`, rama `azure-deploy`)
**Documento de referencia:** `EP4_DSY1107_Estudiante_presentación.pdf` + pauta (EP3 encargo 12% + EP4 presentación 18%)

---

## 0. La evaluación en una hoja

| Aspecto | Detalle |
|---|---|
| Encargo (EP3) | 12% · Parejas. Código frontend + backend vía GitHub |
| Presentación (EP4) | 18% · **Individual** (seguís defendiendo grupal, pero la nota es individual) |
| Duración | **5 a 10 minutos** |
| Objetivo | Incorporar **mensajería asíncrona (RabbitMQ)** al sistema, con colas, exchanges y DLQs, sin romper la lógica existente |
| Formato de pista | 11 puntos a demostrar "en la nube" (ver §3) |

### Indicadores de la pauta (qué evalúa y cuánto pesa)
1. **12%** — Nombres de colas/exchanges/bindings **centralizados** en `application.yml` o clase `@Configuration`.
2. **13%** — Beans de config (Queue/Exchange/Binding) por caso de uso, con la lógica de mensajería **separada** de la de negocio.
3. **10%** — La configuración de mensajería está **aislada en clases específicas** (no mezclada en controladores/servicios de dominio).
4. **15%** — Consumidores implementados con **`@RabbitListener`**, agrupados por **dominio funcional**.
5. **20%** — Manejo de **ACK y errores** en los consumidores + microservicio **administrador con endpoints REST** (`POST /queues`, `DELETE /queues/{name}`).
6. **13%** — La API REST del administrador **bien definida** (rutas/verbos/recursos).
7. **10%** — Lógica de crear colas/exchanges **encapsulada en un servicio** (p. ej. `RabbitAdminService`).
8. **7%** — **Validación de parámetros** de entrada (no permitir nombres vacíos/invalidos).

---

## 2. Qué debe demostrar la presentación (checklist "en la nube")

1. Instancia de **API Manager** en funcionamiento.
2. **Configuración del API Manager** que llama a los endpoints del backend.
3. El **frontend consume** los endpoints **a través del API Manager**.
4. El API Manager **valida JWT** (rechaza inválidos, acepta válidos).
5. **Tenant en IDaaS** + usuarios registrados.
6. El **frontend usa OAuth 2.0/OpenID Connect** para login y obtener un JWT válido.
7. **Backend y frontend desplegados, activos e integrados** en la nube.
8. **Dos nodos RabbitMQ** configurados e integrados en un **clúster**.
9. **Tres colas** de mensajes con sus **DLQ** funcionando.
10. **Exchanges `direct` y `topic`** configurados.
11. **docker-compose en la nube** levantando los servicios de **RabbitMQ**.

> ⚠️ **Aviso importante para ti:** tu proyecto `smartlogix-azure` está desplegado con **Azure Service Bus** (no RabbitMQ) y usa un **gateway propio + JWT propio** (no Azure APIM ni IDaaS). Varios de los 11 puntos **no coinciden literalmente** con lo que implementaste. En la sección 5 tienes el **mapeo punto por punto** con qué mostrar y cómo responder.

---

## 3. Arquitectura de SmartLogix (tu proyecto)

Sistema de logística como **microservicios + frontend**, con el frontend hablando **solo** con un gateway que valida JWT.

| Componente | Rol | Puerto |
|---|---|---|
| `frontend` | React + TS + Vite + Tailwind (UI, permisos por rol) | 80 (nginx) |
| `api-gateway` | Spring Cloud Gateway (BFF): entrada única, valida JWT, enruta, `/api/system/health` | 8080 |
| `identity-service` | Login, 2FA TOTP, usuarios, **emite el JWT** | 8084 |
| `inventory-service` | Productos, stock, bodegas, movimientos | 8081 |
| `order-service` | Clientes, pedidos, confirmación/cancelación | 8082 |
| `shipping-service` | Envíos, transportistas, tracking | 8083 |
| `sb-admin-service` | **Admin de mensajería (colas/tópicos/suscripciones) por REST** | 8085 |

Cada servicio tiene su **PostgreSQL propio** (`smartlogix_identity_db`, `_inventory_db`, `_order_db`, `_shipping_db`).

**Flujo de una petición** (`api-gateway/src/main/resources/application.properties`):
- `/api/auth/**`, `/api/users**` → identity
- `/api/inventory/**` → inventory · `/api/orders/**` → order · `/api/shipping/**` → shipping

El gateway resuelve `Path` → `uri` (variable de entorno `SMARTLOGIX_*_SERVICE_URL`), valida el JWT y cada microservicio **vuelve a validarlo** (defensa en profundidad).

### 3.1 Seguridad (cómo funciona el JWT)
- `identity-service` emite un **JWT firmado HS256**, issuer `smartlogix-identity-service`, con claim **`role`** (ADMIN/OPERATOR/VIEWER). Config en `identity-service/src/main/resources/application.properties:50-52`.
- El gateway lo valida en `api-gateway/.../config/SecurityConfig.java`:
  - `JwtDecoder` con clave simétrica HS256 + valida `iss`/`exp` (líneas 89-103).
  - Convierte el claim `role` → authority `ROLE_<rol>` (líneas 108-129).
  - **RBAC**: login/2FA públicos; `/api/users**` solo ADMIN; `GET` inventario/orders/shipping → ADMIN/OPERATOR/VIEWER; `POST/PATCH/DELETE` → ADMIN/OPERATOR (líneas 30-80).
- El frontend guarda el token en **sessionStorage** (`frontend/src/lib/security/authTokenProvider.ts`) y lo envía como `Authorization: Bearer`; en Azure usa **proxy same-origin** vía nginx (`frontend/src/config/env.ts` → `apiBaseUrl = ""` en producción).
- **2FA TOTP** opcional (Google/Microsoft Authenticator), con anti-fuerza bruta y secretos cifrados AES-256-GCM.

### 3.2 Mensajería (lo central de la evaluación)
Tu proyecto **migró RabbitMQ → Azure Service Bus (AMQP 1.0 con Qpid JMS)** y los consumidores usan **`@JmsListener`** en vez de `@RabbitListener`. Topología desplegada:

- **Colas (request/reply síncrono):** `smartlogix.stock-check.req` y `smartlogix.stock-check.reply`.
  - Al **confirmar** un pedido, `order-service` pide verificar stock; `inventory-service` responde. La correlación va por la property `stockCheckId`.
- **Tópico (eventos asíncronos):** `smartlogix.orders.topic` con suscripciones:
  - `inventory-sub` → filtro SQL `eventType = 'order.created'` → descuenta stock.
  - `shipping-created-sub` → crea el envío.
  - `shipping-cancelled-sub` → recibe `OrderCancelledEvent`.
- **DLQ nativa** por suscripción: `/$deadletterqueue`.

Config clave:
- `order-service/.../config/ServiceBusConfig.java` — `ConnectionFactory` AMQP (`amqps://`), `JmsTemplate`, resolución queue vs topic.
- `inventory-service/src/main/resources/application.properties:37-77` — destinos `amqps://host/.../Subscriptions/...`, `/$deadletterqueue`, `acknowledge-mode=auto`, concurrencia.
- Consumidores (`@JmsListener`):
  - `inventory-service/.../infrastructure/messaging/consumer/OrderCreatedConsumer.java`, `.../DeadLetterConsumer.java`.
  - `shipping-service/.../infrastructure/messaging/consumer/OrderCreatedConsumer.java`, `OrderCancelledConsumer.java`, `DeadLetterConsumer.java`.

### 3.3 Despliegue en la nube
- Imágenes en **ACR** `smartlogix2026acr.azurecr.io` (tag `:azure`) — multi-stage, usuario no-root.
- **VM Ubuntu `p44`** (`20.121.31.149`), `/opt/smartlogix/docker-compose.yml` levanta frontend + 6 servicios + 4 Postgres.
- **CI/CD**: `.github/workflows/deploy.yml` (rama `azure-deploy`) construye y publica las 7 imágenes y despliega por SSH.
- **Monitoreo**: alertas de Service Bus (dead-letter, backlog, server errors) en `rg-smartlogix-aca`.

---

## 4. Tu versión RabbitMQ (la que coincide con la pauta)

En la carpeta original `SmartLogix/` la mensajería SÍ está con RabbitMQ. Ten esto a mano porque es lo que pide la pauta:

**Topología RabbitMQ:**
- Exchange **`direct`**: `smartlogix.orders.exchange` (durable).
- Routing keys: `order.created`, `order.cancelled`.
- `order-service` (`.../orders/config/RabbitMQConfig.java`): declara colas `smartlogix.orders.created.queue` y `smartlogix.orders.cancelled.queue` + bindings + **publisher confirms** (no tiene listeners).
- `inventory-service` (`.../inventory/config/RabbitMQConfig.java`): cola `smartlogix.inventory.order-created.queue` con `x-dead-letter-exchange=smartlogix.inventory.dlx`, `x-message-ttl=30000`; DLX **`fanout`** `smartlogix.inventory.dlx` → DLQ `smartlogix.inventory.dlq` (TTL 24 h).
- `shipping-service` (`.../shipping/config/RabbitMQConfig.java`): colas `smartlogix.shipping.order-created.queue` y `...order-cancelled.queue` (TTL 30 s + DLX); DLX `smartlogix.shipping.dlx` → DLQ `smartlogix.shipping.dlq` (TTL 24 h).
- **Nombre centralizado**: constantes `public static final String ...` en cada `RabbitMQConfig` (una clase de configuración por servicio).
- **Consumidores** `@RabbitListener` agrupados por dominio: `infrastructure/messaging/consumer/` (`OrderCreatedConsumer`, `OrderCancelledConsumer`, `DeadLetterConsumer`).
- **Reintentos**: `spring.rabbitmq.listener.simple.retry.*` (max-attempts 3, backoff 1s→10s ×2) y `default-requeue-rejected=false`.

**Equivalencia RabbitMQ ↔ Service Bus (para tu presentación):**

| RabbitMQ (original) | Service Bus (desplegado) |
|---|---|
| `DirectExchange` + routing key | Topic + **SqlFilter** por property `eventType` |
| Cola propia + binding | **Subscription** propia |
| `@RabbitListener` | **`@JmsListener`** |
| DLX + DLQ | **DLQ nativa** `/$deadletterqueue` |
| `x-message-ttl` | `default-message-time-to-live` |
| retry + backoff app | **max-delivery-count** + PeekLock |
| Publisher confirms | (no nativo en SB; se maneja con logs/errores) |

---

## 5. Mapeo punto por punto de la pauta → tu implementación

| # | Pide la pauta | Tú tienes | Cómo lo explicas / demuestras |
|---|---|---|---|
| 1 | API Manager (Azure APIM) en la nube | **Spring Cloud Gateway** propio corriendo en la VM | Explica que implementaste un API Gateway (BFF) que cumple el rol: entrada única, ruteo y seguridad. Si el docente exige APIM de Azure, crea uno (Consumption) apuntando a `http://20.121.31.149` y muéstralo (ver §6). |
| 2 | Config del API Manager llamando al backend | Rutas `Path → uri` en `api-gateway/.../application.properties` | Muestra las rutas `/api/*` y el health agregado `/api/system/health`. |
| 3 | Frontend consume vía API Manager | Frontend pega al gateway (same-origin nginx) | Muestra login + una vista (p. ej. productos) en `http://20.121.31.149`. |
| 4 | API Manager valida JWT | `SecurityConfig` valida HS256 + iss + role | Muestra petición **sin** token → 401, y **con** token válido → 200. |
| 5 | Tenant en IDaaS + usuarios | JWT propio de `identity-service` (no IDaaS) | Explica tu gestión de usuarios/roles. Si exigen IDaaS: crear tenant Azure AD B2C y registrar usuarios (guías 1.2.x/1.3.x). |
| 6 | Frontend OAuth2/OIDC (MSAL) | Login propio email/password + 2FA | Explica el flujo de auth propio. Brecha si exigen OIDC: integrar MSAL. |
| 7 | Frontend y backend desplegados y activos | VM `p44` con docker-compose (7 contenedores) | `docker compose ps` en la VM + `http://20.121.31.149`. |
| 8 | 2 nodos RabbitMQ en clúster | **No** (Service Bus gestionado) | Explica el equivalente: Service Bus es un broker gestionado HA (no requieres montar clúster). Si exigen 2 nodos: agregarlos al compose (guías 2.1.x). |
| 9 | 3 colas con DLQ | Colas req/reply + 3 subscriptions con DLQ nativa | Muestra en el portal/`az` las colas y las DLQ. |
| 10 | Exchanges `direct` y `topic` | Un topic con filtros (equivale a direct por `eventType`) | Explica la equivalencia (tabla §4). En la versión RabbitMQ: direct real + DLX fanout. |
| 11 | docker-compose levantando RabbitMQ | docker-compose propio (sin RabbitMQ) | Muestra el compose real. Si exigen RabbitMQ: agregar servicios `rabbitmq` + `rabbitmq2` al compose. |

---

## 6. Preguntas probables del docente (y respuestas cortas)

**¿Por qué Service Bus y no RabbitMQ?**
"Es un broker gestionado de Azure, con AMQP 1.0 (protocolo estándar) y DLQ nativa; mantuve los mismos patrones (request/reply y publish-subscribe) y las mismas responsabilidades por servicio."

**¿Qué diferencia hay entre la routing key de RabbitMQ y el filtro de Service Bus?**
"En RabbitMQ el exchange enruta por routing key (`order.created`). En Service Bus el topic no enruta solo: cada subscription filtra por **propiedades** del mensaje; por eso el productor setea `eventType`, que consume el `SqlFilter`."

**¿Cómo garantizas que no se pierdan mensajes?**
"DLQ por suscripción, reintentos con `max-delivery-count` y PeekLock; en RabbitMQ: DLX/DLQ + retry con backoff + `default-requeue-rejected=false`."

**¿Cómo se correlaciona el request/reply?**
"Con la property `stockCheckId`; el `.reply` se escucha antes de publicar y si no hay respuesta en 10 s no se cuelga el pedido."

**¿Dónde está separada la configuración de mensajería?**
"En clases `@Configuration` (`ServiceBusConfig` / `RabbitMQConfig`) por servicio; los consumidores viven en `infrastructure/messaging/consumer`, separados de los servicios de dominio."

**¿Qué hace el microservicio administrador?**
"`sb-admin-service` (8085) expone REST para crear/borrar colas, tópicos, suscripciones y reglas, usando la policy `smartlogix-admin` (Manage)."

---

## 7. Guion sugerido (5–10 min)

1. **Contexto (30 s):** qué es SmartLogix y su arquitectura de microservicios + gateway.
2. **Diagrama (1 min):** frontend → gateway → servicios → PostgreSQL + Service Bus.
3. **Seguridad (1–2 min):** login → JWT (HS256, roles) → gateway valida y aplica RBAC (mostrar 401 vs 200).
4. **Mensajería (3–4 min):** request/reply de stock + topic con suscripciones + DLQ; mapear a la pauta (colas, exchanges, listeners, ACK/errores).
5. **Demo E2E (2–3 min):** login → crear pedido → confirmar → ver stock descontado y envío creado; mostrar colas/DLQ en el portal.
6. **Cierre (30 s):** despliegue (ACR + VM + CI/CD) y monitoreo (alertas).

**Orden de demo (comandos clave):**
```bash
# en la VM
az vm start -g rg-smartlogix-aca -n p44          # si está apagada (IP no cambia)
ssh azureuser@20.121.31.149 'cd /opt/smartlogix && docker compose ps'
# Service Bus
az servicebus queue list -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns -o table
az servicebus topic subscription list -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns --topic-name smartlogix.orders.topic -o table
```
Flujo E2E: `POST /api/auth/login` → `POST /api/inventory/stock/movements` (IN) → `POST /api/orders` → `PATCH /api/orders/{id}/confirm` → verificar stock y envío.

---

## 8. Brechas y cómo cubrirlas (checklist de riesgo)

- [ ] **APIM real**: si el docente exige Azure API Management, créalo (Consumption), importa las operaciones `/api/*` apuntando a `http://20.121.31.149` y agrega policy `validate-jwt` (issuer + clave simétrica HS256). Apunta el frontend a la URL de APIM.
- [ ] **IDaaS (Azure AD B2C)**: registrar tenant/app, configurar MSAL en el frontend y validar el JWT de B2C en el gateway (guías 1.2.x/1.3.x).
- [ ] **RabbitMQ 2 nodos en clúster**: agregar `rabbitmq` + `rabbitmq2` (con `rabbitmq.conf` y `RABBITMQ_ERLANG_COOKIE`) al `docker-compose.yml`, con sus puertos, y reconectar los servicios (versión RabbitMQ).
- [ ] **Exchanges direct y topic**: además del direct, declarar un `TopicExchange` con routing keys comodín (`order.*`).
- [ ] **Microservicio administrador estilo RabbitAdminService**: ya existe `sb-admin-service`; nómbralo y muestra sus endpoints REST y validaciones.

**Decisión de la presentación:** el profesor indicó que **RabbitMQ es aceptable solo en último caso**; como el **Service Bus de Azure ya está desplegado y funcionando**, la versión a presentar es la rama **`azure-deploy`** (Service Bus + gateway + JWT propios).
- Rama **`azure-deploy`** (principal): versión desplegada en Azure con **Service Bus** (colas, tema/suscripciones, stock check).
- Rama **`rabbitmq`** (plan B, ya publicada en `LTassoD/smartlogix-azure`): versión alternativa con **RabbitMQ** (clúster de 2 nodos, exchanges `direct` y `topic`, 3 colas + DLQ, `@RabbitListener`, microservicio `rabbit-admin-service`). Detalle en `docs/IMPLEMENTACION_RABBITMQ.md`. Solo se usa si el docente exige RabbitMQ.

---

## 9. Archivos de referencia rápida

| Tema | Archivo |
|---|---|
| Compose nube | `docker-compose.yml` |
| Rutas + CORS + JWT gateway | `api-gateway/src/main/resources/application.properties` |
| Seguridad/RBAC gateway | `api-gateway/.../config/SecurityConfig.java` |
| JWT emisión/expiración | `identity-service/src/main/resources/application.properties` |
| Service Bus (order) | `order-service/.../config/ServiceBusConfig.java` |
| Service Bus (inventory/shipping) | `.../config/ServiceBusConfig.java` + `application.properties` |
| Consumidores | `*/.../infrastructure/messaging/consumer/*.java` |
| Admin mensajería | `sb-admin-service/.../config/ServiceBusAdminConfig.java` |
| CI/CD | `.github/workflows/deploy.yml` |
| Deploy Azure | `AZURE-DEPLOY.md`, `docs/IMPLEMENTACION_AZURE.md` |
| RabbitMQ original | `SmartLogix/*/.../config/RabbitMQConfig.java` (repo `felipeflores-m/SmartLogix`) |
