package cl.duoc.smartlogix.shipping.application.service;

import cl.duoc.smartlogix.shipping.domain.enums.ShipmentStatus;
import cl.duoc.smartlogix.shipping.infrastructure.messaging.event.OrderCreatedEvent;
import cl.duoc.smartlogix.shipping.presentation.dto.request.AssignCarrierRequest;
import cl.duoc.smartlogix.shipping.presentation.dto.request.CreateShipmentRequest;
import cl.duoc.smartlogix.shipping.presentation.dto.request.UpdateShipmentStatusRequest;
import cl.duoc.smartlogix.shipping.presentation.dto.response.ShipmentResponse;
import cl.duoc.smartlogix.shipping.presentation.dto.response.ShipmentStatusHistoryResponse;
import java.util.List;

public interface ShipmentService {

    ShipmentResponse create(CreateShipmentRequest request);

    ShipmentResponse createFromOrderEvent(OrderCreatedEvent event);

    List<ShipmentResponse> findAll();

    ShipmentResponse findById(Long id);

    ShipmentResponse findByOrderId(Long orderId);

    ShipmentResponse findByShipmentNumber(String shipmentNumber);

    List<ShipmentResponse> findByStatus(ShipmentStatus status);

    ShipmentResponse assignCarrier(Long id, AssignCarrierRequest request);

    ShipmentResponse updateStatus(Long id, UpdateShipmentStatusRequest request);

    ShipmentResponse cancel(Long id);

    void cancelByOrderId(Long orderId);

    List<ShipmentStatusHistoryResponse> getHistory(Long id);
}
