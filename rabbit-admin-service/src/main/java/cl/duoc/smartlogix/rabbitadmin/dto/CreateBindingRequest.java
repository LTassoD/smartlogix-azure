package cl.duoc.smartlogix.rabbitadmin.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Petición para enlazar una cola a un exchange con una routing key
 * (los bindings del modelo exchanges/bindings de RabbitMQ).
 */
public record CreateBindingRequest(

        @NotBlank(message = "Exchange name is required")
        String exchange,

        @NotBlank(message = "Queue name is required")
        String queue,

        String routingKey
) {
}
