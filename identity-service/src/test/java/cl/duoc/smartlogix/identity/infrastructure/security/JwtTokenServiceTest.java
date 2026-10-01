package cl.duoc.smartlogix.identity.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;

import cl.duoc.smartlogix.identity.config.JwtProperties;
import cl.duoc.smartlogix.identity.domain.enums.RoleName;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.RoleEntity;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.UserEntity;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jose.proc.SecurityContext;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

class JwtTokenServiceTest {

    private static final String SECRET = "test-only-jwt-secret-0123456789abcdef0123456789abcdef";

    @Test
    void shouldGenerateSignedJwtWithExpectedClaims() {
        SecretKey key = new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        JwtEncoder encoder = new NimbusJwtEncoder(new ImmutableSecret<SecurityContext>(key));
        JwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        JwtProperties properties = new JwtProperties();
        properties.setIssuer("smartlogix-identity-service");
        properties.setExpirationSeconds(3600);
        properties.setSecret(SECRET);
        JwtTokenService tokenService = new JwtTokenService(encoder, properties);

        RoleEntity role = RoleEntity.builder().name(RoleName.ADMIN).build();
        UserEntity user = UserEntity.builder()
                .id(1L)
                .email("admin@smartlogix.cl")
                .fullName("Administrador SmartLogix")
                .role(role)
                .active(true)
                .build();

        String token = tokenService.generateToken(user);
        Jwt jwt = decoder.decode(token);

        assertThat(token).isNotBlank();
        assertThat(jwt.getSubject()).isEqualTo("admin@smartlogix.cl");
        assertThat(jwt.getClaimAsString("role")).isEqualTo("ADMIN");
        assertThat(jwt.getClaimAsString("userId")).isEqualTo("1");
    }
}
