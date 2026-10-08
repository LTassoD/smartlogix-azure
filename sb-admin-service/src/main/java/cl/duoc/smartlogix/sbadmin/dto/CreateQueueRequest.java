package cl.duoc.smartlogix.sbadmin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateQueueRequest(

        @NotBlank(message = "Queue name is required")
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "Queue name must be alphanumeric with dots, underscores or hyphens")
        String name,

        boolean requiresSession,

        String defaultMessageTimeToLive,

        String lockDuration,

        Integer maxDeliveryCount) {
}