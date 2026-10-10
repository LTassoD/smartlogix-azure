package cl.duoc.smartlogix.rabbitadmin.service;

import cl.duoc.smartlogix.rabbitadmin.dto.AdminResponse;
import cl.duoc.smartlogix.rabbitadmin.dto.CreateBindingRequest;
import cl.duoc.smartlogix.rabbitadmin.dto.CreateExchangeRequest;
import cl.duoc.smartlogix.rabbitadmin.dto.CreateQueueRequest;
import org.springframework.amqp.core.AmqpAdmin;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Exchange;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.HeadersExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.stereotype.Service;

/**
 * Encapsula TODA la lógica de administración de RabbitMQ (rúbrica: la creación
 * de colas/exchanges se resuelve en un servicio dedicado, no en el controlador).
 *
 * Usa el bean {@link AmqpAdmin} (RabbitAdmin) que Spring Boot autoconfigura
 * cuando {@code spring.rabbitmq.dynamic=true}. RabbitAdmin crea las entidades
 * de forma idempotente contra el broker.
 */
@Service
public class RabbitAdminService {

    private final AmqpAdmin amqpAdmin;

    public RabbitAdminService(AmqpAdmin amqpAdmin) {
        this.amqpAdmin = amqpAdmin;
    }

    public AdminResponse createQueue(CreateQueueRequest request) {
        QueueBuilder builder = isTrue(request.durable(), true)
                ? QueueBuilder.durable(request.name())
                : QueueBuilder.nonDurable(request.name());

        if (isTrue(request.autoDelete(), false)) {
            builder.autoDelete();
        }
        if (isTrue(request.exclusive(), false)) {
            builder.exclusive();
        }
        if (request.arguments() != null && !request.arguments().isEmpty()) {
            builder.withArguments(request.arguments());
        }

        amqpAdmin.declareQueue(builder.build());
        return new AdminResponse("CREATE", "queue", request.name(), "declared");
    }

    public AdminResponse deleteQueue(String name) {
        boolean removed = amqpAdmin.deleteQueue(name);
        String detail = removed ? "deleted" : "not-found";
        return new AdminResponse("DELETE", "queue", name, detail);
    }

    public AdminResponse createExchange(CreateExchangeRequest request) {
        boolean durable = isTrue(request.durable(), true);
        boolean autoDelete = isTrue(request.autoDelete(), false);

        Exchange exchange = switch (request.type().toLowerCase()) {
            case "topic" -> new TopicExchange(request.name(), durable, autoDelete);
            case "fanout" -> new FanoutExchange(request.name(), durable, autoDelete);
            case "headers" -> new HeadersExchange(request.name(), durable, autoDelete);
            default -> new DirectExchange(request.name(), durable, autoDelete);
        };

        amqpAdmin.declareExchange(exchange);
        return new AdminResponse("CREATE", "exchange", request.name(), request.type().toLowerCase());
    }

    public AdminResponse deleteExchange(String name) {
        amqpAdmin.deleteExchange(name);
        return new AdminResponse("DELETE", "exchange", name, "deleted");
    }

    public AdminResponse createBinding(CreateBindingRequest request) {
        Binding binding = toBinding(request);
        amqpAdmin.declareBinding(binding);
        return new AdminResponse("CREATE", "binding",
                request.exchange() + "->" + request.queue(), request.routingKey());
    }

    public AdminResponse deleteBinding(CreateBindingRequest request) {
        amqpAdmin.removeBinding(toBinding(request));
        return new AdminResponse("DELETE", "binding",
                request.exchange() + "->" + request.queue(), request.routingKey());
    }

    private Binding toBinding(CreateBindingRequest request) {
        String routingKey = (request.routingKey() == null || request.routingKey().isBlank())
                ? "#"
                : request.routingKey();
        return new Binding(request.queue(), Binding.DestinationType.QUEUE,
                request.exchange(), routingKey, null);
    }

    private boolean isTrue(Boolean value, boolean defaultValue) {
        return value == null ? defaultValue : value;
    }
}
