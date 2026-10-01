package cl.duoc.smartlogix.identity.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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
@ConfigurationProperties(prefix = "smartlogix.two-factor")
public class TwoFactorProperties {

    @NotBlank
    @Size(min = 32)
    private String encryptionPassword;

    @NotBlank
    @Pattern(regexp = "(?i)^[0-9a-f]{16,}$")
    private String encryptionSalt;

    @NotBlank
    private String issuer = "SmartLogix";

    @Positive
    private long setupExpirationSeconds = 600;

    @Positive
    private long challengeExpirationSeconds = 300;

    @Min(1)
    private int challengeMaxAttempts = 5;

    @Positive
    private long loginWindowSeconds = 300;

    @Min(1)
    private int loginMaxFailures = 5;

    @Positive
    private long loginBlockSeconds = 60;

    @Min(100)
    private int rateLimitMaxEntries = 10_000;
}
