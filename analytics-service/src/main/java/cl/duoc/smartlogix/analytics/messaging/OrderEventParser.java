package cl.duoc.smartlogix.analytics.messaging;

import cl.duoc.smartlogix.analytics.domain.ItemSummary;
import cl.duoc.smartlogix.analytics.domain.OrderSummary;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Convierte el JSON de order.created (mismo contrato que OrderCreatedEvent de
 * order-service) en un {@link OrderSummary}. Un mensaje malformado no es fatal:
 * se registra y se descarta, para que el consumidor siga avanzando.
 */
@Slf4j
@Component
public class OrderEventParser {

    private final ObjectMapper objectMapper;

    public OrderEventParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Optional<OrderSummary> parse(String json, int partition) {
        try {
            JsonNode root = objectMapper.readTree(json);
            String orderNumber = root.path("orderNumber").asString();
            if (orderNumber.isBlank()) {
                log.warn("Evento sin orderNumber en la particion {}, se descarta", partition);
                return Optional.empty();
            }

            BigDecimal total = decimal(root.path("totalAmount"));
            List<ItemSummary> items = new ArrayList<>();
            for (JsonNode item : root.path("items")) {
                int quantity = item.path("quantity").asInt();
                BigDecimal unitPrice = decimal(item.path("unitPrice"));
                items.add(new ItemSummary(
                        item.path("productName").asString("sin nombre"),
                        quantity,
                        unitPrice.multiply(BigDecimal.valueOf(quantity)).setScale(2, RoundingMode.HALF_UP)));
            }
            return Optional.of(new OrderSummary(orderNumber, partition, total, List.copyOf(items)));
        } catch (RuntimeException exception) {
            log.warn("Evento invalido en la particion {}: {}", partition, exception.getMessage());
            return Optional.empty();
        }
    }

    private static BigDecimal decimal(JsonNode node) {
        return node.isNumber() ? node.decimalValue().setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
    }
}
