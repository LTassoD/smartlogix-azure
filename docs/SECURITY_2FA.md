# Fortificación del login con 2FA TOTP

Este documento concentra la auditoría, el diseño de seguridad, la operación local y el guion de demostración de la fortificación de SmartLogix. La solución conserva la arquitectura existente: agrega un segundo factor TOTP y defensas complementarias sin cambiar de framework ni depender de servicios cloud.

> Estado final: **70/70 pruebas backend** y **28/28 pruebas frontend** aprobadas, los cinco paquetes Maven y el build de producción frontend completados, `npm audit` con cero vulnerabilidades y E2E aislado aprobado contra PostgreSQL 16 real. La única comprobación que requiere intervención humana es escanear físicamente el QR con un teléfono; la interoperabilidad TOTP se verificó además con un generador independiente.

# 1. Arquitectura encontrada

| Capa | Tecnología y responsabilidad |
|---|---|
| Frontend | React 18, TypeScript, Vite 6, React Router 7 y Tailwind. Consume exclusivamente el API Gateway. |
| Entrada | `api-gateway`, Spring Cloud Gateway MVC sobre Spring Boot, puerto `8080`. Enruta autenticación y usuarios a Identity. |
| Identidad | `identity-service`, Java 21 y Spring Boot 4.0.6, puerto `8084`. Administra usuarios, BCrypt, TOTP y emisión de JWT. |
| Dominio | `inventory-service` (`8081`), `order-service` (`8082`) y `shipping-service` (`8083`), todos Spring Boot. |
| Persistencia | PostgreSQL 16, una base por microservicio. Identity persiste usuarios y desafíos 2FA. |
| Mensajería | RabbitMQ para integración entre servicios. No participa en el login. |
| Autenticación | JWT stateless firmado con HS256, emitido por Identity y validado por Gateway y servicios. |
| Contraseñas | BCrypt mediante `BCryptPasswordEncoder`. Cada hash incorpora un salt aleatorio; no fue necesaria una migración de contraseñas. |
| Sesión frontend | El token definitivo se conserva en `sessionStorage`; cerrar sesión lo elimina del navegador. |

El modelo `UserEntity` se amplió con el estado 2FA, el secreto activo cifrado, un secreto pendiente cifrado con expiración y el último contador TOTP consumido. `TwoFactorChallengeEntity` conserva solamente el hash SHA-256 del token temporal, su expiración, intentos e invalidación.

Los endpoints públicos se limitan a `POST /api/auth/login` y `POST /api/auth/2fa`. Configurar, consultar o desactivar 2FA requiere un JWT definitivo.

# 2. Login antes

El flujo original era:

1. El frontend enviaba correo y contraseña a `POST /api/auth/login` a través del Gateway.
2. Identity buscaba al usuario y comparaba la contraseña con BCrypt.
3. Si coincidía, emitía inmediatamente un JWT HS256 de una hora.
4. El frontend almacenaba el JWT en `sessionStorage` y habilitaba las rutas según el rol.
5. Gateway y microservicios validaban la firma del JWT.
6. El logout eliminaba el token del navegador; no existía revocación en servidor.

No existía segundo factor, challenge intermedio ni protección contra intentos repetidos. Además, una consulta temprana de usuarios permitía diferencias temporales entre una cuenta inexistente y una contraseña incorrecta. La clave JWT, credenciales locales y tokens de ejemplo estaban incluidos en archivos versionados.

# 3. Login después

## Activación

```text
Usuario autenticado con JWT definitivo
              |
              v
POST /api/auth/2fa/setup  (JWT requerido)
              |
              +--> secreto TOTP aleatorio
              +--> cifrado AES-256-GCM en base de datos
              +--> URI otpauth:// temporal (10 min)
              |
              v
Frontend renderiza QR con qrcode.react
              |
              v
Usuario escanea con una app Authenticator
              |
              v
POST /api/auth/2fa/verify-setup + código de 6 dígitos
              |
       +------+------+
       |             |
   inválido        válido
   rechazo      secreto pendiente -> activo
                twoFactorEnabled = true
```

El secreto no queda activo hasta verificar el primer código. La API deja de devolver la URI al finalizar o cancelar la configuración; tampoco devuelve el secreto en consultas de estado.

## Inicio de sesión

```text
Correo + contraseña
         |
         v
POST /api/auth/login
         |
   +-----+------------------------+
   | credenciales inválidas      |
   v                              v
rechazo genérico          credenciales válidas
"Credenciales incorrectas"       |
                                  v
                         ¿2FA habilitado?
                           /            \
                         no              sí
                         |               |
                         v               v
                  JWT definitivo    challenge opaco
                                    de un solo flujo
                                    (5 min, sin JWT)
                                           |
                                           v
                           POST /api/auth/2fa
                           temporaryToken + TOTP
                                /               \
                    inválido/expirado          válido
                            |                      |
                            v                      v
                         rechazo        consumir OTP + challenge
                                        emitir JWT definitivo
```

Un challenge contiene 256 bits aleatorios, se entrega una sola vez al cliente y se guarda en base de datos como hash. No acepta un `userId` elegido por el cliente. Expira en cinco minutos, queda inutilizado tras el éxito, se invalidan desafíos anteriores del usuario y admite como máximo cinco fallos.

El TOTP usa códigos de seis dígitos y periodos de 30 segundos compatibles con RFC 6238. Se tolera una ventana adyacente por desfase de reloj. El contador consumido se guarda con bloqueo de escritura, por lo que el mismo OTP no puede reutilizarse, incluso con solicitudes simultáneas.

# 4. Vulnerabilidades corregidas

| Vulnerabilidad | Antes | Después | Archivo principal |
|---|---|---|---|
| Secreto JWT versionado (**CRÍTICA**) | Una misma clave HS256 estaba escrita en configuración. | La clave es obligatoria mediante `SMARTLOGIX_JWT_SECRET`; `.env` está ignorado por Git. | `.env.example`, `*/application.properties` |
| Credenciales locales conocidas (**CRÍTICA**) | Seeder, Compose y documentación contenían contraseñas reutilizables. | El seed es opt-in y recibe credenciales explícitas desde el entorno; Compose exige secretos locales. | `DataSeeder.java`, `docker-compose.yml`, colecciones y README |
| Ausencia de segundo factor (**ALTA**) | La contraseña bastaba para obtener el JWT. | TOTP debe completarse cuando la cuenta tiene 2FA activo. | `AuthServiceImpl.java`, `TwoFactorController.java` |
| Emisión prematura de sesión (**ALTA**) | El login correcto siempre devolvía un JWT definitivo. | Con 2FA activo solo se devuelve un token temporal opaco; el JWT nace después del TOTP. | `AuthServiceImpl.java`, `TwoFactorChallengeService.java` |
| Bypass por identificador del cliente (**ALTA**) | No aplicaba porque no existía segundo paso. | El segundo paso resuelve al usuario desde el hash del challenge, no desde un ID o correo recibido. | `TwoFactorChallengeEntity.java`, `TwoFactorChallengeRepository.java` |
| Secreto TOTP expuesto en reposo (**ALTA**) | No existía. | Secretos pendiente y activo se cifran con AES-256-GCM; la clave de cifrado queda fuera de Git. | `TwoFactorCryptoConfig.java`, `TwoFactorSecretEncryptionService.java` |
| Fuerza bruta de login y TOTP (**ALTA**) | Intentos ilimitados. | Cinco fallos dentro de cinco minutos producen bloqueo de 60 segundos; el challenge también se agota tras cinco fallos. | `AuthenticationAttemptRateLimiter.java`, `TwoFactorChallengeService.java` |
| Enumeración temporal de usuarios (**MEDIA**) | Una cuenta inexistente evitaba el coste normal de BCrypt. | Se realiza una comparación BCrypt de coste equivalente y se usa un mensaje genérico. | `PasswordAuthenticationVerifier.java`, `AuthServiceImpl.java` |
| Replay de OTP (**MEDIA**) | No existía control TOTP. | El último contador aceptado se persiste y se actualiza atómicamente. | `TotpService.java`, `UserEntity.java`, `UserRepository.java` |
| Escritura concurrente sobre seguridad 2FA (**ALTA**) | Un cambio simultáneo de perfil o contraseña podía sobrescribir estado de seguridad leído previamente. | Todos los escritores bloquean la fila del usuario en orden uniforme; el consumo TOTP y la emisión del JWT comparten la misma transacción. | `UserManagementServiceImpl.java`, `AuthServiceImpl.java`, repositorios |
| Replay o abuso del token temporal (**MEDIA**) | No existía challenge. | Hash en base de datos, TTL corto, invalidación, consumo y control de intentos. | `TwoFactorChallengeService.java`, `TwoFactorChallengeEntity.java` |
| Challenge sobrevivía a un cambio de contraseña (**MEDIA**) | Un primer factor ya comprobado podía seguir canjeándose durante su TTL. | Reset, cambio de contraseña y desactivación invalidan challenges pendientes dentro de la transacción bloqueada. | `UserManagementServiceImpl.java` |
| JWT sin validar emisor (**MEDIA**) | Los servicios comprobaban firma y expiración, pero no el `issuer`. | Todos validan el emisor configurado en `SMARTLOGIX_JWT_ISSUER`. | `SecurityConfig.java` de Gateway e identidades de dominio |
| Error interno expuesto (**MEDIA**) | Una excepción inesperada podía revelar su mensaje. | La respuesta es genérica; el detalle queda en el log del servidor. | `GlobalExceptionHandler.java` |
| Tokens de ejemplo versionados (**MEDIA**) | Colecciones locales conservaban JWT completos. | Los valores sensibles se reemplazaron por variables o campos vacíos. | `docs/SmartLogix/collections/**` |
| Redirección posterior al login manipulable (**MEDIA**) | El destino se tomaba del estado de navegación y la dependencia tenía avisos vigentes. | Solo se aceptan rutas internas conocidas y React Router se actualizó a una versión corregida. | `LoginPage.tsx`, `package.json` |
| Dependencias frontend vulnerables (**MEDIA**) | `npm audit` detectaba avisos en runtime y herramientas de prueba. | React Router y Vitest se actualizaron; el escaneo final informa cero vulnerabilidades. | `package.json`, `package-lock.json` |
| Cabeceras web insuficientes (**BAJA**) | Nginx no declaraba una política defensiva completa. | Se agregaron CSP, `nosniff`, `DENY`, referrer y permissions policy. | `frontend/nginx.conf` |

La clave JWT y las credenciales que estuvieron versionadas deben considerarse comprometidas aunque ya no aparezcan en el árbol actual. Gitleaks no encontró secretos en el árbol final, pero el barrido de los 12 commits detectó cinco JWT históricos. Para que la corrección sea efectiva, use una `SMARTLOGIX_JWT_SECRET` nueva y cambie las contraseñas de cualquier base o volumen preexistente; no reutilice los valores históricos.

## Riesgos conocidos que no se presentan como corregidos

- El JWT definitivo continúa en `sessionStorage`; una vulnerabilidad XSS podría leerlo. La CSP reduce superficie, pero no sustituye una cookie `HttpOnly`.
- El logout sigue siendo local y no revoca JWT ya emitidos.
- HS256 obliga a compartir la clave de firma con Gateway y microservicios; comprometer un verificador permitiría firmar tokens. En producción conviene RS256 o ES256 con la clave privada únicamente en Identity.
- El rate limiter es apropiado para la demostración local y una sola instancia, pero su estado está en memoria.
- Los endpoints Actuator locales aún muestran detalles de health y las rutas del Gateway; deberían reducirse o protegerse fuera del laboratorio.
- `spring.jpa.hibernate.ddl-auto=update` simplifica el laboratorio; una operación productiva debería usar migraciones versionadas.

# 5. Archivos modificados

La lista se agrupa por responsabilidad para que la revisión sea trazable sin repetir cada archivo homólogo.

## Raíz e infraestructura local

- `.env.example`: inventario de variables requeridas sin valores reales.
- `.gitignore`: excluye `.env` y configuraciones locales.
- `docker-compose.yml`: construye los cinco servicios Java y el frontend, y levanta PostgreSQL, RabbitMQ y pgAdmin con healthchecks y credenciales del entorno.
- `start-smartlogix.bat`: valida Docker/Compose, levanta el stack completo y conserva el modo `--dry-run`.
- `README.md`: entrada segura al proyecto y enlace a esta guía.

## Identity Service

- `pom.xml`: incorpora `otp-java`.
- `application.properties`, `JwtProperties.java`, `SecurityConfig.java`: secretos externos, emisor JWT y permisos exactos para endpoints públicos/protegidos.
- `DataSeeder.java`: elimina passwords predeterminados y hace el seed explícito.
- `UserEntity.java`, `UserRepository.java`, `UserMapper.java`, `UserResponse.java`: estado 2FA, secretos cifrados, contador anti-replay, consultas con lock y exposición segura del estado booleano.
- `TwoFactorChallengeEntity.java`, `TwoFactorChallengeRepository.java`: persistencia del challenge temporal mediante hash, expiración e invalidación.
- `AuthService.java`, `AuthServiceImpl.java`, `AuthController.java`, `LoginResponse.java`: login bifásico y emisión diferida del JWT.
- `TwoFactorManagementService.java`, `TwoFactorManagementServiceImpl.java`, `TwoFactorChallengeService.java`: activación, confirmación, desactivación y finalización del login.
- `TotpService.java`, `TwoFactorSecretEncryptionService.java`, `TwoFactorCryptoConfig.java`, `TwoFactorProperties.java`: generación/verificación TOTP, URI `otpauth`, cifrado y TTL/límites configurables.
- `PasswordAuthenticationVerifier.java`, `AuthenticationAttemptRateLimiter.java`: comparación anti-enumeración y bloqueo temporal.
- DTO de `request/response` 2FA y excepciones de dominio 2FA: contratos validados y errores controlados.
- `GlobalExceptionHandler.java`: respuestas 2FA, `429 Retry-After` y error interno genérico.
- `README.md` y pruebas bajo `src/test`: configuración operativa y cobertura automatizada de seguridad.

## Gateway y servicios de dominio

- `api-gateway/**/SecurityConfig.java`: permite exactamente los dos POST públicos del login, protege administración 2FA y valida `issuer`.
- `inventory-service`, `order-service` y `shipping-service`: cada `SecurityConfig.java` valida emisor; cada `application.properties` obtiene JWT, base de datos y RabbitMQ desde el entorno.
- Pruebas de contexto y README de cada servicio: fixtures sin secretos reales y documentación de arranque segura.

## Frontend

- `package.json`, `package-lock.json`: incorporan `qrcode.react` y actualizan React Router/Vitest a versiones sin avisos en `npm audit`.
- `AuthProvider.tsx`, `AuthContext.ts`, `authApi.ts`: distinguen challenge 2FA de sesión definitiva y nunca guardan el token temporal en storage persistente.
- `LoginPage.tsx`: presenta correo/contraseña y luego código de seis dígitos; limpia la contraseña y restringe retornos internos.
- `TwoFactorSettingsCard.tsx`, `SettingsPage.tsx`: activar, mostrar QR, confirmar y desactivar con contraseña actual.
- `apiTypes.ts`, `apiSchemas.ts`, `usersApi.ts`: contratos discriminados y validación de respuestas.
- `httpClient.ts`, `apiErrors.ts`: manejo seguro de `401`, expiración y `429` sin cerrar una sesión válida por un fallo de configuración 2FA.
- Pruebas `LoginPage.test.tsx`, `TwoFactorSettingsCard.test.tsx`, `apiErrors.test.ts` y ajustes de permisos/rutas: verifican UX y contratos críticos.
- `nginx.conf`: cabeceras de seguridad para el build servido por contenedor.

## Colecciones y documentación

- `docs/SmartLogix/collections/**` y respaldos Bruno: eliminan tokens y passwords versionados, usando variables locales.
- `docs/demo-flujo-completo.md`: adecua la demostración al login fortificado.
- `docs/SECURITY_2FA.md`: informe final, operación y demo reproducible.

# 6. Dependencias agregadas y actualizadas

| Nombre | Versión final | Cambio | Motivo |
|---|---:|---|---|
| `com.github.bastiaanjansen:otp-java` | `2.2.0` | Agregada | Generar secretos criptográficos, construir URI `otpauth://`, validar TOTP estándar y usar almacenamiento de contador contra replay sin implementar criptografía propia. |
| `qrcode.react` | `4.2.0` | Agregada | Renderizar en React el SVG QR a partir de la URI entregada por el backend; el frontend no genera ni valida TOTP. |
| `react-router-dom` | `7.18.3` | Actualizada desde `6.30.1` | Retirar avisos de seguridad del router conservando las APIs usadas por la SPA. |
| `vitest` / `@vitest/coverage-v8` | `5.0.0` | Actualizadas desde `4.1.7` | Retirar el aviso de lectura arbitraria de archivos en el entorno de pruebas. |

El cifrado AES-256-GCM reutiliza Spring Security Crypto, que ya forma parte del stack. No se agregó un servicio externo ni una dependencia cloud.

# 7. Cómo probarlo

## 7.1 Requisitos

- Java 21.
- Node.js 22.12 o posterior.
- Docker Desktop con Docker Compose.
- Una app TOTP: Google Authenticator, Microsoft Authenticator, Authy o equivalente.
- Reloj automático habilitado tanto en el computador como en el teléfono.

## 7.2 Configuración desde cero

Desde PowerShell, en la raíz del repositorio:

```powershell
Copy-Item .env.example .env
```

Genere valores criptográficamente aleatorios. Estos comandos solo muestran valores para copiarlos en el `.env` local:

```powershell
function New-SecureBase64([int] $byteCount) {
    $buffer = New-Object byte[] $byteCount
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($buffer) } finally { $generator.Dispose() }
    [Convert]::ToBase64String($buffer)
}

function New-SecureHex([int] $byteCount) {
    $buffer = New-Object byte[] $byteCount
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($buffer) } finally { $generator.Dispose() }
    ([BitConverter]::ToString($buffer)).Replace('-', '').ToLowerInvariant()
}

"DB (copiar en SMARTLOGIX_DB_PASSWORD): $(New-SecureBase64 24)"
"RabbitMQ (copiar en SMARTLOGIX_RABBITMQ_PASSWORD): $(New-SecureBase64 24)"
"pgAdmin (copiar en SMARTLOGIX_PGADMIN_PASSWORD): $(New-SecureBase64 24)"
"JWT (copiar en SMARTLOGIX_JWT_SECRET): $(New-SecureBase64 48)"
"Cifrado 2FA (copiar en SMARTLOGIX_2FA_ENCRYPTION_PASSWORD): $(New-SecureBase64 32)"
"Salt 2FA (copiar en SMARTLOGIX_2FA_ENCRYPTION_SALT): $(New-SecureHex 16)"
```

Abra `.env` y complete **todos** los campos secretos vacíos. El JWT debe tener al menos 64 caracteres; la password de cifrado 2FA, al menos 32; el salt debe ser hexadecimal, de longitud par y con al menos 16 caracteres. No copie `.env` a mensajes, capturas o Git.

Para una base Identity nueva y una demostración reproducible, active el seed y defina sus propias cuentas en el mismo `.env`:

```dotenv
SMARTLOGIX_SEED_ENABLED=true
SMARTLOGIX_SEED_ADMIN_EMAIL=<correo-admin-local>
SMARTLOGIX_SEED_ADMIN_PASSWORD=<clave-admin-segura>
SMARTLOGIX_SEED_OPERATOR_EMAIL=<correo-operador-local>
SMARTLOGIX_SEED_OPERATOR_PASSWORD=<clave-operador-segura>
SMARTLOGIX_SEED_VIEWER_EMAIL=<correo-lector-local>
SMARTLOGIX_SEED_VIEWER_PASSWORD=<clave-lector-segura>
```

Use contraseñas de 8 a 120 caracteres con, como mínimo, una mayúscula, una minúscula y un número. Si la base ya tiene usuarios, mantenga `SMARTLOGIX_SEED_ENABLED=false`.

El seeder nunca reemplaza usuarios existentes. Si los volúmenes proceden de una versión anterior, cambiar `.env` no rota por sí solo sus credenciales ni los passwords de las cuentas. En una demo completamente descartable puede usar `docker compose down -v` antes de recrear la infraestructura, entendiendo que elimina todos los datos locales; si necesita conservarlos, cambie cada credencial y password mediante su procedimiento administrativo.

Construya y levante el stack completo, esperando a que cada healthcheck confirme disponibilidad:

```powershell
docker compose up -d --build --wait --wait-timeout 300
docker compose ps
```

También puede validar el launcher sin crear ni modificar contenedores:

```powershell
.\start-smartlogix.bat --dry-run
```

El launcher normal ejecuta el mismo arranque completo con Docker Compose:

```powershell
.\start-smartlogix.bat
```

Compruebe:

- Frontend: `http://localhost:5173`.
- Gateway: `http://localhost:8080/actuator/health`.
- Estado agregado: `http://localhost:8080/api/system/health`.
- Identity: `http://localhost:8084/actuator/health`.

## 7.3 Verificación automatizada

Frontend:

```powershell
Set-Location frontend
npm ci
npm run lint
npm run test
npm run build
Set-Location ..
```

Backend:

```powershell
$services = @('identity-service', 'inventory-service', 'order-service', 'shipping-service', 'api-gateway')
foreach ($service in $services) {
    Push-Location $service
    .\mvnw.cmd test
    if ($LASTEXITCODE -ne 0) { throw "Fallaron tests de $service" }
    .\mvnw.cmd package -DskipTests
    if ($LASTEXITCODE -ne 0) { throw "Falló build de $service" }
    Pop-Location
}
```

## 7.4 Matriz de verificación final

| Caso requerido | Resultado | Evidencia |
|---|---|---|
| 1. Contraseña incorrecta rechazada | **PASS** | E2E PostgreSQL: `401`; prueba unitaria de login |
| 2. Usuario sin 2FA obtiene login normal | **PASS** | E2E: `200`, JWT definitivo y `requiresTwoFactor=false` |
| 3. Usuario con 2FA recibe challenge, no JWT | **PASS** | E2E: challenge temporal presente y `accessToken` ausente |
| 4. TOTP válido completa el login | **PASS** | E2E: `200` y JWT final |
| 5. TOTP incorrecto es rechazado | **PASS** | E2E: `401`; el mismo challenge aceptó después el código correcto |
| 6. TOTP expirado es rechazado | **PASS** | `TotpServiceTest` con reloj controlado |
| 7. No se salta 2FA llamando endpoints directamente | **PASS** | Setup directo sin JWT: `401`; el endpoint final exige challenge opaco válido |
| 8. Token temporal inválido es rechazado | **PASS** | Prueba unitaria y E2E: `401` |
| 9. Token temporal expirado es rechazado | **PASS** | `TwoFactorChallengeServiceTest` con expiración controlada |
| 10. QR contiene una URI `otpauth://totp/` válida | **PASS** | Verificado en prueba unitaria y respuesta E2E |
| 11. Authenticator estándar genera códigos aceptados | **INTEROPERABILIDAD PASS / ESCANEO MANUAL** | Generador TOTP independiente aceptado; falta únicamente escanear con el teléfono elegido para la demo |
| 12. Logout continúa funcionando | **PASS** | `authTokenProvider.test.ts`: elimina memoria y `sessionStorage` |
| 13. Rutas protegidas rechazan ausencia de JWT | **PASS** | E2E sobre setup protegido: `401`; configuraciones de seguridad compilan y pasan tests |
| 14. Rate limit responde `429` y `Retry-After` | **PASS** | E2E: cuatro `401`; quinto fallo `429` con espera positiva |
| 15. Challenge/OTP no admite doble consumo concurrente | **PASS** | Dos requests simultáneos contra PostgreSQL real: exactamente `200` + `401` |
| 16. Cambio de contraseña invalida el challenge previo | **PASS** | E2E: cambio `200`; challenge anterior `401`; password antigua/nueva `401`/`200` |
| 17. Respuestas sensibles no se almacenan en caché | **PASS** | E2E confirma `Cache-Control: no-store` en login, setup y emisión final |

# 8. Cómo configurarlo en Authenticator

1. Inicie sesión con una cuenta que aún no tenga 2FA.
2. Abra **Configuración > Mi cuenta**.
3. En **Autenticación de dos factores**, pulse **Activar 2FA**.
4. Desbloquee el teléfono y abra Google Authenticator, Microsoft Authenticator, Authy u otra app TOTP.
5. Elija **Agregar cuenta** y luego **Escanear código QR**. Autorice la cámara si la app lo solicita.
6. Escanee el QR de SmartLogix. La cuenta debería aparecer con el emisor `SmartLogix` y el correo del usuario.
7. Escriba en SmartLogix el código actual de seis dígitos y pulse **Confirmar activación** antes de diez minutos.
8. Confirme que el estado cambia a **Activada**. El QR deja de mostrarse.
9. Espere a que Authenticator genere el siguiente código antes de probar un nuevo login: el código de activación ya fue consumido y no se acepta de nuevo.
10. Cierre sesión, vuelva a ingresar correo y contraseña, y complete el segundo paso con el código vigente.

Si todos los códigos aparecen como expirados, active fecha, hora y zona horaria automáticas en ambos dispositivos. No fotografíe ni comparta el QR: contiene el secreto que genera el segundo factor.

Para retirar la protección, use **Desactivar 2FA** e introduzca la contraseña actual. Pulsar el botón por sí solo no basta.

# 9. Demostración para el profesor

Duración objetivo: 4 minutos 30 segundos. Prepare previamente Docker, los cinco servicios, el frontend y Authenticator. Use una cuenta de demostración sin 2FA y no proyecte el contenido de `.env`.

| Tiempo | Acción | Explicación breve |
|---:|---|---|
| 0:00–0:30 | Muestre el health del Gateway y abra el login. | «Todo se ejecuta localmente; no depende de APIs pagadas ni cloud». |
| 0:30–1:00 | Inicie sesión solo con usuario y contraseña. | «Una cuenta sin 2FA conserva el flujo anterior». |
| 1:00–1:50 | Vaya a **Configuración > Mi cuenta**, pulse **Activar 2FA** y muestre el QR. | «El backend genera TOTP; React solo representa la URI `otpauth`». |
| 1:50–2:30 | Escanee el QR, escriba el primer código y confirme. | «El secreto se activa únicamente después de demostrar que Authenticator quedó configurado». |
| 2:30–3:00 | Muestre **Activada**, espere la rotación del código y cierre sesión. | «El primer OTP ya fue consumido para impedir replay». |
| 3:00–3:35 | Vuelva a escribir usuario y contraseña. | Muestre que aparece el paso **Código de autenticación** y que todavía no se entra al panel. |
| 3:35–4:00 | Introduzca un código incorrecto, por ejemplo seis dígitos que no coincidan. | Muestre el rechazo sin revelar secretos ni emitir sesión. No falle cinco veces para evitar el bloqueo de la demo. |
| 4:00–4:20 | Introduzca el código vigente de Authenticator. | Muestre el acceso al dashboard con el JWT definitivo. |
| 4:20–4:30 | Cierre con las defensas. | «Challenge de cinco minutos, cinco intentos, secreto cifrado, OTP no reutilizable y secretos fuera de Git». |

Plan de contingencia: si el código cambia mientras se escribe, espere el siguiente. No regenere el QR durante la demo salvo que la configuración haya expirado.

# 10. Mejoras opcionales

## Entrega obligatoria implementada

- TOTP estándar con QR y confirmación previa a la activación.
- JWT definitivo emitido solo después del segundo factor.
- Challenge opaco, corto, hasheado, limitado e invalidable.
- Secreto TOTP cifrado en reposo y claves fuera del repositorio.
- Prevención persistente de replay de OTP.
- Rate limiting local, mensajes anti-enumeración y desactivación con contraseña.
- Validación de firma, expiración y emisor JWT en todos los servicios.
- UX de dos pasos y cobertura automatizada de los flujos críticos.

## Evoluciones recomendadas, no necesarias para esta evaluación

1. Mover el JWT a una cookie `HttpOnly`, `Secure` y `SameSite`, con protección CSRF acorde.
2. Implementar refresh tokens rotatorios y revocación para que el logout invalide la sesión en servidor.
3. Llevar el rate limiter a Redis para compartir bloqueos entre instancias y conservarlos tras reinicios.
4. Generar códigos de recuperación de un solo uso y un procedimiento verificado de recuperación de cuenta.
5. Ofrecer WebAuthn/passkeys como segundo factor resistente a phishing.
6. Migrar HS256 a RS256 o ES256, de modo que solo Identity conserve capacidad de firma.
7. Rotar claves con versionado, separar ambientes y usar un gestor de secretos en despliegues reales.
8. Sustituir `ddl-auto=update` por Flyway o Liquibase y restricciones SQL versionadas.
9. Agregar auditoría de eventos de acceso, alertas de abuso y limpieza programada de challenges, siempre sin registrar passwords, QR, secretos ni OTP.
10. Automatizar E2E PostgreSQL concurrente en CI, escaneo de dependencias y detección de secretos.
11. Ocultar detalles de health y proteger o deshabilitar `/actuator/gateway/routes` fuera del laboratorio.
