# EP3 — Streaming en tiempo real: `analytics-service` y dashboard

Este documento describe la Fase 2 del [plan EP3](EP3_PLAN_FASES.md): el microservicio que
consume los pedidos confirmados desde Kafka, calcula métricas sobre una ventana deslizante
de 60 segundos y las publica por REST y por SSE, más la página **Analítica** del frontend.

## 1. Flujo de datos

```
order-service ──► Kafka  smartlogix.orders.events  (3 particiones, key = orderNumber)
                       │
                       ▼  consumer group "smartlogix-analytics"
                 analytics-service :8085
                 ├─ OrderEventConsumer  → OrderEventParser → MetricsAggregator (ventana 60 s)
                 ├─ GET /api/analytics/metrics   (foto actual)
                 └─ GET /api/analytics/stream    (SSE, evento "metrics" cada 1 s)
                       ▲
api-gateway :8080 ─────┘  (JWT obligatorio en /api/**)
                       ▲
frontend /analitica ───┘  (fetch + Authorization, reconexión automática)
```

`order-service` publica el mismo evento en Service Bus (coreografía de la EP2) y en Kafka
(dual publish de la Fase 1). Esta página no altera ese flujo: solo consume.

## 2. Contrato de la API

### `GET /api/analytics/metrics`

Respuesta `200` (JSON):

| Campo | Tipo | Descripción |
|---|---|---|
| `generatedAt` | ISO-8601 | Momento de la foto |
| `windowSeconds` | int | Tamaño de la ventana (60 por defecto) |
| `totalEvents` | long | Pedidos recibidos desde que arrancó el servicio |
| `totalRevenue` | decimal | Ingreso acumulado desde el arranque |
| `eventsPerSecond` | double | Velocidad de llegada en los últimos 10 s |
| `ordersInWindow` | long | Pedidos dentro de la ventana |
| `revenueInWindow` | decimal | Ingreso dentro de la ventana |
| `averageTicket` | decimal | `revenueInWindow / ordersInWindow` (2 decimales) |
| `topProducts` | array | Hasta 5 productos: `productName`, `units`, `revenue` (ordenados por unidades) |
| `eventsByPartition` | objeto | Eventos por partición de Kafka (`"0"`, `"1"`, `"2"`) |

### `GET /api/analytics/stream`

`text/event-stream`. Al conectar envía una foto inmediata y después una cada segundo:

```
event:metrics
data:{"generatedAt":"...","windowSeconds":60,"totalEvents":30,...}
```

Sin token responde `401` (lo exige el gateway).

## 3. Decisiones de diseño

| Decisión | Motivo |
|---|---|
| Consumer group propio `smartlogix-analytics` | No interfiere con otros consumidores del topic; cada grupo lleva su propio offset. |
| `auto-offset-reset=latest` | El dashboard muestra lo que llega en vivo. Con `earliest`, el histórico del topic inflaría la ventana de 60 s. |
| Ventana por **hora de llegada** | El `createdAt` del productor es hora local sin zona; compararlo con el reloj del servidor (UTC en la VM) daría resultados erróneos. |
| Reloj inyectable (`Clock`) | Las pruebas controlan el tiempo y verifican la expiración sin esperar 60 s. |
| `fetch` en vez de `EventSource` en el frontend | `EventSource` no puede enviar la cabecera `Authorization` y el gateway exige JWT. |
| Permiso `dashboard:view` para la página | Evita tocar los roles de identity-service; la analítica es de lectura agregada. |
| Montos como `BigDecimal` | Evita errores de redondeo en dinero. |

## 4. Operación

Requisitos: Kafka en ejecución y el topic creado (ver [kafka/README.md](../kafka/README.md)).

```bash
# 1) Kafka (local)
docker compose -f kafka/docker-compose.kafka.yml up -d
python kafka/crear_topic.py

# 2) analytics-service (desde el directorio del servicio)
cd analytics-service
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run

# 3) Pedidos de prueba
python kafka/producer_orders.py --rate 5

# 4) Verificación
curl http://localhost:8085/actuator/health
curl http://localhost:8085/api/analytics/metrics
```

Con el stack completo: `docker compose -f docker-compose.yml -f kafka/docker-compose.kafka.yml up -d`.
En ese modo el servicio `analytics` consume `kafka:29092` por la red `smartlogix-net`.

Variables de entorno:

| Variable | Default | Uso |
|---|---|---|
| `SMARTLOGIX_KAFKA_BOOTSTRAP` | `localhost:9092` | Broker Kafka |
| `SMARTLOGIX_KAFKA_TOPIC` | `smartlogix.orders.events` | Topic de pedidos |
| `SMARTLOGIX_ANALYTICS_GROUP` | `smartlogix-analytics` | Consumer group |
| `SMARTLOGIX_ANALYTICS_WINDOW_SECONDS` | `60` | Tamaño de la ventana |
| `SMARTLOGIX_ANALYTICS_STREAM_MS` | `1000` | Frecuencia del SSE |
| `SMARTLOGIX_ANALYTICS_SERVICE_URL` | `http://localhost:8085` | (gateway) destino de `/api/analytics/**` |

## 5. Pruebas

| Capa | Qué cubre | Comando |
|---|---|---|
| Agregador | expiración de la ventana, ticket, top 5, velocidad, particiones | `./mvnw test` (en `analytics-service`) |
| Parser | contrato `order.created`, JSON malformado, sin `orderNumber` | `./mvnw test` |
| Hook SSE | cabecera JWT, eventos partidos entre fragmentos, error HTTP, cancelación | `npx vitest run src/features/streaming` |
| Página | estados conectando / en vivo / reconectando y tarjetas | `npx vitest run src/features/streaming` |

Verificación de integración realizada: 30 pedidos publicados con `producer_orders.py` →
`analytics-service` → REST con ingreso, top de productos y distribución por partición;
SSE a través del gateway con JWT entrega eventos sin buffer (6 eventos en 5 s) y responde
`401` sin token.

## 6. Limitaciones conocidas

- **Estado en memoria:** si el servicio se reinicia, la foto de totales se reinicia; los
  mensajes se reprocesan desde el último offset confirmado del grupo.
- **Un solo consumidor activo por partición:** escalar a más réplicas requiere que el
  agregado global se consolide fuera del proceso (por ejemplo, con Redis o una base de datos).
- **Sin persistencia de historial:** el dashboard muestra la ventana actual, no tendencias
  de días anteriores.
- **Puerto 8080 en la máquina de desarrollo:** un listener de Oracle (`TNSLSNR`) lo ocupa;
  para probar el gateway se usó `--server.port=8090`.
