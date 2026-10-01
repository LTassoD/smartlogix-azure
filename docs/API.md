# API SmartLogix

La API se consume normalmente a traves del Gateway en `http://localhost:8080`.

## Swagger

| Servicio | Swagger | OpenAPI |
| --- | --- | --- |
| API Gateway | `http://localhost:8080/swagger-ui/index.html` | `http://localhost:8080/v3/api-docs` |
| Inventory | `http://localhost:8081/swagger-ui/index.html` | `http://localhost:8081/v3/api-docs` |
| Orders | `http://localhost:8082/swagger-ui/index.html` | `http://localhost:8082/v3/api-docs` |
| Shipping | `http://localhost:8083/swagger-ui/index.html` | `http://localhost:8083/v3/api-docs` |
| Identity | `http://localhost:8084/swagger-ui/index.html` | `http://localhost:8084/v3/api-docs` |

## Autenticacion

- `POST /api/auth/login`: obtiene JWT.
- `GET /api/auth/me`: obtiene usuario autenticado.

Usar Bearer JWT para rutas protegidas.

## Estado del sistema

- `GET /api/system/health`: estado agregado por servicio.

Servicios reportados:

- API Gateway
- Identity/Auth
- Inventory
- Orders
- Shipping

## Inventario

- `GET /api/inventory/products`
- `GET /api/inventory/products/{id}`
- `POST /api/inventory/products`
- `PUT /api/inventory/products/{id}`
- `PATCH /api/inventory/products/{id}/deactivate`
- `GET /api/inventory/stock/product/{productId}`
- `GET /api/inventory/stock/movements`
- `POST /api/inventory/stock/movements`
- `GET /api/inventory/warehouses`
- `POST /api/inventory/warehouses`

## Pedidos

- `GET /api/orders`
- `GET /api/orders/{id}`
- `GET /api/orders/number/{orderNumber}`
- `POST /api/orders`
- `PATCH /api/orders/{id}/confirm`
- `PATCH /api/orders/{id}/cancel`
- `PATCH /api/orders/{id}/status`
- `GET /api/orders/{id}/history`
- `GET /api/orders/customers`

## Envios y transportistas

- `GET /api/shipping/shipments`
- `GET /api/shipping/shipments/{id}`
- `GET /api/shipping/shipments/order/{orderId}`
- `POST /api/shipping/shipments`
- `PATCH /api/shipping/shipments/{id}/assign-carrier`
- `PATCH /api/shipping/shipments/{id}/status`
- `PATCH /api/shipping/shipments/{id}/cancel`
- `GET /api/shipping/carriers`
- `PATCH /api/shipping/carriers/{id}/availability`

## Usuarios

- `GET /api/users`
- `POST /api/users`
- `GET /api/users/{id}`
- `PATCH /api/users/{id}`
- `PATCH /api/users/{id}/role`
- `PATCH /api/users/{id}/password`
- `PATCH /api/users/me/password`
- `DELETE /api/users/{id}`

La eliminacion actual desactiva usuarios para mantener trazabilidad.
