package cl.duoc.smartlogix.shipping.presentation.controller;

import cl.duoc.smartlogix.shipping.application.service.CarrierService;
import cl.duoc.smartlogix.shipping.presentation.dto.request.UpdateCarrierAvailabilityRequest;
import cl.duoc.smartlogix.shipping.presentation.dto.response.CarrierResponse;
import cl.duoc.smartlogix.shipping.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/shipping/carriers")
@Tag(name = "Transportistas", description = "Consulta y disponibilidad de transportistas")
public class CarrierController {

    private final CarrierService carrierService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CarrierResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.<List<CarrierResponse>>builder()
                .success(true)
                .message("Carriers found")
                .data(carrierService.findAll())
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CarrierResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<CarrierResponse>builder()
                .success(true)
                .message("Carrier found")
                .data(carrierService.findById(id))
                .build());
    }

    @PatchMapping("/{id}/availability")
    public ResponseEntity<ApiResponse<CarrierResponse>> updateAvailability(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCarrierAvailabilityRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<CarrierResponse>builder()
                .success(true)
                .message("Carrier availability updated")
                .data(carrierService.updateAvailability(id, request))
                .build());
    }
}
