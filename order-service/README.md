# SmartLogix - order-service

Microservicio de pedidos para el MVP academico SmartLogix. Gestiona clientes,
pedidos, items de pedido, estados e historial de trazabilidad.

Este servicio no autentica usuarios ni genera tokens. La autenticacion vive en
`identity-service`, y `order-service` valida JWT como Resource Server.

## Configuracion

- Puerto: `8082`
- Base de datos: `smartlogix_orders_db`
- PostgreSQL local Docker: `localhost:5434`
- Usuario: variable `SMARTLOGIX_DB_USERNAME` (por defecto, `smartlogix`)
- Password: variable obligatoria `SMARTLOGIX_DB_PASSWORD`
- Azure Service Bus (AMQP 1.0): host/policy SAS por entorno
- Topico de eventos: `smartlogix.orders.topic`
- Colas de stock check: `smartlogix.stock-check.req` / `smartlogix.stock-check.reply`

Las credenciales se configuran fuera de Git mediante variables de entorno.

## Ejecutar

```powershell
.\mvnw.cmd spring-boot:run
```

## Tests

```powershell
.\mvnw.cmd test
```

## Seguridad JWT

Todas las rutas `/api/orders/**` requieren token JWT.

El token se obtiene desde el gateway:

```http
POST http://localhost:8080/api/auth/login
```

Body:

```json
{
  "email": "admin@smartlogix.cl",
  "password": "<SMARTLOGIX_SEED_ADMIN_PASSWORD>"
}
```

Usar el token en Postman:

```http
Authorization: Bearer <accessToken>
```

Roles:

- `ADMIN`: acceso completo.
- `OPERATOR`: puede crear y modificar pedidos.
- `VIEWER`: solo consultas `GET`.

## Endpoints principales

Clientes:

- `GET /api/orders/customers`
- `GET /api/orders/customers/{id}`
- `POST /api/orders/customers`
- `PUT /api/orders/customers/{id}`
- `PATCH /api/orders/customers/{id}/deactivate`

Pedidos:

- `GET /api/orders`
- `GET /api/orders/{id}`
- `GET /api/orders/number/{orderNumber}`
- `GET /api/orders/customer/{customerId}`
- `GET /api/orders/{id}/history`
- `POST /api/orders`
- `PATCH /api/orders/{id}/confirm`
- `PATCH /api/orders/{id}/cancel`
- `PATCH /api/orders/{id}/status`

## Ejemplo: crear cliente

```http
POST http://localhost:8080/api/orders/customers
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "fullName": "Cliente Demo",
  "email": "cliente.demo@demo.cl",
  "phone": "+56933333333",
  "address": "Santiago"
}
```

## Ejemplo: crear pedido

```http
POST http://localhost:8080/api/orders
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "customerId": 1,
  "notes": "Pedido demo",
  "items": [
    {
      "productId": 1,
      "warehouseId": 1,
      "sku": "SKU-001",
      "productName": "Notebook Lenovo",
      "unitPrice": 650000,
      "quantity": 1
    }
  ]
}
```

## Ejemplo: confirmar pedido

```http
PATCH http://localhost:8080/api/orders/1/confirm
Authorization: Bearer <token>
```

Al confirmar un pedido en estado `CREATED`, el servicio cambia el estado a
`CONFIRMED`, registra historial y publica `OrderCreatedEvent` en el topico
`smartlogix.orders.topic` de Azure Service Bus (tras verificar la disponibilidad
de stock mediante request/reply síncrono contra `inventory-service`).

## Validacion rapida

```http
GET http://localhost:8082/actuator/health
```

```http
GET http://localhost:8080/api/orders/customers
Authorization: Bearer <token>
```
