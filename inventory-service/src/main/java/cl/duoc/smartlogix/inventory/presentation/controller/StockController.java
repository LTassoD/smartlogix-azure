package cl.duoc.smartlogix.inventory.presentation.controller;

import cl.duoc.smartlogix.inventory.application.service.StockService;
import cl.duoc.smartlogix.inventory.presentation.dto.request.CreateStockMovementRequest;
import cl.duoc.smartlogix.inventory.presentation.dto.request.UpdateStockMinimumRequest;
import cl.duoc.smartlogix.inventory.presentation.dto.response.StockMovementResponse;
import cl.duoc.smartlogix.inventory.presentation.dto.response.StockResponse;
import cl.duoc.smartlogix.inventory.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/inventory/stock")
@Tag(name = "Stock", description = "Stock por producto, minimos y movimientos")
public class StockController {

    private final StockService stockService;

    @GetMapping("/product/{productId}")
    public ResponseEntity<ApiResponse<List<StockResponse>>> findStockByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(ApiResponse.<List<StockResponse>>builder()
                .success(true)
                .message("Stock found")
                .data(stockService.findStockByProduct(productId))
                .build());
    }

    @GetMapping("/movements")
    public ResponseEntity<ApiResponse<List<StockMovementResponse>>> findAllMovements() {
        return ResponseEntity.ok(ApiResponse.<List<StockMovementResponse>>builder()
                .success(true)
                .message("Stock movements found")
                .data(stockService.findAllMovements())
                .build());
    }

    @PutMapping("/product/{productId}/warehouse/{warehouseId}/minimum-stock")
    public ResponseEntity<ApiResponse<StockResponse>> updateMinimumStock(
            @PathVariable Long productId,
            @PathVariable Long warehouseId,
            @Valid @RequestBody UpdateStockMinimumRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<StockResponse>builder()
                .success(true)
                .message("Minimum stock updated")
                .data(stockService.updateMinimumStock(productId, warehouseId, request))
                .build());
    }

    @PostMapping("/movements")
    public ResponseEntity<ApiResponse<StockMovementResponse>> createMovement(
            @Valid @RequestBody CreateStockMovementRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<StockMovementResponse>builder()
                .success(true)
                .message("Stock movement created")
                .data(stockService.createMovement(request))
                .build());
    }
}
