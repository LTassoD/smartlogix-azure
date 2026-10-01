# Guia de pruebas con Bruno

SmartLogix usa Bruno para versionar pruebas HTTP del backend junto al repositorio.
Esto permite demostrar el flujo completo del MVP sin depender de colecciones
locales no versionadas.

## Formato Bruno v3.3.0

Bruno v3.3.0 usa OpenCollection YAML por defecto. Por eso las colecciones del
proyecto usan:

- `opencollection.yml` en la raiz de cada coleccion.
- requests en archivos `.yml`.
- environments en archivos `.yml`.

Los archivos `.bru` antiguos no son el formato activo de estas colecciones.
Si se necesitan como referencia, quedaron respaldados en:

```text
D:\SmartLogix\docs\SmartLogix\collections_backup_bru\
```

## Ruta de colecciones

```text
docs/SmartLogix/collections/
```

Colecciones disponibles:

- `smartlogix`: flujo completo por API Gateway.
- `ApiGateway`: pruebas del gateway.
- `IdentityService`: pruebas directas de autenticacion.
- `InventoryService`: pruebas directas de inventario.
- `OrderService`: pruebas directas de pedidos.
- `ShippingService`: pruebas directas de envios.

## Como abrirlas

1. Abrir Bruno.
2. Seleccionar `Open Collection`.
3. Abrir la carpeta de la coleccion, por ejemplo:

```text
D:\SmartLogix\docs\SmartLogix\collections\smartlogix
```

4. Seleccionar el environment `Local`.

El environment no es necesario para resolver las URLs base, porque las
requests usan URLs absolutas como `http://localhost:8080`. Aun asi, conviene
seleccionar `Local` para ver y persistir variables como `token`, `orderId` y
`shipmentId`.

## Coleccion recomendada

Para la demo principal usa primero:

```text
smartlogix
```

Esta coleccion prueba el flujo principal por el API Gateway usando URLs
absolutas:

```text
http://localhost:8080
```

Las variables se usan solo para valores dinamicos del flujo:

- `token`
- `orderId`
- `orderNumber`
- `shipmentId`
- `shipmentNumber`
- `productId`
- `warehouseId`
- `customerId`

## Login y token

Ejecutar:

```text
01 Auth / Login Admin
```

El request incluye un script post-response para intentar guardar:

```text
token = data.accessToken
```

Si la version local de Bruno no ejecuta el script, copiar manualmente
`data.accessToken` desde la respuesta y pegarlo en la variable `token` del
environment `Local`.

## Variables importantes

- `token`: JWT para rutas protegidas.
- `orderId`: id del pedido creado.
- `orderNumber`: numero del pedido creado.
- `shipmentId`: id del envio creado por evento.
- `shipmentNumber`: numero del envio creado.
- `productId`: por defecto `1`.
- `warehouseId`: por defecto `1`.
- `customerId`: por defecto `1`.

Los requests `Create Order` y `Shipment Created By Order` guardan
automaticamente `orderId`, `orderNumber`, `shipmentId` y `shipmentNumber`.
Si una version local de Bruno no persiste variables, copiar esos valores
manualmente al environment.

## Runner completo

Para ejecutar todo el flujo:

1. Levantar Docker con `docker compose up -d`.
2. Levantar `identity-service`, `api-gateway`, `inventory-service`,
   `order-service` y `shipping-service`.
3. Abrir la coleccion `smartlogix`.
4. Seleccionar environment `Local`.
5. Ejecutar el Runner en orden.

La coleccion `smartlogix` fue reducida al flujo principal para que el Runner no
ejecute requests exploratorias que puedan repetir datos unicos o cambiar el
token durante la demo. Esas requests quedaron como respaldo en:

```text
D:\SmartLogix\docs\SmartLogix\collections_backup_optional_yml\
```

## Orden recomendado para demo

1. `00 Health`: validar servicios levantados.
2. `01 Auth / Login Admin`: obtener token.
3. `02 Inventory / Get Stock Product 1`: ver stock inicial.
4. `03 Orders / Create Order`: crear pedido.
5. `03 Orders / Confirm Order`: confirmar pedido.
6. `04 Event Driven Validation / Stock After Order Confirm`: validar descuento.
7. `04 Event Driven Validation / Inventory Movements After Order Confirm`: ver `ORDER_OUT`.
8. `04 Event Driven Validation / Shipment Created By Order`: validar envio creado.
9. `05 Shipping / Assign Carrier`: asignar transportista.
10. `05 Shipping / Change Shipment To IN_TRANSIT`.
11. `05 Shipping / Change Shipment To DELIVERED`.
12. `05 Shipping / Get Shipment History`.

## Errores comunes

- `Invalid URL`: revisar que se este abriendo la coleccion YAML actual y que
  las requests usen URLs absolutas. No deberian quedar URLs con
  `{{gatewayUrl}}`, `{{baseUrl}}`, `{{identityUrl}}`, `{{inventoryUrl}}`,
  `{{ordersUrl}}` ni `{{shippingUrl}}`.
- `401 Unauthorized`: ejecutar primero `01 Auth / Login Admin`.
- `orderId` vacio: ejecutar `03 Orders / Create Order`.
- `shipmentId` vacio: ejecutar `04 Event Driven Validation / Shipment Created
  By Order` despues de confirmar el pedido.
- PATCH de shipping con `400 Bad Request`: revisar el estado del envio. Solo
  se puede asignar transportista si el envio esta en `CREATED`,
  `PENDING_ASSIGNMENT` o `FAILED`; solo se puede pasar a `IN_TRANSIT` desde
  `ASSIGNED`, y a `DELIVERED` desde `IN_TRANSIT`. Si el envio ya esta
  `DELIVERED`, crear y confirmar un pedido nuevo para generar un envio nuevo.
- En la coleccion directa `ShippingService`, el token se hereda desde la
  configuracion de la coleccion. Antes de ejecutar `Shipment By Order` o los
  PATCH, ejecutar `Shipments`; ese request busca un envio asignable y guarda
  `shipmentId`, `orderId` y `shipmentNumber`.
- La coleccion directa `ShippingService` es stateful: si solo existen envios
  ya `DELIVERED`, los PATCH pueden responder `400` por regla de negocio. En
  esa coleccion el runner acepta `400` como evidencia de validacion de reglas.
  Para un flujo donde todos los PATCH deben responder `200`, usar la coleccion
  `smartlogix`, que crea y confirma un pedido nuevo antes de operar shipping.

## Evidencia para defensa

Capturar:

- Login exitoso y JWT.
- Gateway routes.
- Stock antes y despues.
- Pedido creado y confirmado.
- Movimiento `ORDER_OUT` con `referenceCode = orderNumber`.
- Envio creado automaticamente.
- Transportista asignado.
- Envio `IN_TRANSIT` y `DELIVERED`.
- Queues de RabbitMQ.
- Tablas en pgAdmin.
