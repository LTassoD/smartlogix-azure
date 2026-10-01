# SmartLogix Frontend

Frontend inicial de SmartLogix construido con React, TypeScript, Vite y Tailwind CSS.

## Requisitos

- Node.js y NPM instalados en Windows.
- API Gateway levantado en `http://localhost:8080`.
- Infraestructura backend levantada segun el README principal.

## Variables de entorno

Crear `frontend\.env` a partir de `frontend\.env.example`:

```cmd
cd frontend
copy .env.example .env
```

Variables:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_APP_NAME=SmartLogix
VITE_API_CREDENTIALS_MODE=same-origin
VITE_API_USE_DEV_PROXY=true
```

`VITE_API_CREDENTIALS_MODE` queda en `same-origin` porque el backend actual usa JWT Bearer en body/header y no cookies HttpOnly. Cuando el backend emita cookies HttpOnly y habilite CORS con credenciales, cambiar a `include`.

`VITE_API_USE_DEV_PROXY=true` hace que Vite reenvie llamadas del navegador al gateway durante desarrollo, evitando bloqueos CORS locales sin cambiar la URL real del backend.

## Comandos Windows CMD

```cmd
cd frontend
npm install
npm run dev
npm run build
npm run lint
```

## Integracion backend inicial

La primera conexion real usa:

```http
GET http://localhost:8080/actuator/health
```

Este endpoint existe en el API Gateway y es publico. El dashboard muestra su estado para validar conectividad apenas se abre la app.

Auth detectado:

- Login: `POST /api/auth/login`
- Usuario actual: `GET /api/auth/me`
- Formato exitoso: `{ "success": true, "message": "...", "data": ... }`
- Formato error: `{ "timestamp": "...", "status": 401, "error": "...", "message": "...", "path": "..." }`
- Mecanismo actual: JWT Bearer retornado en `data.accessToken`.

El token se mantiene aislado en memoria mediante `AuthTokenProvider`. No se guarda en `localStorage`; esto facilita migrar despues a cookies HttpOnly sin tocar componentes.

Actualizacion de sesion: mientras el backend siga devolviendo JWT en el body, el token se persiste temporalmente en `sessionStorage` solo desde `src/lib/security/authTokenProvider.ts`. Al refrescar la pagina, `AuthProvider` intenta validar la sesion con `GET /api/auth/me` antes de redirigir a login. Cuando el backend soporte cookies HttpOnly, este modulo debe dejar de persistir el token y la validacion quedara basada en cookies con `credentials`.

## Validacion de respuestas

No se agrego Zod para evitar dependencias nuevas en este MVP academico. Las respuestas criticas se validan con type guards estrictos en `src/lib/api/apiSchemas.ts`.
