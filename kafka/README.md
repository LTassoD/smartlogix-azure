# Kafka — Streaming de eventos de pedidos (EP3)

Capa de **streaming en tiempo real** de SmartLogix. No reemplaza a Service Bus
(la coreografía transaccional de la EP2 sigue intacta): se suma como **segundo
destino del mismo evento**, patrón *dual publish*.

```
order-service ──► Service Bus   (coreografía: inventory + shipping)   [EP2]
      └──► Kafka: smartlogix.orders.events  (3 particiones, key=orderNumber)
                    │
                    ├──► consumer_metrics.py   → dashboard en consola (flujo continuo)
                    └──► analytics-service     → métricas agregadas + SSE   [Fase 2]
```

## Requisitos

- Docker (Desktop en local, o Docker en la VM)
- Python 3.11+ con `confluent-kafka`

```bash
python -m pip install confluent-kafka
```

## Arranque en local (Fase 0)

```bash
# 1) Kafka en modo KRaft (un solo contenedor, sin Zookeeper)
docker compose -f kafka/docker-compose.kafka.yml up -d

# 2) Crear el topic (idempotente)
python kafka/crear_topic.py

# 3) Consumidor con métricas (dejarlo corriendo en una terminal)
python kafka/consumer_metrics.py

# 4) Productor de pedidos (en otra terminal)
python kafka/producer_orders.py
```

El consumidor redibuja el dashboard cada segundo. Para ver el flujo en formato
lineal (logs/video): `python kafka/consumer_metrics.py --plain`.

## Diseño del topic

| Propiedad | Valor | Por qué |
|---|---|---|
| Topic | `smartlogix.orders.events` | nombre por dominio: un topic por tipo de evento de negocio |
| Particiones | **3** | permite escalar consumidores en paralelo (hasta 3 en el mismo grupo) |
| Key | `orderNumber` | todas las versiones de un pedido caen en la **misma partición** → orden garantizado por pedido |
| Retención | 7 días | permite reprocesar (replay) y arrancar un consumidor nuevo con histórico |
| Réplicas | 1 | un solo broker (KRaft local); en producción serían 3 |
| Auto-create | deshabilitado | el topic se declara explícitamente: el contrato no queda al azar |

El payload es **idéntico** al DTO `OrderCreatedEvent` del proyecto
(`orderId`, `orderNumber`, `customerId`, `totalAmount`, `items[]`, `createdAt`),
así que la Fase 1 solo tiene que agregar el `KafkaTemplate` al publicador existente.

## Métricas que muestra el consumidor

- Eventos totales y **velocidad** (eventos/s, últimos 10 s)
- **Pedidos por minuto** (ventana deslizante configurable con `--window`)
- **Ingreso acumulado** y **ticket promedio** (CLP)
- **Top 5 productos** por unidades e ingreso
- **Lag** del consumidor (mensajes pendientes por partición)
- Últimos 5 eventos recibidos (la "cinta" del flujo)

## Opciones útiles

```bash
# Productor: ritmo controlado o cantidad fija
python kafka/producer_orders.py --rate 20          # ~20 pedidos/s
python kafka/producer_orders.py --count 100        # 100 y termina

# Consumidor: ventana, grupo, modo texto
python kafka/consumer_metrics.py --window 30
python kafka/consumer_metrics.py --group ep3-metrics-2
python kafka/consumer_metrics.py --plain --solo-nuevos
```

`--solo-nuevos` ignora el histórico del topic (`auto.offset.reset=latest`); por
defecto se usa `earliest`, de modo que un grupo nuevo consume todo lo que haya.

## Verificación manual

```bash
# estado del topic
docker exec smartlogix-kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --describe --topic smartlogix.orders.events

# grupos y lag
docker exec smartlogix-kafka /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --describe --group ep3-metrics

# leer el topic a mano
docker exec -it smartlogix-kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic smartlogix.orders.events \
  --property print.key=true --from-beginning
```

## En la VM (Fase 3)

Kafka se agrega al stack existente con los dos archivos compose:

```bash
docker compose -f docker-compose.yml -f kafka/docker-compose.kafka.yml up -d
```

Los listeners ya están preparados para ambos entornos:

- `localhost:9092` → scripts en el host
- `kafka:29092` → contenedores de la misma red (`analytics-service`)

## Estado

- [x] **Fase 0** — Kafka + topic + productor/consumidor con dashboard
- [ ] **Fase 1** — dual publish desde `order-service` (spring-kafka)
- [ ] **Fase 2** — `analytics-service` (métricas agregadas + SSE) y dashboard web
- [ ] **Fase 3** — despliegue en la VM, video y PPT
