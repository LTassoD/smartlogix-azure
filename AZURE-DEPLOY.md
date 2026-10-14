# SmartLogix — Despliegue en Azure

Este repositorio es una **copia aislada** del repositorio original
(`felipeflores-m/SmartLogix`). El original **no se modifica**; aquí viven
los cambios de adaptación a Azure:

- Los ajustes de las actividades del semestre (guías 2.1.x y 2.2.x):
  segunda routing key `order.cancelled` + `OrderCancelledEvent`,
  DLX/DLQ con TTL y retry con backoff, publisher confirms y comentarios
  en español.
- La adaptación de la mensajería: RabbitMQ fue sustituido por **Azure
  Service Bus** (AMQP 1.0 / Qpid JMS). Los listeners usan `@JmsListener`
  en vez de `@RabbitListener`.
- El microservicio extra **`sb-admin-service`** (puerto 8085) que
  administra colas, tópicos y suscripciones vía REST.
- Imágenes multi-stage sin usuario root, `docker-compose.yml` con
  volúmenes y healthchecks, y el pipeline de GitHub Actions.

## Infraestructura desplegada

| Recurso | Nombre |
| --- | --- |
| Grupo de recursos | `rg-smartlogix-aca` |
| Registry | `smartlogix2026acr.azurecr.io` |
| Namespace Service Bus | `sb-smartlogix-ns` (Standard, `smartlogix-app` con Send/Listen y `smartlogix-admin` con Manage/Send/Listen) |
| VM Ubuntu 22.04 | `p44` (`20.121.31.149`, 2 vCPU / 7,8 GB) |
| Directorio de deploy | `/opt/smartlogix` (`docker-compose.yml` + `.env`) |

## Topología de mensajería

- **Colas**: `smartlogix.stock-check.req`, `smartlogix.stock-check.reply`.
- **Tópico**: `smartlogix.orders.topic` con suscripciones:
  - `inventory-sub` (filtro SQL `eventType = 'order.created'`).
  - `shipping-created-sub` (recibe `OrderCreatedEvent` → crea el envío).
  - `shipping-cancelled-sub` (recibe `OrderCancelledEvent`).
  - Cada suscripción tiene DLQ nativa `/$deadletterqueue`.

Deploy a mano (verificado):

```bash
# build + push de cada imagen (tag :azure) al ACR
docker login smartlogix2026acr.azurecr.io
docker build -t smartlogix2026acr.azurecr.io/smartlogix/<servicio>:azure <servicio>
docker push smartlogix2026acr.azurecr.io/smartlogix/<servicio>:azure
# en la VM (password auth por SFTP; el root web está chroot a /home/azureuser)
# subir docker-compose.yml al home y luego:
sudo cp /home/azureuser/docker-compose.yml /opt/smartlogix/
cd /opt/smartlogix && docker compose pull && docker compose up -d
# redeploy de un servicio puntual
cd /opt/smartlogix && docker compose up -d order inventory shipping
```

El `.env` de la VM define secretos reales: credenciales de Service Bus
(SAS), clave/emisor JWT, password de las bases Postgres por servicio,
cifrado 2FA, `SMARTLOGIX_SEED_ENABLED=true` y las URLs de la red compose
(`http://gateway:8080`, `jdbc:postgresql://postgres-<svc>:5432/...`).
Para el `sb-admin-service` se usa una policy con derecho **Manage**
(`SMARTLOGIX_SERVICEBUS_ADMIN_KEY`); las colas/tópicos de negocio usan la
policy `smartlogix-app` solo con Send/Listen.

## GitHub Actions

El workflow `.github/workflows/deploy.yml` (rama `azure-deploy`) construye
y publica las 7 imágenes al ACR y despliega en la VM vía SSH. Requiere
los secrets del repositorio:

- `AZURE_CREDENTIALS`: service principal con `acrpush` sobre el ACR.
- `VM_HOST`, `VM_USER`, `VM_SSH_KEY`: acceso SSH a la VM.
- `REGISTRY`, `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`.

Para el entorno local la policy `smartlogix-app` es suficiente; el
endpoint de administración REST exige Manage, por eso `sb-admin-service`
usa una policy propia.

## Monitoreo

- Alertas en `rg-smartlogix-aca` (service health, críticos de Service Bus:
  dead-lettered messages, backlog y server errors) dirigidas al action
  group `ag-smartlogix-alerts`.
- Healthchecks por servicio: `/actuator/health`, frontend en `:80`,
  sb-admin en `:8085`.

## Rocket de verificación E2E (probado en la VM)

1. `POST /api/auth/login` con `admin@smartlogix.cl` → JWT.
2. Stock inicial: `POST /api/inventory/stock/movements` (IN).
3. `POST /api/orders` crea la orden; `PATCH /api/orders/{id}/confirm`
   dispara el stock check síncrono y publica el evento.
4. En logs: `inventory-service` (stock check request/reply + consumo de
   `order.created` y decremento) y `shipping-service` (creación del
   envío `PENDING_ASSIGNMENT`).