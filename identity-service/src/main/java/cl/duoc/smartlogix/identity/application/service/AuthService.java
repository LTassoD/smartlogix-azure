package cl.duoc.smartlogix.identity.application.service;

import cl.duoc.smartlogix.identity.presentation.dto.request.LoginRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.CompleteTwoFactorLoginRequest;
import cl.duoc.smartlogix.identity.presentation.dto.response.LoginResponse;
import cl.duoc.smartlogix.identity.presentation.dto.response.UserResponse;

public interface AuthService {

    LoginResponse login(LoginRequest request);

    LoginResponse completeTwoFactorLogin(CompleteTwoFactorLoginRequest request);

    UserResponse findAuthenticatedUser(String email);
}
