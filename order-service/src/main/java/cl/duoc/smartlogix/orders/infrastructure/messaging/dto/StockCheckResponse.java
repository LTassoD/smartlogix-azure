package cl.duoc.smartlogix.orders.infrastructure.messaging.dto;

import java.util.List;

/**
 * Respuesta sincrona de verificacion de stock.
 *
 * La correlacion con la peticion la hace el broker: Service Bus copia el
 * JMSCorrelationID de la peticion al reply, de modo que el cliente puede
 * emparejar respuesta y peticion aunque haya varias en vuelo.
 */
public record StockCheckResponse(
        Long orderId,
        String orderNumber,
        boolean available,
        String detail,
        List<String> insufficient) {
}
