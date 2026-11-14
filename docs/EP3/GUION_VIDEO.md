# Guion del video EP3 (sin audio, ≤ 5 min)

Grabar la pantalla completa con **Win + Alt + R** y el micrófono y el sonido del sistema
desactivados. El video no lleva voz: la explicación se hace en vivo en la reunión de Teams.

## Antes de grabar

- [ ] Docker Desktop encendido y stack local arriba:
      `docker compose -f docker-compose.yml -f docker-compose.local.yml -f kafka/docker-compose.kafka.yml up -d`
- [ ] Topic creado: `python kafka/crear_topic.py`
- [ ] Página abierta en **http://localhost/login** e iniciada sesión (la clave está en tu `.env` local, no en este documento)
- [ ] Editor abierto con los archivos del guion, con el zoom legible
- [ ] Terminal con las pruebas ya ejecutadas (para no esperar en cámara)
- [ ] Notificaciones desactivadas

## Guion

| Tiempo | Qué se muestra | Acción |
|---|---|---|
| 0:00 – 0:20 | Presentación, diapositiva 1 y luego la 5 (arquitectura) | Pasar las diapositivas sin hablar |
| 0:20 – 1:00 | `kafka/docker-compose.kafka.yml`, líneas 15 a 28 | Señalar `KAFKA_PROCESS_ROLES` y `QUORUM_VOTERS`. Luego, en la terminal, `docker ps` mostrando `smartlogix-kafka (healthy)` |
| 1:00 – 1:40 | `kafka/crear_topic.py`, líneas 19 a 22; después `kafka/producer_orders.py`, línea 151 | Mostrar la key `orderNumber`. En la terminal, lanzar `python kafka/producer_orders.py --rate 1` y dejarlo unos 5 segundos |
| 1:40 – 2:30 | `analytics-service/.../messaging/OrderEventConsumer.java`, líneas 25 a 26, y `OrderEventPublisher.java`, método `publicarEnKafka` | Mostrar el listener y el envío a Kafka |
| 2:30 – 3:10 | `analytics-service/.../application/MetricsAggregator.java`, líneas 39 a 48 y 97 a 100; `MetricsStreamBroadcaster.java`, línea 42 | Mostrar la ventana de 60 segundos y el envío cada segundo |
| 3:10 – 3:30 | `frontend/src/features/streaming/hooks/useMetricsStream.ts`, líneas 28 y 39 | Mostrar el `fetch` con el token y la actualización del estado |
| 3:30 – 4:20 | **Demo en vivo** en el navegador: `/analitica` | Mostrar "En vivo", el contador de pedidos subiendo, el gráfico de top productos y las particiones |
| 4:20 – 4:50 | Terminal: resumen de las pruebas | Mostrar que pasan: analytics 9/9, order-service 8/8, frontend 36/36 |
| 4:50 – 5:00 | Diapositiva 15 | Cerrar la grabación |

## Después de grabar

- [ ] Revisar que el video dure **menos de 5 minutos**.
- [ ] Revisar que no tenga audio.
- [ ] Revisar que no aparezca ninguna clave en pantalla (el `.env` no debe verse).
- [ ] Subir el video (Teams, OneDrive o YouTube no listado) y copiar el enlace.
- [ ] Pasar el enlace al equipo para la diapositiva 15.
