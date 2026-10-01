# Backend SmartLogix

El backend se compone de cinco servicios Spring Boot 4 con Java 21. Cada servicio tiene su propia base de datos cuando aplica y expone Actuator Health.

## Servicios

| Servicio | Puerto | Responsabilidad |
| --- | ---: | --- |
| api-gateway | 8080 | Entrada unica, seguridad, rutas y health agregado |
| identity-service | 8084 | Login, JWT, usuario autenticado y gestion de usuarios |
| inventory-service | 8081 | Productos, bodegas, stock y movimientos |
| order-service | 8082 | Clientes, pedidos, items y estados |
| shipping-service | 8083 | Envios, transportistas, tracking y estados |

## Endpoints principales

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/system/health`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/me/password`
- `GET /api/inventory/products`
- `GET /api/inventory/stock/movements`
- `GET /api/inventory/warehouses`
- `GET /api/orders`
- `POST /api/orders`
- `PATCH /api/orders/{id}/status`
- `GET /api/shipping/shipments`
- `PATCH /api/shipping/shipments/{id}/assign-carrier`
- `GET /api/shipping/carriers`

## Seguridad

Los servicios usan JWT Bearer. Las rutas de health, Swagger y login son publicas. El resto requiere autenticacion y permisos por rol aplicados en Gateway y servicios.

## Swagger

Cada servicio expone:

- `/swagger-ui/index.html`
- `/v3/api-docs`

La documentacion incluye titulo, descripcion, modelos DTO y esquema Bearer JWT.

## Health checks

- Health local por servicio: `/actuator/health`
- Health agregado: `GET http://localhost:8080/api/system/health`

El health agregado informa `UP`, `DEGRADED` o `DOWN` por servicio con mensajes pensados para la UI.

## Variables relevantes

Los `application.properties` de cada servicio definen puertos, conexion a PostgreSQL, RabbitMQ y secreto JWT compartido. No guardar secretos reales en el repositorio.

## Tests

Cada servicio mantiene tests unitarios o de contexto. Se agregaron pruebas para:

- Health agregado del Gateway.
- Reglas de usuarios y contrasenas en Identity.
- Flujos existentes de inventario, pedidos y envios.
