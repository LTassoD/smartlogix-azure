package cl.duoc.smartlogix.inventory.presentation.dto.response;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Respuesta de la verificacion sincrona de stock (request/reply).
 *
 * La construye inventory-service al recibir una peticion de stock check y la
 * consume order-service para decidir si confirma el pedido.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockCheckAvailabilityResponse {

    private Long orderId;
    private String orderNumber;
    private boolean available;
    private String detail;
    private List<String> insufficient;
}