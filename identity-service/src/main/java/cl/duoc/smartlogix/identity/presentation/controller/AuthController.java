package cl.duoc.smartlogix.identity.presentation.controller;

import cl.duoc.smartlogix.identity.application.service.AuthService;
import cl.duoc.smartlogix.identity.presentation.dto.request.LoginRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.CompleteTwoFactorLoginRequest;
import cl.duoc.smartlogix.identity.presentation.dto.response.LoginResponse;
import cl.duoc.smartlogix.identity.presentation.dto.response.UserResponse;
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
@RequestMapping("/api/auth")
@Tag(name = "Autenticacion", description = "Inicio de sesion y consulta de usuario autenticado")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.<LoginResponse>builder()
                .success(true)
                .message("Login successful")
                .data(authService.login(request))
                .build());
    }

    @PostMapping("/2fa")
    public ResponseEntity<ApiResponse<LoginResponse>> completeTwoFactorLogin(
            @Valid @RequestBody CompleteTwoFactorLoginRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<LoginResponse>builder()
                .success(true)
                .message("Autenticación de dos factores completada")
                .data(authService.completeTwoFactorLogin(request))
                .build());
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .success(true)
                .message("Authenticated user")
                .data(authService.findAuthenticatedUser(jwt.getSubject()))
                .build());
    }
}
