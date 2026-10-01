package cl.duoc.smartlogix.shipping.presentation.controller;

import cl.duoc.smartlogix.shipping.application.service.ShipmentService;
import cl.duoc.smartlogix.shipping.domain.enums.ShipmentStatus;
import cl.duoc.smartlogix.shipping.presentation.dto.request.AssignCarrierRequest;
import cl.duoc.smartlogix.shipping.presentation.dto.request.CreateShipmentRequest;
import cl.duoc.smartlogix.shipping.presentation.dto.request.UpdateShipmentStatusRequest;
import cl.duoc.smartlogix.shipping.presentation.dto.response.ShipmentResponse;
import cl.duoc.smartlogix.shipping.presentation.dto.response.ShipmentStatusHistoryResponse;
import cl.duoc.smartlogix.shipping.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/shipping/shipments")
@Tag(name = "Envios", description = "Gestion de envios, transportistas asignados y estados")
public class ShipmentController {

    private final ShipmentService shipmentService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ShipmentResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.<List<ShipmentResponse>>builder()
                .success(true)
                .message("Shipments found")
                .data(shipmentService.findAll())
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ShipmentResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<ShipmentResponse>builder()
                .success(true)
                .message("Shipment found")
                .data(shipmentService.findById(id))
                .build());
    }

    @GetMapping("/number/{shipmentNumber}")
    public ResponseEntity<ApiResponse<ShipmentResponse>> findByShipmentNumber(@PathVariable String shipmentNumber) {
        return ResponseEntity.ok(ApiResponse.<ShipmentResponse>builder()
                .success(true)
                .message("Shipment found")
                .data(shipmentService.findByShipmentNumber(shipmentNumber))
                .build());
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<ApiResponse<ShipmentResponse>> findByOrderId(@PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.<ShipmentResponse>builder()
                .success(true)
                .message("Shipment found")
                .data(shipmentService.findByOrderId(orderId))
                .build());
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<ApiResponse<List<ShipmentResponse>>> findByStatus(@PathVariable ShipmentStatus status) {
        return ResponseEntity.ok(ApiResponse.<List<ShipmentResponse>>builder()
                .success(true)
                .message("Shipments found")
                .data(shipmentService.findByStatus(status))
                .build());
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<ApiResponse<List<ShipmentStatusHistoryResponse>>> getHistory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<List<ShipmentStatusHistoryResponse>>builder()
                .success(true)
                .message("Shipment history found")
                .data(shipmentService.getHistory(id))
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ShipmentResponse>> create(@Valid @RequestBody CreateShipmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<ShipmentResponse>builder()
                .success(true)
                .message("Shipment created")
                .data(shipmentService.create(request))
                .build());
    }

    @PatchMapping("/{id}/assign-carrier")
    public ResponseEntity<ApiResponse<ShipmentResponse>> assignCarrier(
            @PathVariable Long id,
            @RequestBody(required = false) AssignCarrierRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<ShipmentResponse>builder()
                .success(true)
                .message("Carrier assignment processed")
                .data(shipmentService.assignCarrier(id, request))
                .build());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ShipmentResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateShipmentStatusRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<ShipmentResponse>builder()
                .success(true)
                .message("Shipment status updated")
                .data(shipmentService.updateStatus(id, request))
                .build());
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<ShipmentResponse>> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<ShipmentResponse>builder()
                .success(true)
                .message("Shipment cancelled")
                .data(shipmentService.cancel(id))
                .build());
    }
}
