# Evidencia para defensa SmartLogix

Checklist sugerida para capturas y defensa oral:

- [ ] Login exitoso.
- [ ] Token JWT recibido.
- [ ] Gateway routes visibles.
- [ ] Productos listados.
- [ ] Stock antes de confirmar pedido.
- [ ] Pedido creado.
- [ ] Pedido confirmado.
- [ ] Movimiento `ORDER_OUT` creado.
- [ ] `referenceCode` del movimiento coincide con `orderNumber`.
- [ ] Stock despues del pedido.
- [ ] Envio creado automaticamente por evento.
- [ ] Transportista asignado.
- [ ] Envio en estado `IN_TRANSIT`.
- [ ] Envio en estado `DELIVERED`.
- [ ] Queues RabbitMQ visibles.
- [ ] Tests `BUILD SUCCESS` por servicio.
- [ ] Tablas visibles en pgAdmin.

## Patrones demostrables

- API Gateway / BFF: `api-gateway`.
- Repository Pattern: repositories Spring Data JPA.
- Service Layer: servicios de aplicacion por microservicio.
- DTO Pattern: requests/responses separados de entidades.
- Observer / Event Driven: `OrderCreatedEvent` con RabbitMQ.
- Factory Method: seleccion de transportista en `shipping-service`.
- Fallback: transportista alternativo si el solicitado no esta disponible.
