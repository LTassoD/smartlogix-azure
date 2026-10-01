package cl.duoc.smartlogix.gateway.system;

import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/system")
@Tag(name = "Estado del sistema", description = "Verificacion agregada de servicios SmartLogix")
public class SystemHealthController {

    private final SystemHealthService systemHealthService;

    @GetMapping("/health")
    @Operation(summary = "Consultar estado operacional por servicio")
    public ResponseEntity<SystemHealthResponse> health() {
        return ResponseEntity.ok(systemHealthService.checkHealth());
    }
}
