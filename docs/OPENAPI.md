# OpenAPI y Swagger

SmartLogix usa `springdoc-openapi-starter-webmvc-ui` 3.0.3 para Spring Boot 4. Cada microservicio expone Swagger UI y JSON OpenAPI.

## URLs

- API Gateway: `http://localhost:8080/swagger-ui/index.html`
- Identity: `http://localhost:8084/swagger-ui/index.html`
- Inventory: `http://localhost:8081/swagger-ui/index.html`
- Orders: `http://localhost:8082/swagger-ui/index.html`
- Shipping: `http://localhost:8083/swagger-ui/index.html`

## Seguridad

Swagger publica el esquema Bearer JWT. Para probar endpoints protegidos:

1. Inicia sesion en `POST /api/auth/login`.
2. Copia el token.
3. Usa el boton `Authorize`.
4. Ingresa `Bearer <token>`.

## Rutas publicas

Cada servicio permite sin JWT:

- `/swagger-ui.html`
- `/swagger-ui/**`
- `/v3/api-docs`
- `/v3/api-docs/**`
- `/actuator/health`
- `/actuator/info`

El resto de rutas conserva las reglas de seguridad existentes.
