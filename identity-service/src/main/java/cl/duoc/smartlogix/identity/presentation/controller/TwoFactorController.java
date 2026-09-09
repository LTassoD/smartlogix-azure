package cl.duoc.smartlogix.identity.presentation.controller;

import cl.duoc.smartlogix.identity.application.service.TwoFactorManagementService;
import cl.duoc.smartlogix.identity.presentation.dto.request.DisableTwoFactorRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.TwoFactorCodeRequest;
import cl.duoc.smartlogix.identity.presentation.dto.response.TwoFactorSetupResponse;
import cl.duoc.smartlogix.identity.presentation.dto.response.TwoFactorStatusResponse;
import cl.duoc.smartlogix.identity.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth/2fa")
@Tag(name = "Autenticación de dos factores", description = "Configuración y control de TOTP")
public class TwoFactorController {

    private final TwoFactorManagementService twoFactorManagementService;

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<TwoFactorStatusResponse>> status(@AuthenticationPrincipal Jwt jwt) {
        return ok("Estado 2FA", twoFactorManagementService.status(jwt.getSubject()));
    }

    @PostMapping("/setup")
    public ResponseEntity<ApiResponse<TwoFactorSetupResponse>> setup(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(ApiResponse.<TwoFactorSetupResponse>builder()
                .success(true)
                .message("Escanea el código QR y confirma el código antes de que expire")
                .data(twoFactorManagementService.setup(jwt.getSubject()))
                .build());
    }

    @PostMapping("/verify-setup")
    public ResponseEntity<ApiResponse<TwoFactorStatusResponse>> verifySetup(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody TwoFactorCodeRequest request
    ) {
        twoFactorManagementService.verifySetup(jwt.getSubject(), request.getCode());
        return ok("2FA habilitado", twoFactorManagementService.status(jwt.getSubject()));
    }

    @PostMapping("/disable")
    public ResponseEntity<ApiResponse<TwoFactorStatusResponse>> disable(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody DisableTwoFactorRequest request
    ) {
        twoFactorManagementService.disable(jwt.getSubject(), request.getCurrentPassword());
        return ok("2FA deshabilitado", twoFactorManagementService.status(jwt.getSubject()));
    }

    private ResponseEntity<ApiResponse<TwoFactorStatusResponse>> ok(
            String message,
            TwoFactorStatusResponse response
    ) {
        return ResponseEntity.ok(ApiResponse.<TwoFactorStatusResponse>builder()
                .success(true)
                .message(message)
                .data(response)
                .build());
    }
}
