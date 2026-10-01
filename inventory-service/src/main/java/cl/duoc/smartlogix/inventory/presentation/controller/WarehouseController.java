package cl.duoc.smartlogix.inventory.presentation.controller;

import cl.duoc.smartlogix.inventory.application.service.WarehouseService;
import cl.duoc.smartlogix.inventory.presentation.dto.request.CreateWarehouseRequest;
import cl.duoc.smartlogix.inventory.presentation.dto.response.WarehouseResponse;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/inventory/warehouses")
@Tag(name = "Bodegas", description = "Consulta y creacion de bodegas")
public class WarehouseController {

    private final WarehouseService warehouseService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<WarehouseResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.<List<WarehouseResponse>>builder()
                .success(true)
                .message("Warehouses found")
                .data(warehouseService.findAll())
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WarehouseResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<WarehouseResponse>builder()
                .success(true)
                .message("Warehouse found")
                .data(warehouseService.findById(id))
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WarehouseResponse>> create(@Valid @RequestBody CreateWarehouseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<WarehouseResponse>builder()
                .success(true)
                .message("Warehouse created")
                .data(warehouseService.create(request))
                .build());
    }
}
