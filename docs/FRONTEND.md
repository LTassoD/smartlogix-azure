# Frontend SmartLogix

El frontend esta en `frontend/` y usa React, TypeScript, Vite, Tailwind CSS, componentes estilo shadcn/ui y Recharts.

## Estructura

- `src/app`: router protegido.
- `src/components`: layout y componentes UI compartidos.
- `src/features`: modulos por dominio.
- `src/hooks`: hooks globales.
- `src/lib/api`: cliente HTTP, tipos y schemas.
- `src/lib/system`: normalizacion del estado de servicios.
- `src/lib/ui`: preferencias locales no sensibles.

## Rutas principales

- `/dashboard`
- `/inventario`
- `/pedidos`
- `/envios`
- `/transportistas`
- `/bodegas`
- `/reportes`
- `/configuracion`

Las rutas usan `ProtectedRoute` y permisos derivados del rol autenticado.

## Permisos

- `ADMIN`: ve todos los modulos, configuracion y exportacion.
- `OPERATOR`: opera inventario, pedidos, envios, transportistas y bodegas permitidas.
- `VIEWER`: solo lectura.

El sidebar filtra entradas por permiso y los botones mutantes se ocultan cuando el rol no corresponde.

## Componentes compartidos

- `DataPagination`: paginacion reusable.
- `ServiceStatusBanner`: banner contextual por servicio.
- `StatusBadge`: estados visuales.
- Skeletons y spinners reutilizables para carga inicial y acciones.
- Tooltips en acciones relevantes.

## Dashboard y reportes

Dashboard y Reportes usan datos reales provenientes de inventario, pedidos, envios, transportistas y bodegas. Los graficos usan Recharts y componentes de chart locales. Si no hay datos, se muestra empty state profesional.

## Exportacion

Reportes permite:

- Excel `.xlsx` profesional con titulo, fecha de generacion, filtros, secciones y columnas ajustadas.
- CSV limpio con BOM UTF-8 y `sep=;` para Excel en espanol.

Los exportadores trabajan con filas ya filtradas/visibles y no serializan objetos JSON crudos.

## Preferencias

La densidad de tablas se guarda como preferencia local no sensible en `sessionStorage` y se aplica de inmediato con `data-table-density`.

## Tests

Vitest y React Testing Library cubren login basico, rutas protegidas, permisos, sidebar, fallback de cliente en envios, exportacion y preferencias de UI.
