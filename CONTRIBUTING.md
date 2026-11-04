# Cómo contribuir a SmartLogix

Este documento describe cómo trabajar en el repositorio durante la EP3. El avance se
organiza por tareas del [plan por fases](docs/EP3_PLAN_FASES.md), y cada tarea tiene un ID
(`T2.3`, `T3.1`…) que se usa en los mensajes de commit.

## 1. Configura tu identidad

Antes de tu primer commit, usa tu propio nombre y correo. Así el historial muestra quién
hizo cada cambio:

```bash
git config user.name "Tu Nombre"
git config user.email "tu-correo@ejemplo.com"
```

Verifica con `git config user.name`. No hagas commits con la cuenta de otro integrante.

## 2. Accede al repositorio

- **Con permiso de escritura:** clona el repositorio y trabaja en una rama.
- **Sin permiso:** haz un fork, trabaja en tu copia y abre un Pull Request hacia la rama de
  integración del repositorio original.

## 3. Ramas

- La rama de integración de la EP3 es `azure-servicebus`. Crea tu rama desde ella:

```bash
git checkout azure-servicebus
git pull origin azure-servicebus
git checkout -b feat/ep3-t2-1-analytics-esqueleto
```

- Nombres: `feat/`, `fix/`, `docs/`, `test/` seguido de una descripción corta y, si aplica,
  el ID de tarea (`feat/ep3-t2-2-consumidor-kafka`).
- No hagas push directo a `main` ni a `azure-servicebus`.

## 4. Mensajes de commit

Formato:

```
tipo(alcance): T<fase>.<n> descripción en imperativo
```

Tipos habituales: `feat`, `fix`, `docs`, `test`, `build`, `chore`, `refactor`.

Ejemplos:

```
feat(analytics): T2.1 crear esqueleto de analytics-service con actuator
feat(frontend): T2.6 crear pagina de streaming con metricas en vivo
docs(ep3): T3.5 agregar PPT final de la EP3
```

Reglas:

- **Un commit por cambio lógico.** Si una tarea tiene varios pasos, usa varios commits.
- **Incluye el ID de la tarea** en el mensaje.
- **No mezcles** cambios de formato con cambios de lógica en el mismo commit.
- **No incluyas secretos**: `.env`, claves, contraseñas, tokens, `*.local.properties`.
- **No reescribas el historial compartido** (`push --force` sobre `azure-servicebus`).

## 5. Tomar una tarea

1. Abre [docs/EP3_PLAN_FASES.md](docs/EP3_PLAN_FASES.md) y busca una tarea con
   `_(asignar)_` en la columna de responsable.
2. Reclámala con un commit propio que cambie `_(asignar)_` por tu nombre:

   ```
   docs(ep3): asignar T2.3 a <tu nombre>
   ```

3. Trabaja la tarea en tu rama y abre el Pull Request.

## 6. Pull Requests

- Apunta el PR a `azure-servicebus`.
- Usa la plantilla que aparece al abrir el PR. Indica el ID de la tarea y cómo lo probaste.
- Pide revisión a **otro integrante**.
- Fusiona con **merge commit, sin squash**, para conservar la autoría de cada commit.

## 7. Verificación antes de hacer push

| Área | Comando |
|---|---|
| `order-service` | `cd order-service && mvn test` |
| `frontend` | `cd frontend && npm test` y `npm run build` |
| Kafka local | `docker compose -f kafka/docker-compose.kafka.yml up -d` y luego `python kafka/crear_topic.py` |

Si tu cambio toca el compose principal, valida también:

```bash
docker compose -f docker-compose.yml -f kafka/docker-compose.kafka.yml config
```

## 8. Definición de terminado

Consulta la sección 11 del [plan](docs/EP3_PLAN_FASES.md): tests en verde, commit con el ID
de la tarea, documentación actualizada, sin secretos y PR revisado por otro integrante.
