package cl.duoc.smartlogix.identity.application.service;

import cl.duoc.smartlogix.identity.presentation.dto.response.TwoFactorSetupResponse;
import cl.duoc.smartlogix.identity.presentation.dto.response.TwoFactorStatusResponse;

public interface TwoFactorManagementService {

    TwoFactorStatusResponse status(String email);

    TwoFactorSetupResponse setup(String email);

    void verifySetup(String email, String code);

    void disable(String email, String currentPassword);
}
