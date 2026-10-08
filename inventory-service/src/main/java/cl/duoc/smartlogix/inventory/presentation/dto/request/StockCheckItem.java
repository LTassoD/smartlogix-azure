package cl.duoc.smartlogix.inventory.presentation.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Linea de pedido a verificar en el stock check sincrono.
 *
 * order-service envia una lista de estas lineas y inventory-service responde
 * si hay stock suficiente en el almacen indicado.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockCheckItem {

    private Long productId;
    private Long warehouseId;
    private Integer quantity;
}