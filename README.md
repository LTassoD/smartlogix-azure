# SmartLogix

SmartLogix es un sistema academico de gestion logistica para inventario, pedidos, envios, transportistas, bodegas, reportes y configuracion administrativa. La aplicacion esta organizada como frontend React y microservicios Spring Boot protegidos con JWT.

> **Rama `rabbitmq`:** variante que implementa la mensajeria exigida por la Evaluacion Parcial 2 con **RabbitMQ** (cluster de 2 nodos, exchanges `direct` y `topic`, colas con DLQ, consumidores `@RabbitListener` y microservicio administrador REST). La rama `azure-deploy` mantiene la version desplegada en Azure con Service Bus.

## Arquitectura

- `frontend`: React, TypeScript, Vite, Tailwind, shadcn-style UI y Recharts.
- `api-gateway`: entrada unica del frontend y health agregado del sistema.
- `identity-service`: autenticacion, sesion, roles y administracion de usuarios.
- `inventory-service`: productos, stock, bodegas y movimientos.
- `order-service`: clientes, pedidos y estados.
- `shipping-service`: envios, transportistas y asignaciones.
- `rabbit-admin-service`: microservicio de administracion de la infraestructura de mensajeria RabbitMQ (colas, exchanges y bindings) expuesta como REST.
- Infraestructura local: PostgreSQL por servicio y un cluster **RabbitMQ de 2 nodos** como broker de mensajeria (exchange `direct` `smartlogix.orders.exchange` y exchange `topic` `smartlogix.orders.topic.exchange`).

## Mensajeria y eventos

SmartLogix usa RabbitMQ (AMQP 0-9-1 con Spring AMQP):

- **Exchange direct**: `smartlogix.orders.exchange`. `order-service` publica con routing keys `order.created` y `order.cancelled`; las colas de `inventory-service` y `shipping-service` se enlazan segun su routing key.
- **Exchange topic**: `smartlogix.orders.topic.exchange`, con bindings por patron `order.#` para demostrar el enrutamiento por comodin.
- **Colas con DLQ**: `smartlogix.inventory.order-created.queue`, `smartlogix.shipping.order-created.queue` y `smartlogix.shipping.order-cancelled.queue`, cada una con `x-dead-letter-exchange` hacia su DLX/DLQ (`smartlogix.inventory.dlq`, `smartlogix.shipping.dlq`). Los reintentos usan backoff (1s, 2s, 4s) y `default-requeue-rejected=false`.
- **Consumidores** `@RabbitListener` agrupados por dominio en `infrastructure/messaging/consumer`, mas un `DeadLetterConsumer` por servicio que audita la DLQ (header `x-death`).
- **Administracion REST**: `rabbit-admin-service` (puerto 8086) permite crear/borrar colas, exchanges y bindings (`POST/DELETE /api/admin/queues`, `/exchanges`, `/bindings`).

El detalle completo (topologia, cluster y mapeo a la rubrica) esta en [Implementacion RabbitMQ](docs/IMPLEMENTACION_RABBITMQ.md).

## Requisitos

- Java 21
- Node.js 22.12 o posterior
- Docker Desktop
- Maven Wrapper incluido en cada microservicio

## Configuración segura obligatoria

SmartLogix no incluye passwords, claves JWT ni claves de cifrado utilizables. Antes del primer arranque:

```powershell
Copy-Item .env.example .env
```

Completa los campos secretos vacíos de `.env` con valores aleatorios propios. El archivo está ignorado por Git y Docker Compose lo carga antes de iniciar los servicios. El arranque se detiene si falta la clave JWT, su emisor, el cifrado 2FA o una credencial de infraestructura requerida.

Para una base nueva, el seed de Identity está desactivado por defecto. Actívalo solo en el `.env` local y define correos y passwords propios; no existen credenciales demo predeterminadas.

La generación exacta de secretos, el flujo TOTP y la demostración completa están en [Fortificación del login y 2FA](docs/SECURITY_2FA.md).

## Ejecutar con Docker

Con `.env` configurado, Docker Compose construye y levanta el frontend, los seis servicios Java y toda la infraestructura local (incluido el cluster RabbitMQ de 2 nodos):

```bash
docker compose up -d --build --wait --wait-timeout 300
docker compose ps
docker compose down
docker compose logs -f frontend
```

El frontend queda disponible en `http://localhost:5173`. Como alternativa, `start-smartlogix.bat` valida Docker y ejecuta el mismo arranque completo; `--dry-run` solo comprueba la configuración.

## Alternativa de desarrollo: ejecutar backend manual

Detén primero sus contenedores homólogos para liberar los puertos. Luego inicia cada servicio en una terminal:

```bash
cd identity-service && mvnw.cmd spring-boot:run
cd inventory-service && mvnw.cmd spring-boot:run
cd order-service && mvnw.cmd spring-boot:run
cd shipping-service && mvnw.cmd spring-boot:run
cd api-gateway && mvnw.cmd spring-boot:run
cd rabbit-admin-service && mvnw.cmd spring-boot:run
```

Puertos por defecto:

- API Gateway: `http://localhost:8080`
- Inventory: `http://localhost:8081`
- Orders: `http://localhost:8082`
- Shipping: `http://localhost:8083`
- Identity: `http://localhost:8084`
- Rabbit Admin: `http://localhost:8086`
- RabbitMQ Management: `http://localhost:15672`

## Ejecutar frontend manual

```bash
cd frontend
npm ci
npm run dev
```

## Swagger

- API Gateway: `http://localhost:8080/swagger-ui/index.html`
- Inventory: `http://localhost:8081/swagger-ui/index.html`
- Orders: `http://localhost:8082/swagger-ui/index.html`
- Shipping: `http://localhost:8083/swagger-ui/index.html`
- Identity: `http://localhost:8084/swagger-ui/index.html`
- Rabbit Admin API: `http://localhost:8086/api/admin`

Los documentos OpenAPI estan en `/v3/api-docs` en cada servicio.

## Tests

Frontend:

```bash
cd frontend
npm run lint
npm run build
npm run test
```

Backend por servicio:

```bash
cd identity-service && mvnw.cmd test
cd inventory-service && mvnw.cmd test
cd order-service && mvnw.cmd test
cd shipping-service && mvnw.cmd test
cd api-gateway && mvnw.cmd test
cd rabbit-admin-service && mvnw.cmd test
```

## Usuarios y roles

Los roles funcionales son:

- `ADMIN`: acceso completo, configuracion y exportacion.
- `OPERATOR`: operación diaria y configuración de su propia cuenta, sin administrar usuarios ni exportar reportes.
- `VIEWER`: lectura y configuración de su propia cuenta, sin acciones mutantes de negocio.

Identity solo crea usuarios semilla cuando `SMARTLOGIX_SEED_ENABLED=true` y cada cuenta tiene correo y password explícitos en el entorno. Mantén esta opción desactivada fuera de una base local nueva.

Cada usuario puede activar 2FA TOTP compatible con Google Authenticator, Microsoft Authenticator y Authy desde **Configuración > Mi cuenta**.

## Documentacion

- [Arquitectura](docs/ARCHITECTURE.md)
- [Frontend](docs/FRONTEND.md)
- [Backend](docs/BACKEND.md)
- [Roles y permisos](docs/ROLES_PERMISSIONS.md)
- [Docker](docs/DOCKER.md)
- [Despliegue en Azure (ACR, VM y GitHub Actions)](AZURE-DEPLOY.md)
- [Guía de implementación paso a paso en Azure](docs/IMPLEMENTACION_AZURE.md)
- [Testing](docs/TESTING.md)
- [API](docs/API.md)
- [Seguridad del login y 2FA TOTP](docs/SECURITY_2FA.md)
- [Implementacion RabbitMQ (cluster, exchanges y rubrica EP2)](docs/IMPLEMENTACION_RABBITMQ.md)

## Troubleshooting

- Si el frontend no puede iniciar sesion, confirma que `api-gateway` este en `http://localhost:8080`.
- Si una pagina muestra un servicio no disponible, revisa el health del microservicio correspondiente.
- Si Docker mantiene datos antiguos, ejecuta `docker compose down -v` solo cuando quieras reiniciar las bases locales.
- Si Swagger no carga, confirma que el servicio este levantado y revisa `/actuator/health`.
