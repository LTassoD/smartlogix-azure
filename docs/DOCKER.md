# Docker SmartLogix

`docker-compose.yml` levanta la infraestructura local y el frontend de produccion.

## Servicios Docker

- `postgres-identity`: puerto host `5433`
- `postgres-inventory`: puerto host `5434`
- `postgres-orders`: puerto host `5435`
- `postgres-shipping`: puerto host `5436` (nombres/orden segun `docker-compose.yml`)
- `frontend`: puerto `5173`
- La mensajeria no se levanta en contenedor: es **Azure Service Bus** (AMQP 1.0),
  cuyas credenciales (host, policy SAS) entran por variables de entorno
  (`SMARTLOGIX_SERVICEBUS_HOST`, `SMARTLOGIX_SERVICEBUS_POLICY`, `SMARTLOGIX_SERVICEBUS_KEY`).

## Comandos

```bash
docker compose up --build
docker compose down
docker compose logs -f frontend
```

## Frontend

El frontend se construye con Node y se sirve con nginx. El contenedor escucha en puerto interno `80` y se publica como:

```text
http://localhost:5173
```

El build usa:

```text
VITE_API_BASE_URL=http://localhost:8080
VITE_API_USE_DEV_PROXY=false
```

Esto permite que el navegador llame al API Gateway publicado en el host.

## Backend

Los microservicios tienen Dockerfiles multi-stage sin usuario root y se
levantan junto al resto del stack (`docker compose up -d --build`). Para
desarrollo manual fuera de contenedores, cada servicio tiene puerto propio
(8080 gateway, 8081 inventory, 8082 orders, 8083 shipping, 8084 identity,
8085 sb-admin).

## Rebuild limpio

Para reconstruir sin cache:

```bash
docker compose build --no-cache frontend
docker compose up
```

Para borrar datos locales:

```bash
docker compose down -v
```

Usa `down -v` solo si quieres eliminar bases locales.

## Problemas comunes

- Frontend sin datos: confirma que `api-gateway` este en `http://localhost:8080`.
- Error de CORS: usa `http://localhost:5173`, no `127.0.0.1`.
- Base no conecta: confirma que el servicio PostgreSQL correspondiente este arriba.
