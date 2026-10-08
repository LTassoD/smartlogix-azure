package cl.duoc.smartlogix.orders.application.service.impl;

// --- Importaciones: mappers, dominio, repositorios, DTOs y el publisher de mensajería ---
import cl.duoc.smartlogix.orders.application.mapper.OrderItemMapper;           // Convierte request → entidad del ítem
import cl.duoc.smartlogix.orders.application.mapper.OrderMapper;               // Convierte entidad → respuesta
import cl.duoc.smartlogix.orders.application.mapper.OrderStatusHistoryMapper;   // Historico entidad → respuesta
import cl.duoc.smartlogix.orders.application.service.OrderService;             // Interfaz que implementamos
import cl.duoc.smartlogix.orders.domain.enums.OrderStatus;                     // Estados CREATED, CONFIRMED, etc.
import cl.duoc.smartlogix.orders.domain.exception.BusinessRuleException;        // Excepción de regla de negocio
import cl.duoc.smartlogix.orders.domain.exception.ResourceNotFoundException;    // Excepción "no encontrado"
import cl.duoc.smartlogix.orders.infrastructure.messaging.client.StockCheckClient;
import cl.duoc.smartlogix.orders.infrastructure.messaging.dto.StockCheckRequest;
import cl.duoc.smartlogix.orders.infrastructure.messaging.dto.StockCheckResponse;
import cl.duoc.smartlogix.orders.infrastructure.messaging.event.OrderCreatedEvent;      // Evento para Service Bus
import cl.duoc.smartlogix.orders.infrastructure.messaging.event.OrderCancelledEvent;    // Evento de cancelación para Service Bus
import cl.duoc.smartlogix.orders.infrastructure.messaging.event.OrderCreatedItemEvent;  // Ítems del evento
import cl.duoc.smartlogix.orders.infrastructure.messaging.publisher.OrderEventPublisher; // PUBLICADOR: envía el evento
import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.CustomerEntity;
import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.OrderEntity;
import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.OrderItemEntity;
import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.OrderStatusHistoryEntity;
import cl.duoc.smartlogix.orders.infrastructure.persistence.repository.CustomerRepository;
import cl.duoc.smartlogix.orders.infrastructure.persistence.repository.OrderRepository;
import cl.duoc.smartlogix.orders.infrastructure.persistence.repository.OrderStatusHistoryRepository;
import cl.duoc.smartlogix.orders.presentation.dto.request.CreateOrderItemRequest;
import cl.duoc.smartlogix.orders.presentation.dto.request.CreateOrderRequest;
import cl.duoc.smartlogix.orders.presentation.dto.request.UpdateOrderStatusRequest;
import cl.duoc.smartlogix.orders.presentation.dto.response.OrderResponse;
import cl.duoc.smartlogix.orders.presentation.dto.response.OrderStatusHistoryResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// @Service: bean de servicio de Spring.
// @RequiredArgsConstructor: constructor con los campos final (los 4 repos/servicios de abajo).
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    // Formato de fecha usado en el número de pedido: "ORD-20260926-XXXXX"
    private static final DateTimeFormatter ORDER_DATE_FORMAT = DateTimeFormatter.BASIC_ISO_DATE;

    // Dependencias inyectadas por constructor:
    private final OrderRepository orderRepository;                      // Persistencia de pedidos
    private final CustomerRepository customerRepository;                // Persistencia de clientes
    private final OrderStatusHistoryRepository orderStatusHistoryRepository; // Historial de cambios de estado
    private final OrderEventPublisher orderEventPublisher;              // ENVÍA el OrderCreatedEvent a Service Bus
    private final StockCheckClient stockCheckClient;                    // CONSULTA stock sincrónamente a inventory-service

    // create: construye y guarda un pedido nuevo (siempre queda en CREATED).
    @Override
    @Transactional // Todo dentro de una transacción de BD: si algo falla, nada se guarda.
    public OrderResponse create(CreateOrderRequest request) {
        // Regla: al menos un ítem.
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BusinessRuleException("Order must contain at least one item");
        }

        // Busca el cliente; si no existe, 404.
        CustomerEntity customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + request.getCustomerId()));

        // Construye la entidad del pedido con status CREATED y total 0.
        OrderEntity order = OrderEntity.builder()
                .orderNumber(generateOrderNumber())
                .customer(customer)
                .status(OrderStatus.CREATED)
                .notes(request.getNotes())
                .totalAmount(BigDecimal.ZERO)
                .build();

        // Suma el subtotal de cada ítem (precio * cantidad) y los agrega al pedido.
        BigDecimal total = BigDecimal.ZERO;
        for (CreateOrderItemRequest itemRequest : request.getItems()) {
            BigDecimal subtotal = calculateSubtotal(itemRequest);
            total = total.add(subtotal);
            order.addItem(OrderItemMapper.toEntity(itemRequest, subtotal));
        }

        // Fija el total y registra el historial inicial (null → CREATED).
        order.setTotalAmount(total);
        order.addHistory(buildHistory(null, OrderStatus.CREATED, "Order created"));

        // Guarda y devuelve el DTO de respuesta.
        // NOTA: aquí NO se publica nada en RabbitMQ (el evento es solo al CONFIRMAR).
        return OrderMapper.toResponse(orderRepository.save(order));
    }

    // Consultas de solo lectura.
    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> findAll() {
        return orderRepository.findAll().stream()
                .map(OrderMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse findById(Long id) {
        return OrderMapper.toResponse(findOrderEntityById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse findByOrderNumber(String orderNumber) {
        OrderEntity order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with number: " + orderNumber));
        return OrderMapper.toResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> findByCustomer(Long customerId) {
        if (!customerRepository.existsById(customerId)) {
            throw new ResourceNotFoundException("Customer not found with id: " + customerId);
        }

        return orderRepository.findByCustomerId(customerId).stream()
                .map(OrderMapper::toResponse)
                .toList();
    }

    // updateStatus: cambia el estado de un pedido de forma genérica.
    // → PUBLICACIÓN CONDICIONAL: si el nuevo estado es CONFIRMED, envía el evento a RabbitMQ.
    @Override
    @Transactional
    public OrderResponse updateStatus(Long id, UpdateOrderStatusRequest request) {
        OrderEntity order = findOrderEntityById(id);
        changeStatus(order, request.getStatus(), request.getComment());
        OrderEntity savedOrder = orderRepository.save(order);

        // ★ PUNTO CLAVE #1: el evento se publica SOLO cuando el pedido pasa a CONFIRMED.
        if (request.getStatus() == OrderStatus.CONFIRMED) {
            orderEventPublisher.publishOrderCreated(toOrderCreatedEvent(savedOrder));
        }

        return OrderMapper.toResponse(savedOrder);
    }

    // confirm: atajo específico para confirmar ("CREATED → CONFIRMED").
    // → VERIFICACIÓN SINCRONA DE STOCK + PUBLICACIÓN SIEMPRE.
    @Override
    @Transactional
    public OrderResponse confirm(Long id) {
        OrderEntity order = findOrderEntityById(id);

        // Solo se puede confirmar un pedido que siga en CREATED.
        if (order.getStatus() != OrderStatus.CREATED) {
            throw new BusinessRuleException("Only CREATED orders can be confirmed");
        }

        // ★ VERIFICACIÓN SINCRONA: consulta stock a inventory-service vía request/reply.
        // Si no hay stock suficiente, se rechaza la confirmación con BusinessRuleException.
        List<StockCheckRequest.Item> items = order.getItems().stream()
                .map(i -> new StockCheckRequest.Item(i.getProductId(), i.getWarehouseId(), i.getQuantity()))
                .toList();

        StockCheckResponse stockResponse = stockCheckClient.checkStock(
                order.getId(), order.getOrderNumber(), items);

        if (!stockResponse.available()) {
            throw new BusinessRuleException("Insufficient stock: " + stockResponse.detail());
        }

        changeStatus(order, OrderStatus.CONFIRMED, "Order confirmed");
        OrderEntity savedOrder = orderRepository.save(order);
        // ★ PUNTO CLAVE #2: aquí se envía el evento (sin condición, ya sabemos que quedó CONFIRMED).
        orderEventPublisher.publishOrderCreated(toOrderCreatedEvent(savedOrder));
        return OrderMapper.toResponse(savedOrder);
    }

    // cancel: CREATED o CONFIRMED → CANCELLED.
    // → PUBLICACIÓN: siempre que ocurra una cancelación se publica "order.cancelled"
    //   (shipping lo usa para cancelar el despacho asociado).
    @Override
    @Transactional
    public OrderResponse cancel(Long id) {
        OrderEntity order = findOrderEntityById(id);

        if (!Set.of(OrderStatus.CREATED, OrderStatus.CONFIRMED).contains(order.getStatus())) {
            throw new BusinessRuleException("Only CREATED or CONFIRMED orders can be cancelled");
        }

        changeStatus(order, OrderStatus.CANCELLED, "Order cancelled");
        OrderEntity savedOrder = orderRepository.save(order);
        // ★ PUBLICACIÓN DEL EVENTO DE CANCELACIÓN (routing key "order.cancelled").
        orderEventPublisher.publishOrderCancelled(toOrderCancelledEvent(savedOrder));
        return OrderMapper.toResponse(savedOrder);
    }

    // getHistory: devuelve el historial de cambios de estado del pedido, ordenado por fecha.
    @Override
    @Transactional(readOnly = true)
    public List<OrderStatusHistoryResponse> getHistory(Long id) {
        if (!orderRepository.existsById(id)) {
            throw new ResourceNotFoundException("Order not found with id: " + id);
        }

        return orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(id).stream()
                .map(OrderStatusHistoryMapper::toResponse)
                .toList();
    }

    // Helpers privados ------------------------------

    private OrderEntity findOrderEntityById(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
    }

    // subtotal = precio unitario × cantidad
    private BigDecimal calculateSubtotal(CreateOrderItemRequest itemRequest) {
        return itemRequest.getUnitPrice().multiply(BigDecimal.valueOf(itemRequest.getQuantity()));
    }

    // changeStatus: aplica la transición y registra el historial, con validaciones.
    private void changeStatus(OrderEntity order, OrderStatus newStatus, String comment) {
        OrderStatus previousStatus = order.getStatus();

        // No permite pasar al mismo estado.
        if (previousStatus == newStatus) {
            throw new BusinessRuleException("Order already has status: " + newStatus);
        }

        // Solo permite transiciones válidas (ver isValidTransition).
        if (!isValidTransition(previousStatus, newStatus)) {
            throw new BusinessRuleException("Invalid order status transition from " + previousStatus + " to " + newStatus);
        }

        order.setStatus(newStatus);
        order.addHistory(buildHistory(previousStatus, newStatus, comment));
    }

    // MÁQUINA DE ESTADOS del pedido.
    private boolean isValidTransition(OrderStatus currentStatus, OrderStatus newStatus) {
        return switch (currentStatus) {
            case CREATED -> Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED).contains(newStatus);
            case CONFIRMED -> Set.of(OrderStatus.PREPARING, OrderStatus.CANCELLED).contains(newStatus);
            case PREPARING -> newStatus == OrderStatus.READY_FOR_SHIPPING;
            case READY_FOR_SHIPPING -> newStatus == OrderStatus.SHIPPED;
            case SHIPPED -> newStatus == OrderStatus.DELIVERED;
            case CANCELLED, DELIVERED -> false; // Terminales: no se puede salir de aquí
        };
    }

    private OrderStatusHistoryEntity buildHistory(OrderStatus previousStatus, OrderStatus newStatus, String comment) {
        return OrderStatusHistoryEntity.builder()
                .previousStatus(previousStatus)
                .newStatus(newStatus)
                .comment(comment)
                .build();
    }

    // Genera "ORD-<fecha>-<secuencia>" garantizando unicidad (do-while).
    private String generateOrderNumber() {
        String date = LocalDate.now().format(ORDER_DATE_FORMAT);
        String orderNumber;

        do {
            int sequence = ThreadLocalRandom.current().nextInt(10000, 100000);
            orderNumber = "ORD-" + date + "-" + sequence;
        } while (orderRepository.existsByOrderNumber(orderNumber));

        return orderNumber;
    }

    // Convierte la ENTIDAD persistida al EVENTO que viajará a RabbitMQ.
    private OrderCreatedEvent toOrderCreatedEvent(OrderEntity order) {
        return OrderCreatedEvent.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .customerId(order.getCustomer().getId())
                .totalAmount(order.getTotalAmount())
                .items(order.getItems().stream()
                        .map(this::toOrderCreatedItemEvent)   // Cada ítem de la entidad → ítem del evento
                        .toList())
                .createdAt(LocalDateTime.now())
                .build();
    }

    // Convierte UN ítem del pedido al ítem del evento.
    private OrderCreatedItemEvent toOrderCreatedItemEvent(OrderItemEntity item) {
        return OrderCreatedItemEvent.builder()
                .productId(item.getProductId())
                .warehouseId(item.getWarehouseId())
                .sku(item.getSku())
                .productName(item.getProductName())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .build();
    }

    // Convierte la ENTIDAD cancelada al evento OrderCancelledEvent que viajará a RabbitMQ.
    private OrderCancelledEvent toOrderCancelledEvent(OrderEntity order) {
        return OrderCancelledEvent.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .customerId(order.getCustomer().getId())
                .reason("Order cancelled")
                .cancelledAt(LocalDateTime.now())
                .build();
    }
}