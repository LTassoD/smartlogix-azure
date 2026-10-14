package cl.duoc.smartlogix.inventory.infrastructure.messaging.dto;

import java.util.List;

/**
 * Peticion sincrona de verificacion de stock (request/reply sobre Service Bus).
 *
 * order-service la envia a smartlogix.stock-check.req y espera la respuesta en
 * smartlogix.stock-check.reply. El record funciona como "contrato" entre ambos
 * servicios: los dos declaran su propia copia, ya que no comparten modulo.
 */
public record StockCheckRequest(
        Long orderId,
        String orderNumber,
        List<Item> items) {

    /** Linea de pedido a verificar. */
    public record Item(Long productId, Long warehouseId, int quantity) {
    }
}
