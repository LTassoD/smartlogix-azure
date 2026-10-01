# Roles y permisos

SmartLogix usa tres roles funcionales. El frontend deriva permisos desde el rol y el backend aplica seguridad en rutas protegidas.

## ADMIN

Puede:

- Ver todos los modulos.
- Crear, editar y desactivar productos.
- Ajustar stock.
- Crear y actualizar pedidos.
- Crear y actualizar envios.
- Administrar transportistas y bodegas.
- Exportar reportes.
- Abrir Configuracion.
- Administrar usuarios.
- Cambiar roles y resetear contrasenas de usuarios.

## OPERATOR

Puede:

- Ver Dashboard, Inventario, Pedidos, Envios, Transportistas, Bodegas y Reportes.
- Ejecutar acciones operacionales permitidas.
- Crear pedidos y actualizar estados cuando corresponde.
- Ajustar stock y disponibilidad segun permisos.

No puede:

- Abrir Configuracion.
- Administrar usuarios.
- Exportar reportes si el permiso esta bloqueado.

## VIEWER

Puede:

- Ver modulos operacionales y reportes.
- Revisar detalle de registros.

No puede:

- Crear, editar, cancelar o cambiar estados.
- Administrar usuarios.
- Abrir Configuracion.
- Exportar reportes si el permiso esta bloqueado.

## UI

El sidebar oculta modulos sin permiso. Las acciones con botones, modales o exportaciones tambien se ocultan o se deshabilitan segun rol. Si un usuario intenta entrar manualmente a una ruta no permitida, ve una pantalla de acceso restringido.
