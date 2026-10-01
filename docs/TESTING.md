# Testing SmartLogix

## Frontend

Desde `frontend/`:

```bash
npm run lint
npm run build
npm run test
npm run test:watch
npm run test:coverage
```

Cobertura actual agregada:

- Login basico y validacion de campos.
- Rutas protegidas y acceso restringido.
- Permisos ADMIN, OPERATOR y VIEWER.
- Sidebar filtrado por rol.
- Fallback de cliente en envios para evitar etiquetas generadas como "Cliente 1".
- Exportacion CSV/XLSX de Reportes.
- Preferencia de densidad de tablas.

## Backend

Ejecutar tests por servicio:

```bash
cd api-gateway && mvnw.cmd test
cd identity-service && mvnw.cmd test
cd inventory-service && mvnw.cmd test
cd order-service && mvnw.cmd test
cd shipping-service && mvnw.cmd test
```

Flujos cubiertos:

- API Gateway: estado agregado de microservicios.
- Identity: JWT, usuarios, email duplicado, contrasenas y ultimo ADMIN activo.
- Inventory: crear producto, SKU duplicado y flujos de eventos de stock.
- Orders: creacion de pedido, totales e historial base.
- Shipping: crear envio, asignar transportista y fallback de disponibilidad.

## Validacion manual sugerida

1. Levantar infraestructura con Docker.
2. Levantar microservicios.
3. Abrir `http://localhost:5173`.
4. Login como ADMIN.
5. Exportar Excel y CSV desde Reportes.
6. Revisar Swagger de cada servicio.
7. Probar Dashboard, Inventario, Pedidos, Envios, Transportistas, Bodegas, Reportes y Configuracion.
8. Confirmar roles OPERATOR y VIEWER.
