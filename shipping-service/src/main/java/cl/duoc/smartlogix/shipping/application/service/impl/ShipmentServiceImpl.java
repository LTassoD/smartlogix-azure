package cl.duoc.smartlogix.shipping.application.service.impl;

// --- Importaciones: mappers, dominio, repositorios, carrier (transportista) y el evento ---
import cl.duoc.smartlogix.shipping.application.mapper.ShipmentMapper;
import cl.duoc.smartlogix.shipping.application.mapper.ShipmentStatusHistoryMapper;
import cl.duoc.smartlogix.shipping.application.service.ShipmentService;
import cl.duoc.smartlogix.shipping.domain.enums.ShipmentStatus;
import cl.duoc.smartlogix.shipping.domain.exception.BusinessRuleException;
import cl.duoc.smartlogix.shipping.domain.exception.DuplicateResourceException;
import cl.duoc.smartlogix.shipping.domain.exception.ResourceNotFoundException;
import cl.duoc.smartlogix.shipping.infrastructure.carrier.CarrierFactory;      // Selecciona el transportista
import cl.duoc.smartlogix.shipping.infrastructure.carrier.CarrierFactory.CarrierSelection; // Resultado de la selección
import cl.duoc.smartlogix.shipping.infrastructure.messaging.event.OrderCreatedEvent;     // El evento de RabbitMQ
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.CarrierEntity;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.ShipmentEntity;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.ShipmentStatusHistoryEntity;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.repository.CarrierRepository;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.repository.ShipmentRepository;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.repository.ShipmentStatusHistoryRepository;
import cl.duoc.smartlogix.shipping.presentation.dto.request.AssignCarrierRequest;
import cl.duoc.smartlogix.shipping.presentation.dto.request.CreateShipmentRequest;
import cl.duoc.smartlogix.shipping.presentation.dto.request.UpdateShipmentStatusRequest;
import cl.duoc.smartlogix.shipping.presentation.dto.response.ShipmentResponse;
import cl.duoc.smartlogix.shipping.presentation.dto.response.ShipmentStatusHistoryResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ShipmentServiceImpl implements ShipmentService {

    // Formato del número de despacho: "SHP-YYYYMMDD-XXXXX"
    private static final DateTimeFormatter SHIPMENT_DATE_FORMAT = DateTimeFormatter.BASIC_ISO_DATE;

    // Dependencias inyectadas:
    private final ShipmentRepository shipmentRepository;                 // Persistencia de despachos
    private final CarrierRepository carrierRepository;                   // Transportistas activos
    private final ShipmentStatusHistoryRepository shipmentStatusHistoryRepository; // Historial de estados
    private final CarrierFactory carrierFactory;                         // Selección de transportista (con fallback)

    // create: CREACIÓN MANUAL de un despacho (rol operator/admin por la UI, no por evento).
    @Override
    @Transactional
    public ShipmentResponse create(CreateShipmentRequest request) {
        // Regla: un pedido solo puede tener UN despacho.
        if (shipmentRepository.existsByOrderId(request.getOrderId())) {
            throw new DuplicateResourceException("Shipment already exists for order id: " + request.getOrderId());
        }

        // Construye el despacho en estado CREATED con dirección destino del request.
        ShipmentEntity shipment = buildShipment(
                request.getOrderId(),
                request.getOrderNumber(),
                request.getCustomerId(),
                request.getDestinationAddress(),
                request.getDestinationCity(),
                ShipmentStatus.CREATED,
                "Manual shipment created"
        );

        return ShipmentMapper.toResponse(shipmentRepository.save(shipment));
    }

    // ★ MÉTODO CLAVE invocado desde el consumer de RabbitMQ (OrderCreatedConsumer).
    // Cuando llega un OrderCreatedEvent, crea el despacho asociado al pedido, en
    // estado PENDING_ASSIGNMENT (aún sin transportista).
    @Override
    @Transactional
    public ShipmentResponse createFromOrderEvent(OrderCreatedEvent event) {
        // IDEMPOTENCIA: si el pedido YA tiene despacho (el mensaje se reentregó),
        // simplemente devuelve el existente. Evita crear despachos duplicados.
        return shipmentRepository.findByOrderId(event.getOrderId())
                .map(ShipmentMapper::toResponse)
                .orElseGet(() -> {
                    // No existe → construye uno nuevo sin dirección (aún no la conocemos).
                    ShipmentEntity shipment = buildShipment(
                            event.getOrderId(),
                            event.getOrderNumber(),
                            event.getCustomerId(),
                            null,
                            null,
                            ShipmentStatus.PENDING_ASSIGNMENT, // Esperando transportista
                            "Shipment created from OrderCreatedEvent"
                    );
                    return ShipmentMapper.toResponse(shipmentRepository.save(shipment));
                });
    }

    // Consultas de solo lectura ------------------------------

    @Override
    @Transactional(readOnly = true)
    public List<ShipmentResponse> findAll() {
        return shipmentRepository.findAll().stream()
                .map(ShipmentMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ShipmentResponse findById(Long id) {
        return ShipmentMapper.toResponse(findShipmentEntityById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public ShipmentResponse findByOrderId(Long orderId) {
        ShipmentEntity shipment = shipmentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found for order id: " + orderId));
        return ShipmentMapper.toResponse(shipment);
    }

    @Override
    @Transactional(readOnly = true)
    public ShipmentResponse findByShipmentNumber(String shipmentNumber) {
        ShipmentEntity shipment = shipmentRepository.findByShipmentNumber(shipmentNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with number: " + shipmentNumber));
        return ShipmentMapper.toResponse(shipment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShipmentResponse> findByStatus(ShipmentStatus status) {
        return shipmentRepository.findByStatus(status).stream()
                .map(ShipmentMapper::toResponse)
                .toList();
    }

    // assignCarrier: asigna un transportista al despacho (con fallback si el pedido no está disponible).
    @Override
    @Transactional
    public ShipmentResponse assignCarrier(Long id, AssignCarrierRequest request) {
        ShipmentEntity shipment = findShipmentEntityById(id);

        if (!Set.of(ShipmentStatus.CREATED, ShipmentStatus.PENDING_ASSIGNMENT, ShipmentStatus.FAILED).contains(shipment.getStatus())) {
            throw new BusinessRuleException("Carrier can only be assigned to CREATED, PENDING_ASSIGNMENT or FAILED shipments");
        }

        List<CarrierEntity> carriers = carrierRepository.findByActiveTrue(); // Transportistas activos
        String requestedCode = request == null ? null : request.getCarrierCode(); // Si pidió uno específico
        String destinationCity = request == null ? null : request.getDestinationCity();

        // Selecciona el carrier: usa el solicitado si está activo, si no usa uno de fallback.
        return carrierFactory.selectCarrier(requestedCode, carriers)
                .map(selection -> assignSelectedCarrier(shipment, selection, requestedCode, destinationCity))
                .orElseGet(() -> markAssignmentFailed(shipment, requestedCode));
    }

    @Override
    @Transactional
    public ShipmentResponse updateStatus(Long id, UpdateShipmentStatusRequest request) {
        ShipmentEntity shipment = findShipmentEntityById(id);
        changeStatus(shipment, request.getStatus(), request.getComment());
        return ShipmentMapper.toResponse(shipmentRepository.save(shipment));
    }

    @Override
    @Transactional
    public ShipmentResponse cancel(Long id) {
        ShipmentEntity shipment = findShipmentEntityById(id);

        if (shipment.getStatus() == ShipmentStatus.DELIVERED) {
            throw new BusinessRuleException("Delivered shipments cannot be cancelled");
        }

        changeStatus(shipment, ShipmentStatus.CANCELLED, "Shipment cancelled");
        return ShipmentMapper.toResponse(shipmentRepository.save(shipment));
    }

    // ★ MÉTODO invocado desde el consumer del evento "order.cancelled".
    // Busca el despacho asociado al pedido cancelado y lo pasa a CANCELLED.
    // IDEMPOTENTE: si el despacho no existe (el pedido nunca se confirmó)
    // o ya está entregado/cancelado, no hace nada.
    @Override
    @Transactional
    public void cancelByOrderId(Long orderId) {
        shipmentRepository.findByOrderId(orderId).ifPresent(shipment -> {
            if (shipment.getStatus() != ShipmentStatus.CANCELLED && shipment.getStatus() != ShipmentStatus.DELIVERED) {
                changeStatus(shipment, ShipmentStatus.CANCELLED, "Shipment cancelled due to order cancellation");
                shipmentRepository.save(shipment);
            }
        });
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShipmentStatusHistoryResponse> getHistory(Long id) {
        if (!shipmentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Shipment not found with id: " + id);
        }

        return shipmentStatusHistoryRepository.findByShipmentIdOrderByCreatedAtAsc(id).stream()
                .map(ShipmentStatusHistoryMapper::toResponse)
                .toList();
    }

    // Helpers privados ------------------------------

    // Aplica el carrier seleccionado: guarda el transportista, tracking, ciudad y pasa a ASSIGNED.
    private ShipmentResponse assignSelectedCarrier(
            ShipmentEntity shipment,
            CarrierSelection selection,
            String requestedCode,
            String destinationCity
    ) {
        CarrierEntity selectedCarrier = selection.carrier(); // El transportista elegido
        String normalizedRequestedCode = requestedCode == null ? null : requestedCode.trim().toUpperCase(); // Normaliza

        shipment.setCarrier(selectedCarrier);
        shipment.setDestinationCity(destinationCity != null ? destinationCity : shipment.getDestinationCity());
        shipment.setTrackingCode(selection.adapter().generateTrackingCode(shipment)); // Genera número de seguimiento
        shipment.setFallbackReason(buildFallbackReason(normalizedRequestedCode, selectedCarrier.getCode())); // Razón si hubo fallback
        shipment.setAssignedAt(LocalDateTime.now());
        changeStatus(shipment, ShipmentStatus.ASSIGNED, "Carrier assigned: " + selectedCarrier.getCode());

        return ShipmentMapper.toResponse(shipmentRepository.save(shipment));
    }

    private ShipmentResponse markAssignmentFailed(ShipmentEntity shipment, String requestedCode) {
        shipment.setFallbackReason("No available carrier found. Requested carrier: " + (requestedCode == null ? "none" : requestedCode));
        if (shipment.getStatus() != ShipmentStatus.FAILED) {
            changeStatus(shipment, ShipmentStatus.FAILED, shipment.getFallbackReason());
        }
        return ShipmentMapper.toResponse(shipmentRepository.save(shipment));
    }

    private String buildFallbackReason(String requestedCode, String selectedCode) {
        if (requestedCode == null || requestedCode.isBlank() || requestedCode.equals(selectedCode)) {
            return null; // No pidió nada o se consiguió el que quería → sin razón de fallback
        }

        return "Requested carrier " + requestedCode + " was unavailable. Fallback carrier selected: " + selectedCode;
    }

    // Construye la entidad del despacho y su historial inicial.
    private ShipmentEntity buildShipment(
            Long orderId,
            String orderNumber,
            Long customerId,
            String destinationAddress,
            String destinationCity,
            ShipmentStatus initialStatus,
            String historyComment
    ) {
        ShipmentEntity shipment = ShipmentEntity.builder()
                .shipmentNumber(generateShipmentNumber()) // SHP-YYYYMMDD-XXXXX
                .orderId(orderId)
                .orderNumber(orderNumber)
                .customerId(customerId)
                .destinationAddress(destinationAddress)
                .destinationCity(destinationCity)
                .status(initialStatus)
                .build();
        shipment.addHistory(buildHistory(null, initialStatus, historyComment));
        return shipment;
    }

    private ShipmentEntity findShipmentEntityById(Long id) {
        return shipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with id: " + id));
    }

    // Transiciones de estado del despacho (con fechas automáticas).
    private void changeStatus(ShipmentEntity shipment, ShipmentStatus newStatus, String comment) {
        ShipmentStatus previousStatus = shipment.getStatus();

        if (previousStatus == newStatus) {
            throw new BusinessRuleException("Shipment already has status: " + newStatus);
        }

        if (!isValidTransition(previousStatus, newStatus)) {
            throw new BusinessRuleException("Invalid shipment status transition from " + previousStatus + " to " + newStatus);
        }

        shipment.setStatus(newStatus);

        // Al ir IN_TRANSIT se registra la fecha de salida.
        if (newStatus == ShipmentStatus.IN_TRANSIT) {
            shipment.setShippedAt(LocalDateTime.now());
        }

        // Al llegar a DELIVERED se registra la fecha de entrega.
        if (newStatus == ShipmentStatus.DELIVERED) {
            shipment.setDeliveredAt(LocalDateTime.now());
        }

        shipment.addHistory(buildHistory(previousStatus, newStatus, comment));
    }

    // Máquina de estados del despacho.
    private boolean isValidTransition(ShipmentStatus currentStatus, ShipmentStatus newStatus) {
        return switch (currentStatus) {
            case CREATED, PENDING_ASSIGNMENT -> Set.of(ShipmentStatus.ASSIGNED, ShipmentStatus.CANCELLED, ShipmentStatus.FAILED)
                    .contains(newStatus);
            case FAILED -> Set.of(ShipmentStatus.ASSIGNED, ShipmentStatus.CANCELLED).contains(newStatus);
            case ASSIGNED -> Set.of(ShipmentStatus.IN_TRANSIT, ShipmentStatus.CANCELLED).contains(newStatus);
            case IN_TRANSIT -> Set.of(ShipmentStatus.DELIVERED, ShipmentStatus.CANCELLED).contains(newStatus);
            case CANCELLED, DELIVERED -> false; // Terminales
        };
    }

    private ShipmentStatusHistoryEntity buildHistory(
            ShipmentStatus previousStatus,
            ShipmentStatus newStatus,
            String comment
    ) {
        return ShipmentStatusHistoryEntity.builder()
                .previousStatus(previousStatus)
                .newStatus(newStatus)
                .comment(comment)
                .build();
    }

    // Genera "SHP-<fecha>-<secuencia>" único.
    private String generateShipmentNumber() {
        String date = LocalDate.now().format(SHIPMENT_DATE_FORMAT);
        String shipmentNumber;

        do {
            int sequence = ThreadLocalRandom.current().nextInt(10000, 100000);
            shipmentNumber = "SHP-" + date + "-" + sequence;
        } while (shipmentRepository.existsByShipmentNumber(shipmentNumber));

        return shipmentNumber;
    }
}