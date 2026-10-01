package cl.duoc.smartlogix.identity.presentation.controller;

import cl.duoc.smartlogix.identity.application.service.UserManagementService;
import cl.duoc.smartlogix.identity.presentation.dto.request.ChangeOwnPasswordRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.CreateUserRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.ResetUserPasswordRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.UpdateUserRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.UpdateUserRoleRequest;
import cl.duoc.smartlogix.identity.presentation.dto.response.UserResponse;
import cl.duoc.smartlogix.identity.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
@Tag(name = "Usuarios", description = "Administracion de usuarios, roles y contrasenas")
public class UserController {

    private final UserManagementService userManagementService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.<List<UserResponse>>builder()
                .success(true)
                .message("Usuarios del sistema")
                .data(userManagementService.findAll())
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> create(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .success(true)
                .message("Usuario creado")
                .data(userManagementService.create(request))
                .build());
    }

    @PatchMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changeOwnPassword(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ChangeOwnPasswordRequest request
    ) {
        userManagementService.changeOwnPassword(jwt.getSubject(), request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Contrasena actualizada")
                .data(null)
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .success(true)
                .message("Detalle de usuario")
                .data(userManagementService.findById(id))
                .build());
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> update(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .success(true)
                .message("Usuario actualizado")
                .data(userManagementService.update(id, request, jwt.getSubject()))
                .build());
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<ApiResponse<UserResponse>> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRoleRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .success(true)
                .message("Rol actualizado")
                .data(userManagementService.updateRole(id, request))
                .build());
    }

    @PatchMapping("/{id}/password")
    public ResponseEntity<ApiResponse<UserResponse>> resetPassword(
            @PathVariable Long id,
            @Valid @RequestBody ResetUserPasswordRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .success(true)
                .message("Contrasena actualizada")
                .data(userManagementService.resetPassword(id, request))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> deactivate(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .success(true)
                .message("Usuario desactivado")
                .data(userManagementService.deactivate(id, jwt.getSubject()))
                .build());
    }
}
