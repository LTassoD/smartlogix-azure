package cl.duoc.smartlogix.analytics.domain;

import java.math.BigDecimal;

/** Una linea del pedido: producto, unidades e ingreso (cantidad x precio unitario). */
public record ItemSummary(String productName, int quantity, BigDecimal subtotal) {
}
