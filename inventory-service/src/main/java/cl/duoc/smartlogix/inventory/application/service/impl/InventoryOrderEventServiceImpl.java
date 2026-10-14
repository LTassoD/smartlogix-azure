package cl.duoc.smartlogix.inventory.application.service.impl;

// --- Importaciones ---
import cl.duoc.smartlogix.inventory.application.service.InventoryOrderEventService; // Interface que implementamos
import cl.duoc.smartlogix.inventory.application.service.StockService;               // Servicio que registra los movimientos de stock
import cl.duoc.smartlogix.inventory.domain.enums.StockMovementType;                // Tipo de movimiento (ORDER_OUT, etc.)
import cl.duoc.smartlogix.inventory.domain.exception.BusinessRuleException;        // Excepción de validación de negocio
import cl.duoc.smartlogix.inventory.infrastructure.messaging.event.OrderCreatedEvent;     // El evento recibido por Rabbit
import cl.duoc.smartlogix.inventory.infrastructure.messaging.event.OrderCreatedItemEvent; // Ítems del evento
import cl.duoc.smartlogix.inventory.infrastructure.persistence.repository.StockMovementRepository; // Busca movimientos previos
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;  // Utilidad hasText(): valida que un string no esté vacío

@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryOrderEventServiceImpl implements InventoryOrderEventService {

    // Razón que se registra en cada movimiento de stock generado por un pedido confirmado.
    private static final String ORDER_OUT_REASON = "Stock descontado por pedido confirmado";

    // Dependencias: manejo de stock (valida/existe) y repositorio de movimientos (evita duplicados).
    private final StockService stockService;
    private final StockMovementRepository stockMovementRepository;

    // MÉTODO PRINCIPAL invocado desde el consumer de RabbitMQ.
    // Procesa el evento: por cada ítem descuenta stock (si no se hizo antes).
    @Override
    @Transactional
    public void processOrderCreated(OrderCreatedEvent event) {
        validateEvent(event); // 1) Valida que el evento no venga vacío.

        // 2) Recorre cada producto del pedido.
        for (OrderCreatedItemEvent item : event.getItems()) {
            validateItem(item, event.getOrderNumber()); // Valida datos mínimos del ítem.

            // IDEMPOTENCIA: si este pedido+producto+bodega YA generó un movimiento
            // (p.ej. el mensaje se reentregó), lo salta para no descontar doble.
            if (isAlreadyProcessed(event.getOrderNumber(), item)) {
                log.info(
                        "Stock movement already processed for orderNumber={} productId={} warehouseId={}",
                        event.getOrderNumber(),
                        item.getProductId(),
                        item.getWarehouseId()
                );
                continue;
            }

            // 3) Registra el movimiento de SALIDA (ORDER_OUT): descuenta `quantity`
            //    del producto en la bodega, con la razón y referencia del pedido.
            stockService.createOrderOutMovement(
                    item.getProductId(),
                    item.getWarehouseId(),
                    item.getQuantity(),
                    ORDER_OUT_REASON,
                    event.getOrderNumber()
            );
        }
    }

    // Validaciones ------------------------------

    private void validateEvent(OrderCreatedEvent event) {
        if (event == null) {
            throw new BusinessRuleException("OrderCreatedEvent cannot be null");
        }

        if (!StringUtils.hasText(event.getOrderNumber())) {
            throw new BusinessRuleException("OrderCreatedEvent orderNumber is required");
        }

        List<OrderCreatedItemEvent> items = event.getItems();
        if (items == null || items.isEmpty()) {
            throw new BusinessRuleException("OrderCreatedEvent must contain at least one item");
        }
    }

    private void validateItem(OrderCreatedItemEvent item, String orderNumber) {
        if (item == null) {
            throw new BusinessRuleException("OrderCreatedEvent contains a null item for orderNumber: " + orderNumber);
        }

        if (item.getProductId() == null) {
            throw new BusinessRuleException("OrderCreatedEvent item productId is required for orderNumber: " + orderNumber);
        }

        if (item.getWarehouseId() == null) {
            throw new BusinessRuleException("OrderCreatedEvent item warehouseId is required for orderNumber: " + orderNumber);
        }

        if (item.getQuantity() == null || item.getQuantity() <= 0) {
            throw new BusinessRuleException("OrderCreatedEvent item quantity must be greater than zero for orderNumber: " + orderNumber);
        }
    }

    // Consulta si ya existe un movimiento ORDER_OUT con la referencia del pedido.
    private boolean isAlreadyProcessed(String orderNumber, OrderCreatedItemEvent item) {
        return stockMovementRepository.existsByReferenceCodeAndProductIdAndWarehouseIdAndType(
                orderNumber,
                item.getProductId(),
                item.getWarehouseId(),
                StockMovementType.ORDER_OUT
        );
    }
}