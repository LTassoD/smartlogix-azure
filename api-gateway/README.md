# SmartLogix API Gateway

El `api-gateway` es el Backend For Frontend/API Gateway del MVP académico SmartLogix. Su responsabilidad es ser el punto de entrada del frontend y enrutar las solicitudes hacia los microservicios de Inventario, Pedidos y Envíos.

Este componente no contiene lógica de negocio, JPA, entities ni repositories. En esta etapa del MVP solo enruta solicitudes, expone configuración básica de seguridad/CORS, agrega trazabilidad por request y entrega endpoints de monitoreo con Actuator.

## Puerto

- API Gateway: `8080`

## Rutas disponibles

| Ruta del gateway | Microservicio destino | Puerto destino |
| --- | --- | --- |
| `/api/auth/**` | `identity-service` | `http://localhost:8084` |
| `/api/inventory/**` | `inventory-service` | `http://localhost:8081` |
| `/api/orders/**` | `order-service` | `http://localhost:8082` |
| `/api/shipping/**` | `shipping-service` | `http://localhost:8083` |

## Microservicios esperados

- `inventory-service`: `8081`
- `order-service`: `8082`
- `shipping-service`: `8083`
- `identity-service`: `8084`

## Funciones implementadas

- Enrutamiento hacia `inventory-service`, `order-service` y `shipping-service`.
- Enrutamiento hacia `identity-service` para login y datos de usuario autenticado.
- CORS de desarrollo para `http://localhost:3000` y `http://localhost:5173`.
- Validación JWT para rutas protegidas del sistema.
- Actuator health para validar disponibilidad del gateway.
- Header `X-Correlation-Id` para trazabilidad de solicitudes.
- Manejo global de errores con `GlobalExceptionHandler`.
- Respuestas estándar con `ApiResponse`.
- Nota: no usa base de datos en esta etapa.

## Headers útiles

- `X-Correlation-Id`: identificador de trazabilidad por solicitud. Si el cliente lo envía, el gateway lo reutiliza. Si no viene en la request, el gateway genera un UUID, lo agrega a la request procesada internamente y lo devuelve en la respuesta.
- `Authorization`: debe enviarse como `Bearer <accessToken>` para acceder a rutas protegidas.

## Flujo de login

1. Obtener token:

```http
POST http://localhost:8080/api/auth/login
```

Body:

```json
{
  "email": "admin@smartlogix.cl",
  "password": "<SMARTLOGIX_SEED_ADMIN_PASSWORD>"
}
```

2. Copiar `data.accessToken`.
3. Usar el token en rutas protegidas:

```text
Authorization: Bearer <accessToken>
```

4. Probar usuario autenticado:

```http
GET http://localhost:8080/api/auth/me
```

## Ejecutar

Desde la carpeta `api-gateway`:

```bash
mvn spring-boot:run
```

## URL de prueba

```text
http://localhost:8080/actuator/health
```

## Base de datos

Existe una base de datos llamada `gateway-service` registrada en pgAdmin. En este MVP el gateway no la usa porque no maneja persistencia propia. Por eso este componente no debe agregar Spring Data JPA, PostgreSQL Driver, entities ni repositories salvo que la rúbrica o una decisión documentada cambie el alcance.

## Seguridad y CORS

La configuración actual permite sin token `POST /api/auth/login`, `/actuator/health`, `/actuator/info` y `/actuator/gateway/routes`. Las rutas `/api/inventory/**`, `/api/orders/**`, `/api/shipping/**` y `/api/auth/me` requieren JWT válido emitido por `identity-service`.

`CorsConfig` permite temporalmente los orígenes locales:

- `http://localhost:3000`
- `http://localhost:5173`

Métodos permitidos: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.

Headers permitidos: `Authorization`, `Content-Type`, `X-Correlation-Id`.
