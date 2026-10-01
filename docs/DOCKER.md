# Docker SmartLogix

`docker-compose.yml` levanta la infraestructura local y el frontend de produccion.

## Servicios Docker

- `postgres-inventory`: puerto host `5433`
- `postgres-orders`: puerto host `5434`
- `postgres-shipping`: puerto host `5435`
- `postgres-identity`: puerto host `5436`
- `rabbitmq`: puertos `5672` y `15672`
- `pgadmin`: puerto `5050`
- `frontend`: puerto `5173`

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

En esta version, los microservicios Spring Boot se ejecutan manualmente y usan los servicios de infraestructura del compose. Si se agregan Dockerfiles backend mas adelante, se pueden sumar al mismo network `smartlogix-network`.

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
