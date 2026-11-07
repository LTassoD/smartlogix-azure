# EP3 — Streaming de datos con Kafka: plan por fases

**Evaluación:** EP3 (Nota 3) — Desarrollo Cloud Native I
**Sección:** 003V — entrega **miércoles 18 de noviembre de 2026**
**Objetivo:** sumar a SmartLogix una capa de **streaming en tiempo real** (Apache Kafka en
Docker) integrada al sistema existente y con métricas en vivo, **sin romper la mensajería
de la EP2** (Azure Service Bus).

> Este documento es la fuente de verdad del avance. Cada tarea tiene un ID (`T2.3`, `T3.1`…)
> que se usa en el mensaje de commit, de modo que `git log` y este plan queden amarrados.
> Para tomar una tarea: cambia `_(asignar)_` por tu nombre en un commit
> `docs(ep3): asignar T2.3 a <tu nombre>` (ver [CONTRIBUTING](../CONTRIBUTING.md)).

---

## 1. Estado general

| Fase | Alcance | Estado | Evidencia |
|---|---|---|---|
| **0** | Kafka en Docker (KRaft), topic de pedidos, productor y consumidor con dashboard | ✅ Completada (28-oct) | `af3c395`, `57f6967` |
| **1** | Dual publish: `order-service` publica en Service Bus **y** en Kafka | ✅ Completada (28-oct) | `71aad6f` |
| **2** | `analytics-service` (consumer group, ventana 60 s, REST + SSE) y dashboard React | ✅ Implementada y verificada en local (4-nov) | `b550a59`, `c6b7253`, docs/EP3_STREAMING.md |
| **3** | Despliegue en la VM, video ≤5 min, PPT ≤15 slides y ensayo | 🟡 En curso: despliegue verificado (7-nov); falta video, RUT y ensayo | commits `b6d7ebc`, `9ebe14d`, `1e26bd0`, `23a69a1` |

Leyenda: ✅ hecha · 🟡 en curso · ⬜ pendiente · ⛔ bloqueada.

## 2. Arquitectura objetivo

```
                        ┌──────────────────────────────────────────────┐
   frontend React ────► │ api-gateway :8080                            │
   (dashboard EP3)      └───────┬──────────────────────┬───────────────┘
                                │ REST                 │ REST + SSE
                                ▼                      ▼
                     ┌──────────────────┐   ┌──────────────────────────┐
                     │  order-service   │   │   analytics-service      │
                     │      :8082       │   │        :8085             │
                     └───┬──────────┬───┘   └──────────▲───────────────┘
                         │          │                  │ consumer group
            dual publish │          │                  │ smartlogix-analytics
                         ▼          ▼                  │
        ┌────────────────────┐  ┌──────────────────────────────────────┐
        │ Azure Service Bus  │  │ Kafka (Docker, KRaft) :9092/:29092   │
        │ (EP2: coreografía) │  │ topic smartlogix.orders.events (x3)  │
        └────────────────────┘  └──────────────────────────────────────┘
```

- **Kafka no reemplaza a Service Bus**: se agrega como segundo destino del mismo evento
  (`dual publish`). La coreografía transaccional de la EP2 sigue intacta.
- El topic tiene **3 particiones** y `key = orderNumber`, así que cada pedido cae siempre
  en la misma partición y se procesa en orden.

## 3. Fase 0 — Kafka + demo en local ✅

**Objetivo:** validar Kafka sin tocar Azure ni el código existente.

**Entregables:** `kafka/docker-compose.kafka.yml`, `crear_topic.py`, `producer_orders.py`,
`consumer_metrics.py`, `kafka/README.md`.

**Criterios de aceptación (cumplidos):** contenedor `healthy`; topic con 3 particiones y
retención de 7 días; 60 eventos consumidos con lag 3→0 y 0 errores; dashboard ANSI
renderizando.

| ID | Tarea | Criterio de terminado | Responsable | Estado |
|---|---|---|---|---|
| T0.1 | Kafka 3.9 en modo KRaft (sin Zookeeper), doble listener host/Docker | `docker compose ... up -d` deja el contenedor `healthy` | LTassoD | ✅ |
| T0.2 | Topic `smartlogix.orders.events` idempotente | script crea 3 particiones y retención 7 días | LTassoD | ✅ |
| T0.3 | Productor continuo con el payload real de `OrderCreatedEvent` | 40 pedidos publicados, 0 errores | LTassoD | ✅ |
| T0.4 | Consumidor con métricas y dashboard | eventos/s, pedidos/min, ingreso, top 5, lag y últimos eventos | LTassoD | ✅ |
| T0.5 | Documentar arranque, diseño del topic y verificación | `kafka/README.md` completo | LTassoD | ✅ |

## 4. Fase 1 — Dual publish desde `order-service` ✅

**Objetivo:** que el evento que ya viaja a Service Bus se publique también en Kafka, con
fallo aislado (si Kafka cae, el pedido no se ve afectado).

**Entregables:** `KafkaConfig`, `OrderEventPublisher` con dos destinos,
`spring-boot-starter-kafka`, propiedades `smartlogix.kafka.*`, variables en
`docker-compose.yml` y test de integración.

**Criterios de aceptación (cumplidos):** `mvn test` 8/8 en verde; test real contra broker
que valida key, headers y payload; log que demuestra el aislamiento cuando Service Bus
falla; kafka y el stack comparten la red `smartlogix-net`.

| ID | Tarea | Criterio de terminado | Responsable | Estado |
|---|---|---|---|---|
| T1.1 | Dependencia `spring-boot-starter-kafka` (Boot 4 la separó de `spring-kafka`) | el contexto de Spring levanta con `KafkaTemplate` | LTassoD | ✅ |
| T1.2 | Constantes de headers `eventType` / `orderNumber` / `source` | `KafkaConfig` documentado | LTassoD | ✅ |
| T1.3 | `OrderEventPublisher` con `publicarEnServiceBus` + `publicarEnKafka` | un solo serializado, key = `orderNumber`, fallo aislado | LTassoD | ✅ |
| T1.4 | Propiedades y compose (`SMARTLOGIX_KAFKA_*`, red compartida) | `docker compose config` muestra `kafka:29092` | LTassoD | ✅ |
| T1.5 | Test de integración contra broker real | valida key, headers y payload; se salta si no hay Kafka | LTassoD | ✅ |
| T1.6 | Converter JWT como clase anónima (tipos genéricos visibles) | el contexto arranca con el post-procesador de Kafka | LTassoD | ✅ |

> **Nota de autoría:** la Fase 0 y la 1 quedaron en un solo autor. Para que el historial
> refleje trabajo en equipo, las tareas de la sección 9 permiten aportar desde ya sin
> reescribir lo hecho.

## 5. Fase 2 — `analytics-service` + dashboard web ✅

**Objetivo:** convertir el flujo de Kafka en un producto visible: un microservicio que
consume el topic, agrega métricas en ventanas y las expone por REST y SSE, más una página
en el frontend que se actualiza sola.

**Entregables:** `analytics-service/` (Spring Boot 4, Java 21, puerto 8085), ruta en
`api-gateway`, `frontend/src/features/streaming/`, `docs/EP3_STREAMING.md`.

**Criterios de aceptación:**

1. `docker compose up` levanta `analytics-service` y aparece `healthy` en `/actuator/health`.
2. Un pedido publicado por `order-service` se refleja en el dashboard en **≤ 2 s**.
3. `GET /api/analytics/metrics` devuelve el snapshot y `GET /api/analytics/stream` emite
   eventos SSE cada 1–2 s.
4. El frontend muestra tarjetas, top de productos y gráfico, con indicador de conexión y
   reconexión automática al cortar el stream.
5. Tests verdes en backend y frontend; sin secretos en el repo.

| ID | Tarea | Criterio de terminado | Responsable | Estado |
|---|---|---|---|---|
| T2.1 | Esqueleto de `analytics-service` (pom, aplicación, actuator, Dockerfile) | arranca en :8085 y responde `/actuator/health` | LTassoD (base) | ✅ |
| T2.2 | Consumidor Kafka con grupo `smartlogix-analytics` y Jackson 3 | consume `smartlogix.orders.events`; mensaje inválido → log y sigue | LTassoD (base) | ✅ |
| T2.3 | Agregador con ventana deslizante de 60 s | pedidos/min, ingreso, ticket promedio, top 5, distribución por partición | LTassoD (base) | ✅ |
| T2.4 | API REST `GET /api/analytics/metrics` + tests del agregador | snapshot estable con reloj inyectable; tests unitarios | LTassoD (base) | ✅ |
| T2.5 | Stream SSE `GET /api/analytics/stream` | emite cada 1–2 s, cierra limpio y soporta reconexión | LTassoD (base) | ✅ |
| T2.6 | Página React `features/streaming` (tarjetas, top, Recharts) | datos en vivo, estado de conexión, diseño consistente | LTassoD (base) | ✅ |
| T2.7 | Ruta, menú, permisos y ruta del gateway | accesible solo con sesión y rol permitido | LTassoD (base) | ✅ |
| T2.8 | Pruebas de integración y smoke E2E | `producer_orders.py --rate 5` visible en el dashboard; tests verdes | LTassoD (base) | ✅ |
| T2.9 | Documento `docs/EP3_STREAMING.md` (arquitectura, API, operación) | otro integrante puede levantarlo siguiendo el doc | LTassoD (base) | ✅ |

## 6. Fase 3 — Despliegue, video y PPT ⬜

**Objetivo:** dejar la demo funcionando en la VM y cerrar los entregables de la evaluación.

**Entregables:** imágenes en ACR (`analytics-service`), compose en la VM con Kafka,
evidencia de pedido real (Service Bus + Kafka + dashboard), video ≤5 min, PPT ≤15 slides
(fondo blanco, logo DUOC-UC, integrantes con nombre y RUT) y repo público verificado.

**Criterios de aceptación:**

1. En la VM: pedido real → evento en Service Bus **y** en Kafka → dashboard actualizado.
2. Consumo de memoria medido y dentro de la VM D2s_v4 (8 GB).
3. Video de ≤5 min mostrando frontend y backend (MVP).
4. PPT de ≤15 slides con arquitectura, justificación, flujos de APIs, mensajería y Kafka.
5. Link del repositorio público, sin credenciales, con README actualizado.

| ID | Tarea | Criterio de terminado | Responsable | Estado |
|---|---|---|---|---|
| T3.1 | Dockerfile y build/push a ACR de `analytics-service` | imagen `:azure` desplegable | LTassoD | ✅ |
| T3.2 | Compose en la VM (stack + Kafka) con límites de memoria | `docker stats` estable; Kafka con heap acotado | LTassoD | ✅ |
| T3.3 | Verificación en VM con un pedido real | evidencia en logs de Service Bus, Kafka y dashboard | LTassoD | ✅ |
| T3.4 | Guion y grabación del video (≤5 min) | video subido con link público | _(asignar)_ | ⬜ |
| T3.5 | PPT (≤15 slides) con integrantes, arquitectura y flujos | revisada contra la rúbrica | _(asignar)_ | ⬜ |
| T3.6 | Verificar repo público y README final | link abre sin login ni credenciales | _(asignar)_ | ⬜ |
| T3.7 | Ensayo cronometrado y checklist de entrega | demo completa en ≤5 min sin fallas | _(asignar)_ | ⬜ |

## 7. Reparto sugerido

Los nombres se completan al asignar las tareas (cada asignación es un commit propio).

| Perfil | Tareas | Carga estimada |
|---|---|---|
| Backend A | T2.1, T2.2, T2.3 | 8–10 h |
| Backend B | T2.4, T2.5, T2.9 | 6–8 h |
| Frontend | T2.6, T2.7, T2.8 | 8–10 h |
| Infra / DevOps | T3.1, T3.2, T3.3 | 5–7 h |
| Todos | T3.4, T3.5, T3.6, T3.7 | 4–6 h |

La Fase 2 tiene dependencias: T2.2 necesita T2.1; T2.4/T2.5 necesitan T2.3; T2.6 puede
avanzar en paralelo con datos simulados (mock) y conectarse al SSE al final.

## 8. Calendario

| Semana | Fechas | Hito |
|---|---|---|
| 1 | 28 oct – 1 nov | Fases 0 y 1 cerradas; reparto de tareas y ramas creadas |
| 2 | 2 – 8 nov | Backend de la Fase 2 (T2.1–T2.4) |
| 3 | 9 – 12 nov | SSE, dashboard y pruebas (T2.5–T2.9); **cierre Fase 2** |
| 4 | 13 – 16 nov | Despliegue en VM, video y PPT (Fase 3) |
| 5 | 17 – 18 nov | Ensayo, checklist y **entrega (18-nov, sección 003V)** |

## 9. Tareas abiertas para aportar desde ya

Sirven para que el historial muestre trabajo en equipo sin tocar la arquitectura ya
validada:

| ID | Tarea | Criterio de terminado |
|---|---|---|
| T1.7 | Test de `smartlogix.kafka.enabled=false` | el publicador no envía a Kafka y el flujo sigue |
| T1.8 | Script `kafka/verificar_entorno.py` | valida broker, topic y lag en un solo comando |
| T1.9 | Documentar headers y contrato del evento en `docs/API.md` | tabla con `eventType`, `orderNumber`, `source` y payload |
| T0.6 | Exportar métricas del consumidor a CSV | `--csv ruta.csv` con una fila por evento |

## 10. Mapa de commits sugeridos

Formato: `tipo(alcance): T<fase>.<n> descripción en imperativo`.
Ver reglas completas en [CONTRIBUTING](../CONTRIBUTING.md).

| ID | Mensaje sugerido |
|---|---|
| T2.1 | `feat(analytics): T2.1 crear esqueleto de analytics-service con actuator` |
| T2.2 | `feat(analytics): T2.2 consumir smartlogix.orders.events con consumer group propio` |
| T2.3 | `feat(analytics): T2.3 agregar metricas con ventana deslizante de 60 s` |
| T2.4 | `feat(analytics): T2.4 exponer GET /api/analytics/metrics y cubrir el agregador con tests` |
| T2.5 | `feat(analytics): T2.5 emitir metricas en vivo por SSE` |
| T2.6 | `feat(frontend): T2.6 crear pagina de streaming con metricas en vivo` |
| T2.7 | `feat(frontend): T2.7 enlazar streaming en router, menu y gateway` |
| T2.8 | `test(ep3): T2.8 cubrir flujo de streaming de punta a punta` |
| T2.9 | `docs(ep3): T2.9 documentar analytics-service y su operacion` |
| T3.1 | `build(analytics): T3.1 dockerizar analytics-service para ACR` |
| T3.2 | `chore(deploy): T3.2 desplegar Kafka y analytics en la VM con limites de memoria` |
| T3.3 | `docs(ep3): T3.3 registrar evidencia del flujo real en la VM` |
| T3.4 | `docs(ep3): T3.4 agregar guion y enlace del video` |
| T3.5 | `docs(ep3): T3.5 agregar PPT final de la EP3` |
| T3.6 | `docs(ep3): T3.6 verificar repo publico y README de entrega` |
| T3.7 | `docs(ep3): T3.7 checklist de ensayo y entrega` |
| T1.7 | `test(kafka): T1.7 cubrir kafka deshabilitado` |
| T1.8 | `feat(kafka): T1.8 agregar script de verificacion del entorno` |
| T1.9 | `docs(api): T1.9 documentar contrato del evento de pedidos` |
| T0.6 | `feat(kafka): T0.6 exportar metricas del consumidor a CSV` |

## 11. Definición de terminado (DoD)

Una tarea está terminada cuando:

- [ ] El código compila y **los tests pasan** (`mvn test` / `npm test`).
- [ ] Existe **un commit propio** con el ID de la tarea en el mensaje.
- [ ] La documentación afectada está actualizada (README, `docs/` o `kafka/README.md`).
- [ ] No se agregaron secretos (`.env`, claves, tokens, `*.local.properties`).
- [ ] El Pull Request fue revisado por **otro integrante** y fusionado sin squash.

## 12. Cómo se demuestra el trabajo en equipo

- `git shortlog -sne --all` muestra commits por autor.
- Cada PR deja la revisión y la conversación asociada a una tarea del plan.
- La tabla de responsables de este documento se actualiza con commits propios.
- Para el PPT/video: una slide con el reparto de tareas y el resumen de commits por
  integrante es evidencia directa de aporte individual.

## 13. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Kafka consume demasiada RAM en la VM (8 GB) | heap acotado (`KAFKA_HEAP_OPTS=-Xmx512m`), 1 broker, medir con `docker stats` |
| Un servicio no resuelve `kafka:29092` | ambos compose comparten `smartlogix-net`; verificar con `docker compose config` |
| Rebalanceos o duplicados al escalar consumidores | `enable.idempotence=true` en el productor; consumidor idempotente (at-least-once) |
| El SSE se corta al cambiar de red | reconexión automática en el frontend y estado visible |
| Falta de tiempo para la Fase 3 | Fase 2 cerrada el 12-nov; el video y el PPT se preparan en paralelo desde el 13-nov |
| Fecha de entrega | se usa la más temprana: **18-nov** (003V) |
