package cl.duoc.smartlogix.inventory.application.service;

import cl.duoc.smartlogix.inventory.presentation.dto.request.CreateStockMovementRequest;
import cl.duoc.smartlogix.inventory.presentation.dto.request.StockCheckItem;
import cl.duoc.smartlogix.inventory.presentation.dto.request.UpdateStockMinimumRequest;
import cl.duoc.smartlogix.inventory.presentation.dto.response.StockCheckAvailabilityResponse;
import cl.duoc.smartlogix.inventory.presentation.dto.response.StockMovementResponse;
import cl.duoc.smartlogix.inventory.presentation.dto.response.StockResponse;
import java.util.List;

public interface StockService {

    StockMovementResponse createMovement(CreateStockMovementRequest request);

    StockMovementResponse createOrderOutMovement(
            Long productId,
            Long warehouseId,
            Integer quantity,
            String reason,
            String referenceCode
    );

    List<StockResponse> findStockByProduct(Long productId);

    /**
     * Verifica si hay stock suficiente para cada linea de un pedido.
     *
     * Se usa en el request/reply sincrono de stock check: order-service consulta
     * antes de confirmar y este metodo responde si alcanza el stock por almacen.
     */
    StockCheckAvailabilityResponse checkAvailability(List<StockCheckItem> items);

    StockResponse updateMinimumStock(Long productId, Long warehouseId, UpdateStockMinimumRequest request);

    List<StockMovementResponse> findAllMovements();
}
