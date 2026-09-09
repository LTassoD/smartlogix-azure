# SmartLogix - shipping-service

Microservicio de envios para el MVP academico SmartLogix. Gestiona envios,
transportistas, estados de despacho e historial logistico.

Este servicio no autentica usuarios ni genera tokens. La autenticacion vive en
`identity-service`, y `shipping-service` valida JWT como Resource Server.

## Configuracion

- Puerto: `8083`
- Base de datos: `smartlogix_shipping_db`
- PostgreSQL local Docker: `localhost:5435`
- Usuario: variable `SMARTLOGIX_DB_USERNAME` (por defecto, `smartlogix`)
- Password: variable obligatoria `SMARTLOGIX_DB_PASSWORD`
- RabbitMQ AMQP: `localhost:5672`
- Exchange consumido: `smartlogix.orders.exchange`
- Queue: `smartlogix.shipping.order-created.queue`
- Routing key: `order.created`

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

Todas las rutas `/api/shipping/**` requieren token JWT.

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

Usar el token:

```http
Authorization: Bearer <accessToken>
```

Roles:

- `ADMIN`: acceso completo.
- `OPERATOR`: puede crear, asignar y actualizar envios.
- `VIEWER`: solo consultas `GET`.

## Endpoints principales

Transportistas:

- `GET /api/shipping/carriers`
- `GET /api/shipping/carriers/{id}`
- `PATCH /api/shipping/carriers/{id}/availability`

Envios:

- `GET /api/shipping/shipments`
- `GET /api/shipping/shipments/{id}`
- `GET /api/shipping/shipments/number/{shipmentNumber}`
- `GET /api/shipping/shipments/order/{orderId}`
- `GET /api/shipping/shipments/status/{status}`
- `GET /api/shipping/shipments/{id}/history`
- `POST /api/shipping/shipments`
- `PATCH /api/shipping/shipments/{id}/assign-carrier`
- `PATCH /api/shipping/shipments/{id}/status`
- `PATCH /api/shipping/shipments/{id}/cancel`

## RabbitMQ

`shipping-service` consume el evento `OrderCreatedEvent` publicado por
`order-service` cuando se confirma un pedido.

- Exchange: `smartlogix.orders.exchange`
- Queue: `smartlogix.shipping.order-created.queue`
- Routing key: `order.created`

Al recibir el evento, crea un envio asociado al `orderId` en estado
`PENDING_ASSIGNMENT`. No modifica `order-service` ni accede a su base de datos.

## Factory Method

El patron Factory Method esta implementado en `infrastructure/carrier`.

- `CarrierAdapter`: contrato comun para transportistas.
- `ChilexpressCarrierAdapter`: tracking `CHX-`.
- `StarkenCarrierAdapter`: tracking `STK-`.
- `BlueExpressCarrierAdapter`: tracking `BLX-`.
- `CarrierFactory`: selecciona el adaptador correcto por codigo o elige un fallback disponible.

Esto simula la integracion con proveedores logisticos externos sin llamar APIs
reales, suficiente para el alcance del MVP academico.

## Fallback de transportista

Si se solicita un transportista no disponible (`simulatedAvailable=false`), el
servicio intenta seleccionar otro transportista activo y disponible.

Si no existe ningun transportista disponible, el envio queda en estado `FAILED`
con `fallbackReason` explicando la causa.

## Ejemplo: crear envio manual

```http
POST http://localhost:8080/api/shipping/shipments
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "orderId": 1,
  "orderNumber": "ORD-20260430-00001",
  "customerId": 1,
  "destinationAddress": "Av. Siempre Viva 123",
  "destinationCity": "Santiago"
}
```

## Ejemplo: asignar transportista

```http
PATCH http://localhost:8080/api/shipping/shipments/1/assign-carrier
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "carrierCode": "CHILEXPRESS",
  "destinationCity": "Santiago"
}
```

## Ejemplo: cambiar disponibilidad de transportista

```http
PATCH http://localhost:8080/api/shipping/carriers/1/availability
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "simulatedAvailable": false
}
```

## Validacion rapida

```http
GET http://localhost:8083/actuator/health
```

```http
GET http://localhost:8080/api/shipping/carriers
Authorization: Bearer <token>
```
