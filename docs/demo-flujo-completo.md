# Demo flujo completo SmartLogix

## 1. Levantar infraestructura

```powershell
docker compose up -d
```

## 2. Levantar servicios

En consolas separadas:

```powershell
cd D:\SmartLogix\identity-service
.\mvnw.cmd spring-boot:run
```

```powershell
cd D:\SmartLogix\api-gateway
.\mvnw.cmd spring-boot:run
```

```powershell
cd D:\SmartLogix\inventory-service
.\mvnw.cmd spring-boot:run
```

```powershell
cd D:\SmartLogix\order-service
.\mvnw.cmd spring-boot:run
```

```powershell
cd D:\SmartLogix\shipping-service
.\mvnw.cmd spring-boot:run
```

Puertos esperados:

- `identity-service`: `8084`
- `api-gateway`: `8080`
- `inventory-service`: `8081`
- `order-service`: `8082`
- `shipping-service`: `8083`

## 3. Abrir Bruno

Abrir la coleccion:

```text
D:\SmartLogix\docs\SmartLogix\collections\smartlogix
```

Seleccionar environment:

```text
Local
```

## 4. Ejecutar Login Admin

Request:

```text
01 Auth / Login Admin
```

Si el script no guarda el token automaticamente, copiar `data.accessToken` y
pegarlo en la variable `token`.

## 5. Consultar stock inicial

Request:

```text
02 Inventory / Get Stock Product 1
```

## 6. Crear pedido

Request:

```text
03 Orders / Create Order
```

Si el script no guarda variables, copiar:

- `data.id` a `orderId`
- `data.orderNumber` a `orderNumber`

## 7. Confirmar pedido

Request:

```text
03 Orders / Confirm Order
```

Esto dispara:

- Publicacion de `OrderCreatedEvent` desde `order-service`.
- Descuento de stock en `inventory-service`.
- Creacion de envio en `shipping-service`.

## 8. Verificar descuento de stock

Request:

```text
04 Event Driven Validation / Stock After Order Confirm
```

## 9. Verificar movimiento ORDER_OUT

Request:

```text
04 Event Driven Validation / Inventory Movements After Order Confirm
```

Buscar un movimiento:

- `type = ORDER_OUT`
- `referenceCode = orderNumber`

## 10. Verificar envio automatico

Request:

```text
04 Event Driven Validation / Shipment Created By Order
```

Si el script no guarda variables, copiar:

- `data.id` a `shipmentId`
- `data.shipmentNumber` a `shipmentNumber`

## 11. Asignar transportista

Request:

```text
05 Shipping / Assign Carrier
```

## 12. Cambiar envio a IN_TRANSIT

Request:

```text
05 Shipping / Change Shipment To IN_TRANSIT
```

## 13. Cambiar envio a DELIVERED

Request:

```text
05 Shipping / Change Shipment To DELIVERED
```

## 14. Mostrar RabbitMQ

Abrir:

```text
http://localhost:15672
```

Credenciales:

- Usuario: valor de `SMARTLOGIX_RABBITMQ_USERNAME`
- Password: valor local de `SMARTLOGIX_RABBITMQ_PASSWORD`

Queues relevantes:

- `smartlogix.inventory.order-created.queue`
- `smartlogix.shipping.order-created.queue`

## 15. Mostrar pgAdmin

Abrir:

```text
http://localhost:5050
```

Validar tablas de:

- `smartlogix_inventory_db`
- `smartlogix_orders_db`
- `smartlogix_shipping_db`
- `smartlogix_identity_db`
