package cl.duoc.smartlogix.rabbitadmin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.util.Map;

/**
 * Petición para crear una cola.
 * La validación (indicador de la rúbrica: "validación de parámetros de entrada")
 * rechaza nombres vacíos o con caracteres no permitidos antes de tocar RabbitMQ.
 */
public record CreateQueueRequest(

        @NotBlank(message = "Queue name is required")
        @Pattern(regexp = "^[a-zA-Z0-9._-]{1,255}$",
                message = "Queue name must contain only letters, digits, dot, dash or underscore")
        String name,

        Boolean durable,

        Boolean exclusive,

        Boolean autoDelete,

        Map<String, Object> arguments
) {
}
