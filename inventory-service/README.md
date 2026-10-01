# SmartLogix Inventory Service

`inventory-service` es el microservicio responsable de productos, bodegas, stock y movimientos de inventario del MVP académico SmartLogix.

Este componente usa Spring Boot 4.0.6, Java 21, Maven, PostgreSQL, Spring Data JPA, Lombok, Validation, Spring Security básico, Actuator y estructura por capas.

## Configuración

- Puerto del servicio: `8081`
- Base de datos: `smartlogix_inventory_db`
- Host PostgreSQL local: `localhost`
- Puerto PostgreSQL local: `5433`
- Usuario: variable `SMARTLOGIX_DB_USERNAME` (por defecto, `smartlogix`)
- Password: variable obligatoria `SMARTLOGIX_DB_PASSWORD`

La base de datos se levanta desde el `docker-compose.yml` principal del repositorio.

## Seguridad

Las rutas `/api/inventory/**` requieren JWT válido emitido por `identity-service`. El token se obtiene mediante:

```http
POST http://localhost:8080/api/auth/login
```

Luego se debe enviar en Postman:

```text
Authorization: Bearer <accessToken>
```

Reglas del MVP:

- `ADMIN` y `OPERATOR` pueden consultar y modificar inventario.
- `VIEWER` puede consultar inventario con métodos `GET`.
- `/actuator/health` y `/actuator/info` quedan públicos para validación local.

## Ejecutar

Desde la carpeta `inventory-service`:

```bash
.\mvnw.cmd spring-boot:run
```

## Ejecutar pruebas

```bash
.\mvnw.cmd test
```

## Integracion con RabbitMQ

`inventory-service` consume `OrderCreatedEvent` publicado por `order-service`
cuando un pedido es confirmado.

- Exchange: `smartlogix.orders.exchange`
- Queue: `smartlogix.inventory.order-created.queue`
- Routing key: `order.created`

Cada microservicio tiene su propia queue. `shipping-service` usa
`smartlogix.shipping.order-created.queue`, mientras que inventario usa
`smartlogix.inventory.order-created.queue`. Esto permite que ambos reciban una
copia del mismo evento sin competir por el mensaje.

Cuando llega el evento, inventario descuenta stock automaticamente por cada item
del pedido y crea un movimiento `ORDER_OUT`.

El movimiento usa:

- `type`: `ORDER_OUT`
- `reason`: `Stock descontado por pedido confirmado`
- `referenceCode`: `orderNumber`

Existe idempotencia basica: antes de descontar stock, el servicio verifica si ya
existe un movimiento `ORDER_OUT` para el mismo `referenceCode`, `productId` y
`warehouseId`. Si ya existe, el item se omite para evitar doble descuento por
eventos repetidos.

No se implementa DLQ en esta etapa. Queda como mejora futura para un entorno mas
productivo.

## Flujo de descuento de stock

1. Usuario confirma pedido en `order-service`.
2. `order-service` publica `OrderCreatedEvent`.
3. `inventory-service` consume el evento desde RabbitMQ.
4. `inventory-service` descuenta stock por cada item.
5. `inventory-service` registra movimientos `ORDER_OUT`.

## Endpoints disponibles

Base directa:

```text
http://localhost:8081/api/inventory
```

Base mediante API Gateway:

```text
http://localhost:8080/api/inventory
```

### Productos

| Método | URL directa | Descripción |
| --- | --- | --- |
| `GET` | `http://localhost:8081/api/inventory/products` | Listar productos |
| `GET` | `http://localhost:8081/api/inventory/products/{id}` | Obtener producto por id |
| `POST` | `http://localhost:8081/api/inventory/products` | Crear producto |
| `PUT` | `http://localhost:8081/api/inventory/products/{id}` | Actualizar producto |
| `PATCH` | `http://localhost:8081/api/inventory/products/{id}/deactivate` | Desactivar producto |

### Bodegas

| Método | URL directa | Descripción |
| --- | --- | --- |
| `GET` | `http://localhost:8081/api/inventory/warehouses` | Listar bodegas |
| `GET` | `http://localhost:8081/api/inventory/warehouses/{id}` | Obtener bodega por id |
| `POST` | `http://localhost:8081/api/inventory/warehouses` | Crear bodega |

### Stock

| Método | URL directa | Descripción |
| --- | --- | --- |
| `GET` | `http://localhost:8081/api/inventory/stock/product/{productId}` | Ver stock por producto |
| `GET` | `http://localhost:8081/api/inventory/stock/movements` | Listar movimientos |
| `POST` | `http://localhost:8081/api/inventory/stock/movements` | Crear movimiento de stock |

## Ejemplo JSON para crear producto

```json
{
  "sku": "SKU-010",
  "name": "Monitor Samsung",
  "description": "Monitor 24 pulgadas",
  "unitPrice": 129990
}
```

## Ejemplo JSON para crear movimiento de stock

Movimiento de entrada:

```json
{
  "productId": 1,
  "warehouseId": 1,
  "type": "IN",
  "quantity": 5,
  "reason": "Compra inicial",
  "referenceCode": "OC-1001"
}
```

Movimiento de salida:

```json
{
  "productId": 1,
  "warehouseId": 1,
  "type": "OUT",
  "quantity": 2,
  "reason": "Venta manual",
  "referenceCode": "SALE-1001"
}
```

Tipos de movimiento permitidos:

- `IN`
- `OUT`
- `ADJUSTMENT`
- `ORDER_OUT`

## URLs de prueba para Postman

- Health: `GET http://localhost:8081/actuator/health`
- Listar productos: `GET http://localhost:8081/api/inventory/products`
- Crear producto: `POST http://localhost:8081/api/inventory/products`
- Listar bodegas: `GET http://localhost:8081/api/inventory/warehouses`
- Ver stock de producto: `GET http://localhost:8081/api/inventory/stock/product/1`
- Crear movimiento: `POST http://localhost:8081/api/inventory/stock/movements`

Para probar mediante el gateway, reemplazar `http://localhost:8081` por `http://localhost:8080`.

Todas las URLs `/api/inventory/**` deben incluir el header `Authorization: Bearer <accessToken>`.

## Datos semilla

Al iniciar el servicio se insertan datos mínimos si no existen:

- `SKU-001` / Notebook Lenovo / `650000`
- `SKU-002` / Mouse Logitech / `15000`
- `SKU-003` / Teclado Redragon / `35000`
- `BOD-SCL` / Bodega Santiago
- `BOD-VAP` / Bodega Valparaíso

También se crea stock inicial para los productos de demostración.
