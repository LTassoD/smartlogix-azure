package cl.duoc.smartlogix.identity.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Component
@Validated
@ConfigurationProperties(prefix = "smartlogix.jwt")
public class JwtProperties {

    @NotBlank
    private String issuer;

    @Positive
    private long expirationSeconds;

    @NotBlank
    @Size(min = 32)
    private String secret;
}
