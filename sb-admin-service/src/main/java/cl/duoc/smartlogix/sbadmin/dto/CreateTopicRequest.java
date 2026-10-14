package cl.duoc.smartlogix.sbadmin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateTopicRequest(

        @NotBlank(message = "Topic name is required")
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "Topic name must be alphanumeric with dots, underscores or hyphens")
        String name,

        boolean enablePartitioning,

        String defaultMessageTimeToLive) {
}