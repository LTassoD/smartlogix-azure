package cl.duoc.smartlogix.identity.application.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import cl.duoc.smartlogix.identity.domain.enums.RoleName;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.RoleEntity;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.UserEntity;
import cl.duoc.smartlogix.identity.presentation.dto.response.UserResponse;
import org.junit.jupiter.api.Test;

class UserMapperTest {

    @Test
    void shouldMapUserEntityToResponseWithoutPassword() {
        RoleEntity role = RoleEntity.builder()
                .id(1L)
                .name(RoleName.ADMIN)
                .description("Admin")
                .build();
        UserEntity user = UserEntity.builder()
                .id(10L)
                .email("admin@smartlogix.cl")
                .password("encoded-password")
                .fullName("Administrador SmartLogix")
                .role(role)
                .active(true)
                .build();

        UserResponse response = UserMapper.toResponse(user);

        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getEmail()).isEqualTo("admin@smartlogix.cl");
        assertThat(response.getFullName()).isEqualTo("Administrador SmartLogix");
        assertThat(response.getRole()).isEqualTo("ADMIN");
    }
}
