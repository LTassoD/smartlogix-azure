# Glosario técnico — SmartLogix (EP2)

> Términos usados en el proyecto `SmartLogix` (rama `azure-deploy`): arquitectura, mensajería,
> seguridad, datos, Spring, nube y observabilidad. Cada término trae una definición y **dónde se usa**.
> Stack base: **Java 21 · Spring Boot 4.0.6 · Spring Cloud Gateway · PostgreSQL 15 · Azure Service Bus (AMQP 1.0) · Docker**.

---

## 1. Arquitectura y patrones

- **Microservicio** — Servicio autónomo, desplegable por separado, con su propia base de datos.
  *En el proyecto:* `identity`, `order`, `inventory`, `shipping` (+ `gateway`, `sb-admin`, `frontend`).
- **API Gateway** — Punto único de entrada que enruta `/api/**` a cada microservicio.
  *En el proyecto:* `api-gateway` (Spring Cloud Gateway) en el puerto 8080; enruta por `Path=` a identity/order/inventory/shipping.
- **Arquitectura en capas / hexagonal (puertos y adaptadores)** — Separación de responsabilidades por capas.
  *En el proyecto:* cada servicio tiene `domain`, `application`, `infrastructure`, `presentation`, `config`, `shared`.
- **Bounded context (contexto acotado)** — Cada microservicio modela un dominio propio (pedidos, inventario, despachos, identidad).
- **Event-driven / mensajería asíncrona** — Los servicios se comunican por **eventos**, sin llamarse por HTTP directo.
- **Saga / coreografía** — Flujo distribuido donde cada servicio reacciona a eventos (confirmar pedido → descontar stock + crear despacho).
- **Idempotencia** — Procesar el mismo mensaje dos veces produce el mismo efecto que una sola vez.
  *En el proyecto:* `InventoryOrderEventService` evita descontar stock dos veces por el mismo pedido.
- **DTO (Data Transfer Object)** — Objeto plano para transferir datos entre capas/servicios. *P.ej.:* `CreateOrderRequest`, `OrderCreatedEvent`.
- **Mapper** — Convierte entre entidad ↔ DTO ↔ evento. *P.ej.:* `OrderMapper`, `OrderItemMapper`.
- **Contrato de API** — Especificación de endpoints/payloads. *En el proyecto:* OpenAPI/Swagger (`/v3/api-docs`).

---

## 2. Mensajería y brokers

- **Broker de mensajes** — Infraestructura que recibe, almacena y entrega mensajes.
  *En el proyecto:* **Azure Service Bus** (namespace `sb-smartlogix-ns`, tier Standard).
- **Mensaje** — Unidad de datos que viaja por el broker (cuerpo + propiedades/cabeceras).
- **Cola (queue)** — Estructura **punto-a-punto**: cada mensaje lo procesa **un solo** consumidor.
  *En el proyecto:* `smartlogix.stock-check.req` y `.reply`.
- **Topic (tema)** — Estructura **pub/sub**: cada mensaje se copia a cada **subscription**.
  *En el proyecto:* `smartlogix.orders.topic`.
- **Subscription (suscripción)** — Vista independiente de un topic, con su filtro y su DLQ.
  *En el proyecto:* `inventory-sub`, `shipping-created-sub`, `shipping-cancelled-sub`.
- **Publisher / Producer (productor)** — Quien publica mensajes. *En el proyecto:* `OrderEventPublisher` (order-service).
- **Consumer / Subscriber (consumidor)** — Quien lee mensajes. *En el proyecto:* `@JmsListener` en inventory/shipping.
- **Message broker AMQP 1.0** — Protocolo de mensajería estándar que habla Service Bus.
- **JMS (Java Message Service)** — API Java estándar de mensajería; Spring la usa sobre AMQP.
- **Qpid JMS** — Cliente AMQP 1.0 que implementa JMS contra Service Bus (`JmsConnectionFactory`). *En el proyecto:* `ServiceBusConfig` de cada servicio.
- **Spring JMS** — Integración de Spring con JMS: **`@JmsListener`** (consumir) y **`JmsTemplate`** (publicar/enviar).
- **Pub/Sub (publish–subscribe)** — Patrón 1-a-muchos: un evento llega a N suscriptores.
- **Competing consumers** — Varios consumidores de la **misma** cola/suscripción compiten (round-robin); cada mensaje va a uno.
- **Fan-out** — Un evento se replica hacia varias suscripciones (hecho con el topic).
- **Routing key** — (RabbitMQ) clave que el exchange usa para enrutar. *En el proyecto se reemplaza por:* **filtro `SqlFilter`**.
- **SqlFilter / filtro de suscripción** — Filtro declarativo por **propiedades** del mensaje.
  *En el proyecto:* `eventType = 'order.created'` / `'order.cancelled'` (reemplaza la routing key).
- **Property / cabecera de mensaje** — Metadato que viaja con el mensaje. *En el proyecto:* `eventType`, `orderNumber`, `stockCheckId`.
- **Request/Reply (petición–respuesta)** — Comunicación **síncrona** sobre mensajería (RPC con colas).
  *En el proyecto:* `StockCheckClient` (order) ↔ `StockCheckRequestConsumer` (inventory) por `.req`/`.reply`.
- **Correlación (correlation ID)** — Relacionar una respuesta con su petición. *En el proyecto:* propiedad `stockCheckId` (no se usaron Sessions).
- **Sesiones de Service Bus (`enableSession`)** — Receptores "sessionful" para orden FIFO. *En el proyecto:* deshabilitadas (Qpid JMS no las soporta); correlación por property.
- **DLX (Dead Letter Exchange)** — (RabbitMQ) exchange que reencamina mensajes muertos. *Sin equivalente directo en Service Bus.*
- **DLQ (Dead Letter Queue)** — Cola de mensajes **no procesables**. *En el proyecto:* **nativa** por subscription/queue, `/$deadletterqueue`.
- **Dead-lettering** — Acción de mover un mensaje a la DLQ (por fallos repetidos o expiración).
- **Mensaje veneno (poison message)** — Mensaje que siempre falla; acaba en la DLQ.
- **TTL (Time-To-Live)** — Tiempo de vida de un mensaje. *En el proyecto:* subscriptions **PT30S**, colas stock **PT2M**.
- **`deadLetteringOnMessageExpiration`** — Si `true`, al vencer el TTL el mensaje va a la DLQ (no se pierde).
- **`maxDeliveryCount` / DeliveryCount** — Nº máximo de reentregas antes de la DLQ. *En el proyecto:* **3**.
- **Backlog** — Mensajes acumulados sin procesar. *Alerta:* `ActiveMessages > 50`.
- **Backpressure** — Control del flujo cuando el consumidor no da abasto.

---

## 3. Garantías y semántica de entrega

- **ACK (acknowledgement)** — Confirmación de que un mensaje fue procesado. *En el proyecto:* al **retornar OK** el `@JmsListener`.
- **PeekLock (receive-and-lock)** — Modo de Service Bus: el mensaje se **bloquea** mientras se procesa y se **completa** al terminar OK.
- **Complete / Abandon / Dead-letter** — Acciones sobre un mensaje bloqueado: completar (ACK), abandonar (reintento) o enviar a DLQ.
- **Lock duration** — Tiempo que el mensaje queda bloqueado antes de reentregarse si no hay ACK.
- **At-least-once** — Garantía: el mensaje se entrega **una o más veces** (requiere idempotencia).
- **At-most-once** — Entrega **a lo más una vez** (puede perderse).
- **Exactly-once** — Entrega **exactamente una vez** (no garantizable de forma estricta en distribuido; se emula con at-least-once + idempotencia).
- **Transacción (JMS)** — Confirmación atómica de varios mensajes. *En el proyecto:* `sessionTransacted=false` (Service Bus no soporta transacciones locales entre entidades).
- **`acknowledge-mode=auto`** — Spring acusa automáticamente según resultado (OK = ACK; excepción = no ACK). *En el proyecto:* inventory y shipping.
- **`AUTO_ACKNOWLEDGE`** — Modo JMS clásico: ACK al recibir. *En el proyecto:* consumidor del reply síncrono (`StockCheckClient`).

---

## 4. Seguridad y autenticación

- **JWT (JSON Web Token)** — Token firmado con claims (usuario, rol, expiración). *En el proyecto:* emitido por identity-service, validado por el gateway.
- **HS256** — Algoritmo de firma JWT basado en clave **simétrica** compartida (HMAC-SHA256). *En el proyecto:* `NimbusJwtDecoder` con `MacAlgorithm.HS256`.
- **Claims** — Datos dentro del JWT: `sub`, `role`, `exp`, `iat`, `userId`.
- **Issuer** — Emisor esperado del token. *En el proyecto:* `smartlogix-identity-service`.
- **OAuth2 Resource Server** — Rol de Spring Security que **valida** tokens de acceso. *En el proyecto:* el gateway.
- **Bearer token** — Token enviado en `Authorization: Bearer <jwt>`.
- **SAS (Shared Access Signature)** — Autenticación de Service Bus: **usuario = nombre de la policy**, **clave = primary key**. *Policies:* `smartlogix-app`, `smartlogix-admin`.
- **Policy (regla de acceso)** — Conjunto de permisos (Send/Listen/Manage) sobre el namespace. *En el proyecto:* `smartlogix-app` (app), `smartlogix-admin` (admin).
- **RBAC (roles)** — Control por roles. *En el proyecto:* `ADMIN`, `OPERATOR`, `VIEWER`.
- **2FA / TOTP** — Segundo factor con códigos temporales (RFC 6238). *En el proyecto:* `TotpService`, flujo `/api/auth/2fa`.
- **Secret / variable de entorno** — Dato sensible inyectado (no hardcodeado). *En el proyecto:* `.env` + secrets de GitHub Actions.
- **CSRF** — Ataque de falsificación de petición; se **desactiva** en APIs stateless con JWT.

---

## 5. Persistencia y datos

- **PostgreSQL** — Motor de base de datos relacional. *En el proyecto:* un contenedor por servicio.
- **Database-per-service** — Cada microservicio con su propia BD (`smartlogix_order_db`, etc.).
- **JPA / Hibernate** — ORM de Java: mapea objetos ↔ tablas.
- **Entidad (`@Entity`)** — Clase mapeada a una tabla. *P.ej.:* `OrderEntity`, `StockEntity`, `CustomerEntity`.
- **Repositorio (`@Repository`)** — Acceso a datos (Spring Data JPA). *P.ej.:* `OrderRepository`.
- **Transacción (`@Transactional`)** — Unidad atómica: todo o nada. *En el proyecto:* `OrderServiceImpl.create/confirm`.
- **Migración de esquema** — Evolución del esquema (Flyway/Liquibase) — *no usado;* aquí JPA genera/actualiza el esquema.
- **Seed data** — Datos iniciales de demo. *En el proyecto:* `DataSeeder` (clientes, productos, bodegas, usuarios/roles).

---

## 6. Spring Framework / Java

- **Spring Boot** — Framework que autoconfigura la aplicación. *Versión:* 4.0.6, Java 21.
- **Inyección de dependencias (DI / IoC)** — Spring provee las dependencias. *En el proyecto:* `@RequiredArgsConstructor` (Lombok) + campos `final`.
- **`@Component` / `@Service` / `@Configuration`** — Estereotipos de Spring para registrar beans.
- **`@Bean`** — Método que define un componente administrado por Spring (p.ej. `ConnectionFactory`, `JmsTemplate`).
- **`@Configuration`** — Clase de configuración. *En el proyecto:* `ServiceBusConfig`.
- **`@Value`** — Inyecta un valor de propiedad (`application.properties`).
- **`@Transactional`** — Envuelve el método en una transacción de BD.
- **`application.properties`** — Configuración externalizada por servicio (host, credenciales vía env, destinos AMQP).
- **Spring Actuator** — Endpoints de salud/métricas. *En el proyecto:* `/actuator/health` (200 = UP).
- **Jackson** — Librería JSON (serializa eventos/DTOs a JSON). *En el proyecto:* Jackson 3 (`ObjectMapper`).
- **Bean Validation** — Validación de DTOs. *En el proyecto:* `@NotBlank`, `@NotNull`, `@Positive`.
- **Lombok** — Genera boilerplate (`@Getter`, `@Builder`, `@RequiredArgsConstructor`, `@Slf4j`).
- **Record (Java)** — Clase inmutable para datos. *En el proyecto:* DTOs de mensajería (`StockCheckRequest`, `StockCheckResponse`).
- **Maven** — Herramienta de build (gestiona dependencias y empaqueta el `.jar`).

---

## 6-bis. Java / JMS específico de mensajería

- **`JmsConnectionFactory`** — Fábrica de conexiones AMQP 1.0 (Qpid) hacia `amqps://<host>`.
- **`Message`, `BytesMessage`** — Representación cruda del mensaje AMQP; el cuerpo JSON viaja como bytes (JMS 3.1 ya no tiene `setObject`).
- **`Destination`, `JmsTopic`, `JmsQueue`** — Tipos de destino; AMQP distingue topic de queue.
- **`DestinationResolver`** — Traduce el nombre del destino a `JmsTopic`/`JmsQueue` (Spring solo entiende `topic://`/`queue://`).
- **`JmsListenerContainerFactory`** — Configura concurrencia, transacción y manejo de errores de los `@JmsListener`.

---

## 7. Infraestructura cloud y DevOps

- **Docker** — Contenerización de cada servicio.
- **Docker Compose** — Orquestación local/VM de los contenedores (`docker-compose.yml`).
- **Azure Container Registry (ACR)** — Registro de imágenes Docker. *En el proyecto:* `smartlogix2026acr` (tier Basic).
- **Azure Service Bus** — Broker de mensajería gestionado; **namespace** = contenedor de colas/topics.
- **Azure VM** — Máquina virtual donde corre el stack (`p44`, `Standard_D2s_v4`).
- **Deallocate / Deallocated** — Apagar la VM liberándola del host (no factura compute; sí el disco/IP).
- **SAS / Connection string** — Cadena con endpoint + policy + key para conectar al namespace.
- **CI/CD** — Integración/entrega continua. *En el proyecto:* GitHub Actions (`.github/workflows/deploy.yml`).
- **GitHub Actions / Secrets** — Automatización y almacenamiento de credenciales (`VM_HOST`, `VM_SSH_KEY`, `AZURE_CREDENTIALS`).
- **Orquestación (build → push → deploy)** — El pipeline compila, sube imágenes a ACR y hace `docker compose up` en la VM.
- **AMQP 1.0** — Protocolo binario de mensajería usado por Service Bus (`amqps://` = AMQP sobre TLS).
- **TLS / AMQPS** — Cifrado en tránsito.

---

## 8. Observabilidad y monitoreo

- **Spring Boot Actuator** — Endpoints de salud/métricas (`/actuator/health` → `UP`). *Usado en la validación E2E.*
- **Health check** — Comprobación de disponibilidad de un servicio.
- **Log Analytics workspace** — Almacén de logs (Azure). *En el proyecto:* `log-smartlogix` (retención 30 días).
- **Log estructurado** — Log con contexto (`orderId`, `orderNumber`, `reason`) que sirve de señal para alertas. *En el proyecto:* `DeadLetterConsumer`.
- **Métrica** — Serie temporal de Azure Monitor. *En el proyecto:* `ActiveMessages`, `DeadletteredMessages`, `ServerErrors`.
- **Alert rule (regla de alerta)** — Condición sobre una métrica que dispara una alerta. *En el proyecto:* `alert-sb-deadletter` (>0), `alert-sb-servererrors` (>0), `alert-sb-backlog` (>50).
- **Action Group** — Destinos de notificación de una alerta. *En el proyecto:* `ag-smartlogix-alerts` → email `lu.tasso@duocuc.cl`.
- **Severity (severidad)** — Prioridad de la alerta (1 = crítica, 2 = error, …).
- **Evaluation frequency / window size** — Cada cuánto se evalúa y sobre qué ventana. *En el proyecto:* **PT1M** / **PT5M**.

---

## 9. Abreviaturas rápidas

| Sigla | Significado |
|---|---|
| **AMQP** | Advanced Message Queuing Protocol |
| **JMS** | Java Message Service |
| **DLQ / DLX** | Dead Letter Queue / Dead Letter Exchange |
| **TTL** | Time To Live |
| **ACK** | Acknowledgement (acuse) |
| **JWT** | JSON Web Token |
| **SAS** | Shared Access Signature |
| **ACR** | Azure Container Registry |
| **CI/CD** | Continuous Integration / Continuous Delivery |
| **RBAC** | Role-Based Access Control |
| **TOTP** | Time-based One-Time Password |
| **DTO** | Data Transfer Object |
| **RPC** | Remote Procedure Call |
| **API** | Application Programming Interface |
| **Actuator** | Módulo de Spring Boot para health/metrics |
