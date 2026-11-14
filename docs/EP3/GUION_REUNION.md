# Guion de la reunión en Teams (exposición en vivo)

Mientras se reproduce el video sin audio, cada integrante explica su parte. La reunión dura
unos 15 a 20 minutos, incluidas preguntas.

## Antes de la reunión

- [ ] Compartir **solo la ventana del video**, no el escritorio completo.
- [ ] No marcar "incluir audio del equipo" (el video no tiene sonido).
- [ ] Tener la diapositiva 2 con los RUT completos.
- [ ] Ensayar una vez con cronómetro, cada uno con su tramo.
- [ ] Tener abierto el repositorio público: https://github.com/LTassoD/smartlogix-azure/tree/azure-servicebus

## Reparto y guion hablado

Los tiempos son aproximados y corresponden al video.

### 1. Luis Tasso (0:00 – 1:00)

- Presentar al equipo y el caso: SmartLogix, un sistema logístico con inventario, pedidos y envíos.
- Explicar el objetivo de la EP3: sumar streaming con Kafka y métricas en vivo sin romper la EP2.
- Mostrar la arquitectura: frontend, gateway, microservicios, Service Bus y Kafka en Docker.

### 2. Mario Grateron (1:00 – 2:30)

- Explicar Kafka en modo KRaft: un solo contenedor, sin Zookeeper, con el broker y el controlador en el mismo proceso.
- Explicar el topic `smartlogix.orders.events`: 3 particiones, retención de 7 días y key `orderNumber`.
- Explicar el productor: genera pedidos con el mismo formato que el `order-service`.

### 3. Jonathan Ferrer (2:30 – 3:10)

- Explicar el consumidor de analítica: consumer group propio, lectura de los eventos y ventana deslizante de 60 segundos.
- Explicar cómo se calcula cada métrica: pedidos, ingreso, ticket promedio, top 5 productos y velocidad.
- Explicar el stream SSE: el servidor envía la foto de las métricas cada segundo.

### 4. Felipe Flores (3:10 – 4:20)

- Explicar el frontend: el hook que recibe el stream, la reconexión y la página de Analítica.
- Dirigir la demo en vivo: mostrar "En vivo", el contador de pedidos y el gráfico de productos.
- Señalar que los datos vienen de Kafka, no de datos simulados en la pantalla.

### 5. Luis Tasso (4:20 – 5:00)

- Mostrar el resultado de las pruebas: 9 de analytics, 8 de order-service y 36 del frontend.
- Cerrar con la conclusión: Kafka se suma al sistema sin reemplazar la mensajería de la EP2.

## Preguntas probables y respuestas

| Pregunta | Respuesta corta |
|---|---|
| ¿Por qué KRaft y no Zookeeper? | Kafka 3.x guarda sus metadatos en sí mismo. Es menos piezas y consume menos RAM. |
| ¿Por qué Kafka además de Service Bus? | Service Bus coordina la transacción del pedido (stock, envíos). Kafka da el flujo continuo para analítica. |
| ¿Qué pasa si Kafka se cae? | El pedido se confirma igual. El fallo solo se registra como advertencia. |
| ¿Por qué SSE y no WebSocket? | El flujo es de servidor a cliente. SSE es más simple y se reconecta solo. |
| ¿Por qué `fetch` y no `EventSource`? | `EventSource` no permite enviar el token JWT en la cabecera. |
| ¿Cómo escala? | Con más particiones y consumidores en el mismo grupo. Hoy hay un solo nodo. |
| ¿Qué limitaciones tiene? | Un solo nodo de Kafka, sin tolerancia a fallos, y el estado de analítica vive en memoria. |

## Después de la reunión

- [ ] Subir el enlace del video y el PPT final.
- [ ] Anotar las preguntas que no se respondieron, para la entrega escrita.
