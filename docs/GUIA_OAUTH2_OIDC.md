# Guía: Configurando el ejercicio de OAuth2/OIDC

**Asignatura:** DSY1107 — Desarrollo Cloud Native I
**Objetivo:** Comprender cómo funcionan los scopes, el Authorization Code, los tokens y el endpoint /userinfo.

---

## Paso 1: Acceder al OAuth 2.0 Playground

Ingresa a: https://oauth.net/playground/

Esta plataforma permite experimentar con diferentes flujos de OAuth 2.0 utilizando un servidor de autorización simulado.

Flujos disponibles:
- Authorization Code
- Authorization Code + PKCE
- Implicit
- Device Code
- **OpenID Connect** ← el que utilizaremos

Selecciona: **OpenID Connect**

---

## Paso 2: Registrar un cliente y crear un usuario de prueba

Antes de comenzar el flujo será necesario registrar un cliente OAuth.

Selecciona la opción: **Register a Client**

El playground generará automáticamente:
- `client_id`
- `client_secret`
- Un usuario de prueba
- Una contraseña para el usuario

> No es necesario crear una cuenta en la plataforma para realizar este proceso.

**Guarda temporalmente los siguientes datos:**

| Campo | Valor |
|-------|-------|
| client_id | (lo que genere el playground) |
| client_secret | (lo que genere el playground) |
| username | (usuario generado) |
| password | (contraseña generada) |

Estos datos serán utilizados durante el ejercicio.

---

## Paso 3: Construir la solicitud de autorización

Una vez registrado el cliente, el playground mostrará el primer paso del flujo: **Build the authorization URL**

El flujo utiliza parámetros similares a los siguientes:

```
response_type=code
client_id=...
redirect_uri=...
scope=openid profile email
state=...
nonce=...
```

**Parámetros clave:**

| Parámetro | Descripción |
|-----------|-------------|
| `response_type` | Indica que la aplicación desea obtener un **code** (Authorization Code) |
| `client_id` | Identifica a la aplicación que está solicitando autorización |
| `redirect_uri` | Indica dónde debe devolver el servidor de autorización al usuario después de completar la autenticación |
| `scope` | Define los permisos y la información solicitada. Usaremos: `openid profile email` |
| `openid` | Especialmente importante: indica que estamos utilizando **OpenID Connect** y no solamente OAuth 2.0 |
| `state` | Valor utilizado para asociar la solicitud inicial con la respuesta recibida y prevenir ataques **CSRF** |
| `nonce` | Permite vincular la solicitud de autenticación con el ID Token recibido |

El playground genera automáticamente valores para `state` y `nonce`.

---

## Paso 4: Autenticarse con el usuario de prueba

Selecciona: **Authorize**

El navegador será redirigido al servidor de autorización.

Aquí deberás ingresar las credenciales generadas anteriormente:
- **Username:** [usuario generado]
- **Password:** [contraseña generada]

Después de autenticarse, el servidor solicitará autorización para que el cliente pueda acceder a la información solicitada.

---

## Paso 5: Obtener el Authorization Code

Después de completar la autenticación, el servidor redirigirá nuevamente al navegador hacia el cliente.

En la URL aparecerán parámetros similares a:
```
?state=...
&code=...
```

El parámetro `code` corresponde al **Authorization Code**.

Este código representa una autorización temporal que posteriormente será intercambiada por tokens.

**Actividad:** Identifica en la URL:
- `state =`
- `code =`

---

## Paso 6: Verificar el parámetro State

El playground presenta una etapa específica para comprobar que el valor de `state` recibido coincide con el valor generado durante la solicitud inicial.

Compara:
- **state enviado inicialmente**
- **state recibido en el redirect**

Selecciona: **It Matches, Continue!**

> **Reflexión:** ¿Por qué es importante verificar que el `state` recibido sea el mismo que se envió inicialmente? Explica qué tipo de ataque ayuda a prevenir este mecanismo.
>
> **Respuesta:** Previene ataques **CSRF** (Cross-Site Request Forgery). El `state` asegura que la respuesta que recibimos corresponde a una solicitud que **nosotros** iniciamos, no a una que un atacante inyectó maliciosamente.

---

## Paso 7: Intercambiar el Authorization Code por Tokens

Selecciona: **Exchange the Authorization Code**

El cliente realizará una solicitud al endpoint:
```
POST /token
```

El servidor responderá con información similar a:
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "id_token": "...",
  "scope": "openid profile email"
}
```

Hemos completado una de las etapas fundamentales del flujo:
```
Authorization Code → POST /token → Access Token + ID Token
```

---

## Paso 8: Analizar el Access Token y el ID Token

### Access Token
El Access Token permite que la aplicación acceda a **recursos protegidos** en nombre del usuario.

```
Aplicación → Access Token → Recurso protegido
```

### ID Token
El ID Token pertenece a **OpenID Connect** y contiene información relacionada con la **identidad** del usuario.

Formato JWT: `HEADER.PAYLOAD.SIGNATURE`

---

## Paso 9: Analizar el ID Token utilizando JWT.io

Copia el valor de `id_token` y accede a: https://jwt.io/

Pega el token en el apartado correspondiente. Podrás observar tres componentes:

### HEADER
- `alg`: Algoritmo de firma (ej. RS256)
- `kid`: ID de la clave usada

### PAYLOAD (claims)

| Claim | Descripción |
|-------|-------------|
| `iss` | Emisor del token |
| `sub` | Identificador único del usuario |
| `aud` | Audiencia a la que está destinado el token |
| `exp` | Fecha/hora de expiración |
| `iat` | Fecha/hora en que fue emitido |
| `email` | Correo electrónico del usuario (si está incluido) |
| `name` | Nombre del usuario (si está incluido) |
| `amr` | Método de autenticación usado |

### SIGNATURE
Firma digital que garantiza la integridad del token.

---

## Preguntas finales de análisis

1. **¿Quién emitió el token (iss)?** → El servidor de autorización (Identity Provider)
2. **¿Cuál es el identificador del usuario (sub)?** → El email del usuario registrado
3. **¿Cuál es la audiencia (aud)?** → El `client_id` de la aplicación registrada
4. **¿Cuándo expira el token (exp)?** → 25 días después de `iat` (en este caso)
5. **¿Qué diferencia existe entre `iat` y `exp`?** → `iat` = cuándo se emitió, `exp` = cuándo deja de ser válido
6. **¿Por qué el `sub` es preferido como identificador?** → Es único y no cambia aunque el email sí

---

## Ejemplo de ID Token decodificado

```json
{
  "sub": "disgusted-skylark@example.com",
  "name": "Disgusted Skylark",
  "email": "disgusted-skylark@example.com",
  "iss": "https://pk-demo.okta.com/oauth2/default",
  "aud": "dBHr9degOCZ9a3piylCkhcZ4",
  "iat": 1787406464,
  "exp": 1789998464,
  "amr": ["pwd"]
}
```

---

## Referencias

- [OAuth 2.0 Playground](https://oauth.net/playground/)
- [JWT.io — Decodificador JWT](https://jwt.io/)
- [RFC 6749 — OAuth 2.0](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
