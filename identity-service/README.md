# SmartLogix Identity Service

`identity-service` centraliza usuarios, autenticación JWT y 2FA TOTP del MVP académico SmartLogix.

## Configuración

- Puerto: `8084`
- Base de datos: `smartlogix_identity_db`
- PostgreSQL local: `localhost:5436`
- Firma JWT: HS256 con emisor validado por todos los servicios.
- Contraseñas de usuario: BCrypt con salt por hash.
- Segundo factor: TOTP de seis dígitos, periodo de 30 segundos.

No hay claves ni credenciales funcionales en este repositorio. El servicio exige configuración mediante variables de entorno:

| Variable | Uso |
|---|---|
| `SMARTLOGIX_DB_USERNAME` | Usuario PostgreSQL compartido para el entorno local. |
| `SMARTLOGIX_DB_PASSWORD` | Password PostgreSQL. |
| `SMARTLOGIX_JWT_SECRET` | Clave HS256 compartida, de al menos 64 caracteres. |
| `SMARTLOGIX_JWT_ISSUER` | Emisor esperado; el valor local recomendado es `smartlogix-identity-service`. |
| `SMARTLOGIX_2FA_ENCRYPTION_PASSWORD` | Material de cifrado de secretos TOTP, de al menos 32 caracteres. |
| `SMARTLOGIX_2FA_ENCRYPTION_SALT` | Salt hexadecimal par, de al menos 16 caracteres. |
| `SMARTLOGIX_SEED_ENABLED` | Crea datos demo solo si se establece explícitamente en `true`. |

Copia `.env.example` a `.env` en la raíz y completa sus campos secretos vacíos. La guía [Seguridad del login y 2FA TOTP](../docs/SECURITY_2FA.md) contiene comandos para generar valores aleatorios y preparar una base nueva.

## Ejecutar

```bash
..\start-smartlogix.bat
```

El launcher carga el `.env` raíz. Para iniciar Identity por separado, exporta las mismas variables en la terminal y ejecuta `mvnw.cmd spring-boot:run` dentro de este directorio.

## Tests

```bash
.\mvnw.cmd test
```

## Endpoints

| Método | URL | Protección |
| --- | --- | --- |
| `POST` | `http://localhost:8084/api/auth/login` | Público |
| `POST` | `http://localhost:8084/api/auth/2fa` | Público; exige challenge temporal y TOTP |
| `GET` | `http://localhost:8084/api/auth/me` | JWT requerido |
| `GET` | `http://localhost:8084/api/auth/2fa/status` | JWT requerido |
| `POST` | `http://localhost:8084/api/auth/2fa/setup` | JWT requerido |
| `POST` | `http://localhost:8084/api/auth/2fa/verify-setup` | JWT requerido |
| `POST` | `http://localhost:8084/api/auth/2fa/disable` | JWT y password actual requeridos |
| `GET` | `http://localhost:8084/actuator/health` | Público |

También se accede mediante gateway:

- `POST http://localhost:8080/api/auth/login`
- `POST http://localhost:8080/api/auth/2fa`
- `GET http://localhost:8080/api/auth/me`

## Login

```json
{
  "email": "<correo-configurado-localmente>",
  "password": "<password-local>"
}
```

Sin 2FA, la respuesta contiene el JWT definitivo. Con 2FA activo, contiene `requiresTwoFactor: true`, `temporaryToken` y su duración, pero no un `accessToken`. Complete el segundo paso con:

```json
{
  "temporaryToken": "<challenge-devuelto-por-login>",
  "code": "<codigo-totp-de-6-digitos>"
}
```

Envíe el JWT definitivo a rutas protegidas:

```text
Authorization: Bearer <accessToken>
```

## Controles 2FA

- El QR se construye desde una URI `otpauth://` estándar y expira a los diez minutos.
- El secreto queda cifrado con AES-256-GCM y no se devuelve después de confirmar la activación.
- El challenge de login expira a los cinco minutos, se persiste como hash y se invalida tras usarlo.
- Un OTP aceptado no puede reutilizarse.
- Cinco fallos en una ventana de cinco minutos bloquean temporalmente el flujo por 60 segundos.
- La desactivación requiere comprobar la contraseña actual.

Las contraseñas se guardan con BCrypt y nunca se retornan en respuestas ni logs.
