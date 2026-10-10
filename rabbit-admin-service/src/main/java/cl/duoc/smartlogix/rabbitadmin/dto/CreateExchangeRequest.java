package cl.duoc.smartlogix.rabbitadmin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Petición para crear un exchange. El tipo debe ser uno de los cuatro
 * soportados por RabbitMQ: direct, topic, fanout o headers.
 */
public record CreateExchangeRequest(

        @NotBlank(message = "Exchange name is required")
        @Pattern(regexp = "^[a-zA-Z0-9._-]{1,255}$",
                message = "Exchange name must contain only letters, digits, dot, dash or underscore")
        String name,

        @NotBlank(message = "Exchange type is required")
        @Pattern(regexp = "^(?i)(direct|topic|fanout|headers)$",
                message = "Exchange type must be direct, topic, fanout or headers")
        String type,

        Boolean durable,

        Boolean autoDelete,

        Boolean internal
) {
}
