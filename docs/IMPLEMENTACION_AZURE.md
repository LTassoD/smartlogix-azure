# SmartLogix en Azure — Guía de implementación paso a paso

Documento para explicar a los compañeros **cómo se construyó y desplegó** SmartLogix
en Microsoft Azure, desde la infraestructura hasta el pipeline CI/CD y la mensajería
con **Azure Service Bus**. Está pensado para leerse de arriba hacia abajo, con los
comandos y decisiones reales que se tomaron.

> Reemplaza cualquier valor entre `<...>` por el valor real del entorno (están en el
> archivo `.env` de la VM y en los Secrets de GitHub). **Nunca** commitear claves.

---

## Índice

1. [Resumen general](#1-resumen-general)
2. [Arquitectura](#2-arquitectura)
3. [Requisitos previos](#3-requisitos-previos)
4. [Paso 1 — Infraestructura en Azure](#4-paso-1--infraestructura-en-azure)
5. [Paso 2 — Mensajería con Service Bus](#5-paso-2--mensajería-con-service-bus)
6. [Paso 3 — Código: microservicios y mensajería](#6-paso-3--código-microservicios-y-mensajería)
7. [Paso 4 — Contenerización con Docker](#7-paso-4--contenerización-con-docker)
8. [Paso 5 — Pipeline CI/CD con GitHub Actions](#8-paso-5--pipeline-cicd-con-github-actions)
9. [Paso 6 — Despliegue y verificación](#9-paso-6--despliegue-y-verificación)
10. [Paso 7 — Monitoreo y alertas](#10-paso-7--monitoreo-y-alertas)
11. [Problemas encontrados y solución](#11-problemas-encontrados-y-solución)
12. [Mapa de puertos y comandos útiles](#12-mapa-de-puertos-y-comandos-útiles)

---

## 1. Resumen general

SmartLogix es un sistema de gestión logística compuesto por **microservicios Spring Boot
4 / Java 21**, un **frontend React**, Postgres por servicio y **mensajería asíncrona**.

Originalmente la mensajería usaba RabbitMQ. La pauta pedía migrar el broker a un
**servicio gestionado en la nube**, y se optó por **Azure Service Bus (AMQP 1.0)**,
que además trae de fábrica:

- **Colas** (point-to-point).
- **Topics + Suscripciones** (publish/subscribe) con **filtros SQL**.
- **Dead Letter Queue (DLQ)** por entidad.
- **PeekLock** con *delivery count* (reintentos y envío a DLQ automáticos).

Aparte se agregó un microservicio nuevo, **`sb-admin-service`**, que administra
Service Bus por **API REST** (crear/borrar colas, tópicos, suscripciones y reglas),
usando el *Service Bus Administration SDK* de Azure.

Todo se empaqueta en **Docker** (build multi-stage, usuario no-root) y se despliega
en una **VM Linux** con **docker compose**, publicada por un **pipeline de GitHub
Actions** que construye las imágenes, las sube a **Azure Container Registry (ACR)**
y actualiza los contenedores por SSH.

---

## 2. Arquitectura

```
                        Navegador
                            │  http://<VM_IP>/  (y /api/** same-origin)
                            ▼
                 ┌──────────────────────┐
                 │  frontend (nginx)     │  :80
                 │  sirve la SPA y hace   │
                 │  proxy /api → gateway  │
                 └──────────┬───────────┘
                            │ /api/**
                            ▼
                 ┌──────────────────────┐
                 │  api-gateway (BFF)    │  :8080
                 └──┬───────┬───────┬────┘
        /api/auth/** │       │       │ /api/orders/**
                    │ /api/inventory/**     │ /api/shipping/**
                    ▼       ▼       ▼
              identity   inventory  order   shipping
               :8084      :8081     :8082   :8083
                    │       │         │       │
                    ▼       ▼         ▼       ▼
             postgres ×4 (volúmenes persistentes)

   order ──publica order.created/order.cancelled──►  TOPIC  smartlogix.orders.topic
                                                       ├─ inventory-sub   (SqlFilter eventType='order.created')
                                                       ├─ shipping-created-sub   (eventType='order.created')
                                                       └─ shipping-cancelled-sub (eventType='order.cancelled')

   order ──(sync request/reply)──►  cola smartlogix.stock-check.req
                                    cola smartlogix.stock-check.reply  ◄── inventory responde

   sb-admin (:8085) ──Azure SDK (policy admin)──►  administra colas/tópicos/suscripciones
```

**Puertos en la VM** (publicados en `docker-compose.yml`): `80` (frontend),
`8080` (gateway), `8081-8085` (servicios), Postgres interno (sin publicar).

---

## 3. Requisitos previos

- Cuenta de Azure (se usó *Azure for Students*) y **Azure CLI** (`az`).
- **Docker** (para builds locales opcionales).
- **Java 21** y **Maven** (los builds también ocurren en el pipeline).
- **Node 22 / npm** (frontend).
- Repositorio en **GitHub** con permiso para Actions y Secrets.

Variables que se usan durante toda la guía (ajústalas):

```bash
RG=rg-smartlogix-aca
LOCATION=eastus
ACR=smartlogix2026acr
SB_NS=sb-smartlogix-ns
VM=p44
```

---

## 4. Paso 1 — Infraestructura en Azure

### 4.1 Grupo de recursos

```bash
az group create -n $RG -l $LOCATION
```

### 4.2 Azure Container Registry (ACR)

```bash
az acr create -n $ACR -g $RG --sku Basic --admin-enabled false
```

Las imágenes se publican como `$ACR.azurecr.io/smartlogix/<servicio>:azure`.

### 4.3 Azure Service Bus — namespace y políticas

```bash
az servicebus namespace create -g $RG -n $SB_NS -l $LOCATION --sku Standard
```

Se crean **dos** políticas de acceso (reglas de autorización) para aplicar
**mínimo privilegio**:

| Política | Derechos | Usada por |
|---|---|---|
| `smartlogix-app` | Send, Listen | order, inventory, shipping (producen/consumen) |
| `smartlogix-admin` | Manage, Send, Listen | `sb-admin-service` (crea/borra entidades) |

```bash
# Policy de la aplicación (enviar/escuchar)
az servicebus namespace authorization-rule create \
  -g $RG --namespace-name $SB_NS \
  --name smartlogix-app --rights Send Listen

# Policy de administración (gestionar entidades)
az servicebus namespace authorization-rule create \
  -g $RG --namespace-name $SB_NS \
  --name smartlogix-admin --rights Manage Send Listen

# Obtener las claves (van al .env y a los Secrets; NO commitear)
az servicebus namespace authorization-rule keys list \
  -g $RG --namespace-name $SB_NS --name smartlogix-app   --query primaryKey -o tsv
az servicebus namespace authorization-rule keys list \
  -g $RG --namespace-name $SB_NS --name smartlogix-admin --query primaryKey -o tsv
```

> **Lección aprendida:** el microservicio `sb-admin` respondía **500** al crear una cola.
> El error real era un **404 enmascarado**: con una política sin derecho **Manage**,
> Service Bus devuelve "no existe el servicio en esa dirección". Al crear
> `smartlogix-admin` con **Manage** quedó resuelto.

### 4.4 Máquina virtual

```bash
az vm create -g $RG -n $VM \
  --image Ubuntu2404 \
  --size Standard_D2s_v4 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard
```

- **IP pública Standard (estática)** para que no cambie al apagar/encender.
- **Docker** se instala en la VM (script oficial `get.docker.com`).
- Directorio de despliegue: `/opt/smartlogix/` (contiene `docker-compose.yml` y `.env`).

### 4.5 Reglas de red (NSG)

En Azure las reglas del NSG son **deny por defecto**. Se habilitaron:

```bash
# SSH (para despliegue y administración)
az network nsg rule create -g $RG --nsg-name ${VM}NSG -n allow-ssh \
  --priority 1000 --protocol Tcp --destination-port-ranges 22 --access Allow

# HTTP público para el frontend
az network nsg rule create -g $RG --nsg-name ${VM}NSG -n allow-http \
  --priority 1040 --protocol Tcp --destination-port-ranges 80 --access Allow
```

> En la rúbrica local se abrían Postgres (5432-5435), RabbitMQ (5672/15672), etc.
> En Azure **solo se expone 80** (y 22 para administración): todo lo demás viaja por
> la red interna de Docker. Esto es más seguro y es lo correcto en producción.

---

## 5. Paso 2 — Mensajería con Service Bus

### 5.1 Entidades a crear

| Entidad | Tipo | Nombre | Rol |
|---|---|---|---|
| Tópico | Topic | `smartlogix.orders.topic` | eventos de pedido (pub/sub) |
| Suscripción | Subscription | `smartlogix.orders.topic/inventory-sub` | filtro `eventType='order.created'` |
| Suscripción | Subscription | `smartlogix.orders.topic/shipping-created-sub` | filtro `eventType='order.created'` |
| Suscripción | Subscription | `smartlogix.orders.topic/shipping-cancelled-sub` | filtro `eventType='order.cancelled'` |
| Cola | Queue | `smartlogix.stock-check.req` | request/reply — petición |
| Cola | Queue | `smartlogix.stock-check.reply` | request/reply — respuesta |

### 5.2 Cómo crearlas — tres caminos

**a) Por el Portal (más visual, en español):**

1. **Grupos de recursos** → `rg-smartlogix-aca` → `sb-smartlogix-ns`.
2. Menú **Entidades** → **Colas** / **Temas**.
3. Para crear: botón **+ Cola** / **+ Tema** → asignar **Nombre** → **Revisar y crear**.
4. Para ver mensajes: entrar a la entidad → **Explorador de Service Bus** →
   botón **Ver** (Peek). Ahí se ven *Mensajes activos* y la *Cola de mensajes no
   entregados (DLQ)*.

**b) Por CLI:**

```bash
# Colas (enableSession = false: ver sección 6.4)
az servicebus queue create -g $RG --namespace-name $SB_NS \
  -n smartlogix.stock-check.req --enable-session false
az servicebus queue create -g $RG --namespace-name $SB_NS \
  -n smartlogix.stock-check.reply --enable-session false

# Tópico
az servicebus topic create -g $RG --namespace-name $SB_NS -n smartlogix.orders.topic

# Suscripciones con filtro SQL
az servicebus topic subscription create -g $RG --namespace-name $SB_NS \
  --topic-name smartlogix.orders.topic -n inventory-sub
az servicebus topic subscription create -g $RG --namespace-name $SB_NS \
  --topic-name smartlogix.orders.topic -n shipping-created-sub
az servicebus topic subscription create -g $RG --namespace-name $SB_NS \
  --topic-name smartlogix.orders.topic -n shipping-cancelled-sub

# Regla/filtro por suscripción
az servicebus topic subscription rule create -g $RG --namespace-name $SB_NS \
  --topic-name smartlogix.orders.topic --subscription-name inventory-sub \
  -n inventory-filter --filter-sql-expression "eventType = 'order.created'"
```

**c) Por el propio `sb-admin-service` (API REST):** es el microservicio que pedía la
pauta. Ejemplos (puerto 8085):

```bash
# Crear cola
curl -X POST http://localhost:8085/api/admin/queues \
  -H "Content-Type: application/json" \
  -d '{"name":"mi.cola","requiresSession":false,"maxDeliveryCount":3}'

# Crear tópico
curl -X POST http://localhost:8085/api/admin/topics \
  -H "Content-Type: application/json" \
  -d '{"name":"mi.topic"}'

# Crear suscripción con filtro SQL
curl -X POST http://localhost:8085/api/admin/topics/mi.topic/subscriptions \
  -H "Content-Type: application/json" \
  -d '{"name":"mi-sub","sqlFilter":"eventType = '\''order.created'\''"}'

# Borrar
curl -X DELETE http://localhost:8085/api/admin/queues/mi.cola
```

### 5.3 Verificar desde la CLI

```bash
az servicebus queue list -g $RG --namespace-name $SB_NS \
  --query "[].{name:name,active:countDetails.activeMessageCount,dlq:countDetails.deadLetterMessageCount}" -o table

az servicebus topic subscription list -g $RG --namespace-name $SB_NS \
  --topic-name smartlogix.orders.topic \
  --query "[].{sub:name,active:countDetails.activeMessageCount,dlq:countDetails.deadLetterMessageCount}" -o table
```

---

## 6. Paso 3 — Código: microservicios y mensajería

### 6.1 Conexión AMQP 1.0 (Qpid JMS)

Cada servicio que usa Service Bus configura una `ConnectionFactory` **Qpid JMS**
contra el namespace, autenticando con **política + clave**:

```java
JmsConnectionFactory factory = new JmsConnectionFactory();
factory.setRemoteURI("amqps://" + host);        // sb-smartlogix-ns.servicebus.windows.net
factory.setUsername(policyName);                 // smartlogix-app (o smartlogix-admin)
factory.setPassword(policyKey);
```

Propiedades por entorno (ver `application.properties` de cada servicio):

```properties
smartlogix.servicebus.host=${SMARTLOGIX_SERVICEBUS_HOST:sb-smartlogix-ns.servicebus.windows.net}
smartlogix.servicebus.policy-name=${SMARTLOGIX_SERVICEBUS_POLICY:smartlogix-app}
smartlogix.servicebus.policy-key=${SMARTLOGIX_SERVICEBUS_KEY}
```

### 6.2 Publicar eventos en el topic (order-service)

La equivalencia con RabbitMQ es la clave para entender el código:

| RabbitMQ (antes) | Service Bus (ahora) |
|---|---|
| `DirectExchange` durable | **Topic** `smartlogix.orders.topic` |
| *routing key* `order.created` | propiedad JMS **`eventType`** (evaluada por SqlFilter) |
| `RabbitTemplate.convertAndSend` | `JmsTemplate` + `SessionCallback` |
| `@RabbitListener` | **`@JmsListener`** |
| cola propia + binding | **Subscription** propia + regla SQL |
| DLX + DLQ | **DLQ nativa** por entidad (`/$deadletterqueue`) |
| `x-message-ttl` | `default-message-time-to-live` |
| reintentos + `default-requeue-rejected=false` | **`max-delivery-count`** + PeekLock |

El publisher (resumido):

```java
jmsTemplate.execute(session -> {
    var destination = session.createTopic("amqps://" + host + "/smartlogix.orders.topic");
    try (var producer = session.createProducer(destination)) {
        BytesMessage message = session.createBytesMessage();
        message.writeBytes(objectMapper.writeValueAsBytes(event));
        message.setStringProperty("eventType", "order.created"); // ← imprescindible
        message.setStringProperty("orderNumber", orderNumber);
        producer.send(message);
    }
    return null;
});
```

> **Punto crítico:** en Service Bus el topic **no enruta solo**. Todas las
> suscripciones reciben el mensaje y **cada una filtra por propiedades**. Si el
> publisher **no** setea `eventType`, ningún filtro coincide y las suscripciones no
> reciben nada. (En RabbitMQ el tipo de evento iba en la routing key.)

### 6.3 Consumir eventos (`@JmsListener` sobre suscripciones)

```java
@JmsListener(destination = "${smartlogix.servicebus.inventory.subscription-destination}")
public void consume(Message message) throws JMSException {
    OrderCreatedEvent event = objectMapper.readValue(message.getBody(byte[].class), OrderCreatedEvent.class);
    inventoryOrderEventService.processOrderCreated(event);
}
```

Destinos (nótese la forma `/Subscriptions/<nombre>` y el esquema `amqps://`):

```properties
smartlogix.servicebus.inventory.subscription-destination=\
  amqps://${host}/smartlogix.orders.topic/Subscriptions/inventory-sub
smartlogix.servicebus.inventory.dead-letter-destination=\
  amqps://${host}/smartlogix.orders.topic/Subscriptions/inventory-sub/$deadletterqueue
```

**Semántica de ACK y reintentos** (lo que evalúa la rúbrica):

- `sessionTransacted=false` → Spring **no** hace ACK mientras el listener corre.
- Si el método retorna bien → **ACK** (mensaje completado).
- Si lanza excepción → el mensaje queda en **PeekLock**, el broker lo reentrega y
  suma `DeliveryCount`.
- Al superar `max-delivery-count=3` → Service Bus lo mueve solo a la **DLQ**.

### 6.4 Request/Reply síncrono (verificación de stock)

La pauta pedía **mensajes síncronos**. Se implementó con dos colas:

```
order-service ──(petición, property stockCheckId)──► smartlogix.stock-check.req
                                                          │
                                             inventory-service responde
                                                          ▼
order-service ◄──(respuesta, mismo stockCheckId)──── smartlogix.stock-check.reply
```

- `order-service` crea **primero** el consumidor de `.reply` y luego envía a `.req`
  (si enviara antes, la respuesta podría llegar sin consumidor).
- La **correlación** se hace por la propiedad `stockCheckId` (id único por llamada).
- Si no llega respuesta en `timeout-ms` (10 s), retorna `available=false` y **no**
  cuelga el pedido.
- **Importante:** las colas se crean con `enableSession=false` porque **Qpid JMS no
  admite receptores *sessionful*** (Service Bus exige el flag de sesiones y Qpid no
  expone opción para activarlo). Por eso NO se usan *Sessions* de Service Bus, sino
  correlación por propiedad. Con una sola instancia de `order-service` es correcto;
  a varias réplicas, la `.reply` se repartiría *round-robin* (habría que dar una cola
  de reply por réplica).

### 6.5 `sb-admin-service` (microservicio administrador)

- Spring WebFlux + **`azure-messaging-servicebus`** (`ServiceBusAdministrationAsyncClient`).
- Usa la política **`smartlogix-admin`** (derecho **Manage**).
- Endpoints REST bajo `/api/admin`:

| Método | Ruta | Acción |
|---|---|---|
| POST | `/api/admin/queues` | crear cola |
| DELETE | `/api/admin/queues/{name}` | borrar cola |
| POST | `/api/admin/topics` | crear tópico |
| DELETE | `/api/admin/topics/{name}` | borrar tópico |
| POST | `/api/admin/topics/{topic}/subscriptions` | crear suscripción (con SqlFilter) |
| DELETE | `/api/admin/topics/{topic}/subscriptions/{sub}` | borrar suscripción |
| POST | `/api/admin/topics/{topic}/subscriptions/{sub}/rules` | crear regla |
| DELETE | `/api/admin/topics/{topic}/subscriptions/{sub}/rules/{rule}` | borrar regla |

---

## 7. Paso 4 — Contenerización con Docker

### 7.1 Dockerfiles multi-stage + usuario no-root

Cada servicio Java usa el mismo patrón:

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -ntp dependency:go-offline
COPY src src
RUN ./mvnw -B -ntp package -DskipTests

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S smartlogix && adduser -S -G smartlogix smartlogix
WORKDIR /app
COPY --from=build --chown=smartlogix:smartlogix /workspace/target/*.jar app.jar
USER smartlogix
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

- **Multi-stage:** el JDK/Maven queda solo en la etapa de build; la imagen final usa
  JRE, mucho más liviana.
- **No-root:** se crea el usuario `smartlogix` y el proceso corre con él (lo pide la
  rúbrica de seguridad).

El **frontend** también es multi-stage: build con Node → servir estáticos con nginx
(usuario no-root) y proxy same-origin hacia el gateway:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
RUN addgroup -S smartlogix && adduser -S -G smartlogix smartlogix \
    && chown -R smartlogix:smartlogix /var/cache/nginx /var/run /etc/nginx /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY start-nginx.sh /start-nginx.sh
RUN chmod +x /start-nginx.sh
COPY --from=build --chown=smartlogix:smartlogix /app/dist /usr/share/nginx/html
USER smartlogix
EXPOSE 80
CMD ["/start-nginx.sh"]
```

> En producción `VITE_API_BASE_URL` queda **vacío** → el frontend usa rutas
> **same-origin** (`/api/...`) y nginx hace de proxy al gateway. Así **no hay CORS**.

### 7.2 `docker-compose.yml` (en la VM)

- **14 servicios**: `frontend`, `gateway`, `identity`, `order`, `inventory`,
  `shipping`, `sb-admin` y **4 Postgres** + sus **volúmenes**, todos en la red
  `smartlogix-net` (bridge).
- **Volúmenes con nombre** para persistir datos de Postgres entre reinicios.
- **`healthcheck`** en cada Postgres (`pg_isready`); los servicios esperan con
  `depends_on: condition: service_healthy`.
- **Credenciales y claves por variables de entorno** (`.env` en la VM), nunca en el
  compose: `SMARTLOGIX_DB_PASSWORD`, `SMARTLOGIX_JWT_SECRET`,
  `SMARTLOGIX_SERVICEBUS_KEY`, `SMARTLOGIX_SERVICEBUS_ADMIN_KEY`, etc.
- `sb-admin` apunta a la política `smartlogix-admin` con su clave.

Arranque:

```bash
cd /opt/smartlogix
docker compose pull
docker compose up -d
docker compose ps
```

---

## 8. Paso 5 — Pipeline CI/CD con GitHub Actions

Archivo: `.github/workflows/deploy.yml`. Se dispara en **push** a las ramas
`deploy`/`azure-deploy` y también **manualmente** (`workflow_dispatch`).

```yaml
on:
  push:
    branches: [deploy, azure-deploy]
  workflow_dispatch:

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true
```

### 8.1 Job `build-and-push`

1. `actions/checkout@v4`.
2. `actions/setup-java@v4` (JDK 21, caché Maven).
3. `azure/login@v2` con el secreto `AZURE_CREDENTIALS` (Service Principal).
4. `az acr login --name <ACR>`.
5. Por cada servicio Java: `mvn package -DskipTests` → `docker build` →
   `docker push $ACR/smartlogix/<servicio>:azure`.
6. Frontend: `docker build` → `docker push`.

### 8.2 Job `deploy` (necesita build-and-push)

1. `appleboy/scp-action` sube el `docker-compose.yml` a la VM (`/tmp/smartlogix`).
2. `appleboy/ssh-action` se conecta por SSH y ejecuta:

```bash
sudo cp /tmp/smartlogix/docker-compose.yml /opt/smartlogix/
cd /opt/smartlogix
docker compose pull
docker compose up -d
docker system prune -f
```

> **Concurrency:** sin el bloque `concurrency`, dos pushes seguidos lanzaban dos
> deploys en paralelo y `docker compose up` + `docker prune` chocaban
> (*"a prune operation is already running"*). Con `cancel-in-progress: true` se
> cancela el run anterior.

### 8.3 Secrets del repositorio (Settings → Secrets and variables → Actions)

| Secreto | Contenido |
|---|---|
| `AZURE_CREDENTIALS` | JSON del Service Principal (ver abajo) |
| `VM_HOST` | IP pública de la VM (`20.121.31.149`) |
| `VM_USER` | `azureuser` |
| `VM_SSH_KEY` | llave **privada** ed25519 para SSH |

**Service Principal** para el pipeline (mínimo privilegio: `AcrPush` sobre el ACR):

```bash
az ad sp create-for-rbac --name sp-smartlogix-pipeline \
  --scopes $(az acr show -n $ACR -g $RG --query id -o tsv) \
  --role AcrPush
```

Eso devuelve `appId`, `password`, `tenant`; con ellos se arma `AZURE_CREDENTIALS`:

```json
{
  "clientId": "<appId>",
  "clientSecret": "<password>",
  "subscriptionId": "<subscriptionId>",
  "tenantId": "<tenant>"
}
```

**Llave SSH** (par ed25519) para el repo; la pública se instala en la VM:

```bash
ssh-keygen -t ed25519 -f smartlogix_pipeline -N ""
# pública → ~/.ssh/authorized_keys de azureuser en la VM
```

---

## 9. Paso 6 — Despliegue y verificación

### 9.1 Flujo de despliegue

```
git push (azure-deploy)  →  GitHub Actions  →  build & push a ACR  →  SSH a la VM
                                                                       └─ docker compose pull/up
```

Al terminar: `docker compose ps` debe mostrar **11 contenedores** `Up`
(7 servicios + 4 Postgres).

### 9.2 Verificación E2E (para la demo)

```bash
# 1) Estado del sistema (proxy same-origin del frontend)
curl http://<VM_IP>/api/system/health

# 2) Login (JWT)
curl -X POST http://<VM_IP>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smartlogix.cl","password":"Admin1234"}'

# 3) Cargar stock (IN)
curl -X POST http://<VM_IP>/api/inventory/stock/movements \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"productId":4,"warehouseId":3,"type":"IN","quantity":10,"reference":"E2E-INIT"}'

# 4) Crear y confirmar un pedido → dispara stock check (sync) y order.created (async)
curl -X POST http://<VM_IP>/api/orders -H "Authorization: Bearer <TOKEN>" ...
curl -X PATCH http://<VM_IP>/api/orders/<ID>/confirm -H "Authorization: Bearer <TOKEN>"
```

Qué debe observarse en los logs (`docker compose logs`):

- `order`: stock check request/reply OK; luego `order.created` publicado.
- `inventory`: `OrderCreatedEvent received in inventory` → baja el stock.
- `shipping`: `OrderCreatedEvent received in shipping` → crea el despacho.

Y en el **Explorador de Service Bus** del portal: las colas y suscripciones con
`Active = 0` y `DLQ = 0` tras el flujo feliz.

---

## 10. Paso 7 — Monitoreo y alertas

- Cada servicio expone **Actuator** (`/actuator/health`, `/actuator/info`) y el
  gateway agrega `/api/system/health`.
- En Azure se puede crear un **Action Group** y alertas (costo, disponibilidad) para
  cumplir la rúbrica; se dejó configurado sin requerir correo.
- Recomendado además: métricas de Service Bus (mensajes activos, DLQ) en
  **Azure Monitor**.

---

## 11. Problemas encontrados y solución

| Síntoma | Causa raíz | Solución |
|---|---|---|
| Ningún mensaje llegaba a las suscripciones | El publisher no seteaba la propiedad `eventType`; el topic no enruta solo | Setear `eventType` en cada mensaje y usar `SqlFilter` por suscripción |
| `amqp:not-found` / host duplicado | A los destinos Qpid les faltaba el esquema `amqps://` | Anteponer `amqps://` a **todos** los destinos (order, inventory, shipping) |
| `sb-admin` devolvía 500 con "No service is hosted at the specified address" | El error era un **404 enmascarado**: la política no tenía **Manage** | Crear política `smartlogix-admin` con **Manage** y usarla en `sb-admin` |
| "It is not possible for an entity that requires sessions to create a non-sessionful message receiver" | Qpid JMS no admite receptores *sessionful* | Crear `.req`/`.reply` con `enableSession=false` y correlacionar por propiedad |
| El frontend llamaba a `localhost:8080` | `VITE_API_BASE_URL` vacío caía al *fallback* de desarrollo | En producción, base vacía → **same-origin** (`""`); nginx hace proxy `/api` |
| `docker compose up` + `prune` en paralelo fallaban | Dos runs de CI concurrentes | `concurrency` con `cancel-in-progress: true` |
| No se podía abrir `http://<VM_IP>` | El NSG no tenía regla para el puerto 80 | Agregar regla `allow-http` (prioridad 1040, puerto 80) |
| Push rechazado por Actions | El token OAuth no tenía scope `workflow` | Usar un token con scopes `repo` + `workflow` |

---

## 12. Mapa de puertos y comandos útiles

| Servicio | Puerto | URL local (VM) |
|---|---|---|
| frontend | 80 | `http://<VM_IP>/` |
| api-gateway | 8080 | `http://<VM_IP>:8080/actuator/health` |
| inventory-service | 8081 | `/api/inventory/**` (vía gateway) |
| order-service | 8082 | `/api/orders/**` |
| shipping-service | 8083 | `/api/shipping/**` |
| identity-service | 8084 | `/api/auth/**` |
| sb-admin-service | 8085 | `/api/admin/**` |
| Postgres (×4) | 5432 interno | no publicado |

```bash
# Estado de contenedores
docker compose ps

# Logs de un servicio
docker compose logs -f order

# Reiniciar solo un servicio
docker compose up -d order

# Acceder a las entidades de Service Bus
az servicebus queue list -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns -o table
az servicebus topic subscription list -g rg-smartlogix-aca \
  --namespace-name sb-smartlogix-ns --topic-name smartlogix.orders.topic -o table
```

---

### Créditos / notas finales

- Broker: **Azure Service Bus (AMQP 1.0)** — reemplaza a RabbitMQ.
- Cliente AMQP: **Apache Qpid JMS**.
- Admin SB: **Azure Service Bus Administration SDK**.
- Orquestación local/VM: **docker compose**.
- CI/CD: **GitHub Actions** → **ACR** → **VM** por SSH.
