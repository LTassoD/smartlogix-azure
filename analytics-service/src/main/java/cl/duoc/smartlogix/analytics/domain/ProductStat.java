package cl.duoc.smartlogix.analytics.domain;

import java.math.BigDecimal;

/** Acumulado por producto dentro de la ventana: unidades vendidas e ingreso. */
public record ProductStat(String productName, long units, BigDecimal revenue) {
}
