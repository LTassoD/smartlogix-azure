package cl.duoc.smartlogix.identity.application.service;

import cl.duoc.smartlogix.identity.presentation.dto.request.ChangeOwnPasswordRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.CreateUserRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.ResetUserPasswordRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.UpdateUserRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.UpdateUserRoleRequest;
import cl.duoc.smartlogix.identity.presentation.dto.response.UserResponse;
import java.util.List;

public interface UserManagementService {

    List<UserResponse> findAll();

    UserResponse findById(Long id);

    UserResponse create(CreateUserRequest request);

    UserResponse update(Long id, UpdateUserRequest request, String currentUserEmail);

    UserResponse updateRole(Long id, UpdateUserRoleRequest request);

    UserResponse resetPassword(Long id, ResetUserPasswordRequest request);

    void changeOwnPassword(String email, ChangeOwnPasswordRequest request);

    UserResponse deactivate(Long id, String currentUserEmail);
}
