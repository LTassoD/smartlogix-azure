package cl.duoc.smartlogix.sbadmin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateRuleRequest(

        @NotBlank(message = "Rule name is required")
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "Rule name must be alphanumeric with dots, underscores or hyphens")
        String name,

        @NotBlank(message = "SQL filter expression is required")
        String sqlFilter) {
}