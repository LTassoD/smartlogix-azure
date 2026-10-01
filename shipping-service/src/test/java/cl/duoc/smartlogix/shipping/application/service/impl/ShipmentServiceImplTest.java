package cl.duoc.smartlogix.shipping.application.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import cl.duoc.smartlogix.shipping.domain.enums.CarrierCode;
import cl.duoc.smartlogix.shipping.domain.enums.ShipmentStatus;
import cl.duoc.smartlogix.shipping.infrastructure.carrier.BlueExpressCarrierAdapter;
import cl.duoc.smartlogix.shipping.infrastructure.carrier.CarrierFactory;
import cl.duoc.smartlogix.shipping.infrastructure.carrier.ChilexpressCarrierAdapter;
import cl.duoc.smartlogix.shipping.infrastructure.carrier.StarkenCarrierAdapter;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.CarrierEntity;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.ShipmentEntity;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.repository.CarrierRepository;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.repository.ShipmentRepository;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.repository.ShipmentStatusHistoryRepository;
import cl.duoc.smartlogix.shipping.presentation.dto.request.AssignCarrierRequest;
import cl.duoc.smartlogix.shipping.presentation.dto.request.CreateShipmentRequest;
import cl.duoc.smartlogix.shipping.presentation.dto.response.ShipmentResponse;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ShipmentServiceImplTest {

    @Mock
    private ShipmentRepository shipmentRepository;

    @Mock
    private CarrierRepository carrierRepository;

    @Mock
    private ShipmentStatusHistoryRepository shipmentStatusHistoryRepository;

    private ShipmentServiceImpl shipmentService;

    @BeforeEach
    void setUp() {
        CarrierFactory carrierFactory = new CarrierFactory(List.of(
                new ChilexpressCarrierAdapter(),
                new StarkenCarrierAdapter(),
                new BlueExpressCarrierAdapter()
        ));
        shipmentService = new ShipmentServiceImpl(
                shipmentRepository,
                carrierRepository,
                shipmentStatusHistoryRepository,
                carrierFactory
        );
    }

    @Test
    void createManualShipmentStartsInCreatedStatus() {
        CreateShipmentRequest request = CreateShipmentRequest.builder()
                .orderId(1L)
                .orderNumber("ORD-20260507-10001")
                .customerId(1L)
                .destinationAddress("Av. Siempre Viva 123")
                .destinationCity("Santiago")
                .build();

        when(shipmentRepository.existsByOrderId(1L)).thenReturn(false);
        when(shipmentRepository.existsByShipmentNumber(anyString())).thenReturn(false);
        when(shipmentRepository.save(any(ShipmentEntity.class))).thenAnswer(invocation -> prepareSavedShipment(invocation.getArgument(0)));

        ShipmentResponse response = shipmentService.create(request);

        assertNotNull(response.getShipmentNumber());
        assertEquals(ShipmentStatus.CREATED, response.getStatus());
        assertEquals("ORD-20260507-10001", response.getOrderNumber());
    }

    @Test
    void assignCarrierUsesFallbackWhenRequestedCarrierIsUnavailable() {
        ShipmentEntity shipment = ShipmentEntity.builder()
                .shipmentNumber("SHP-20260507-10001")
                .orderId(1L)
                .orderNumber("ORD-20260507-10001")
                .customerId(1L)
                .status(ShipmentStatus.CREATED)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        shipment.setId(1L);

        CarrierEntity chilexpress = carrier(CarrierCode.CHILEXPRESS.name(), false);
        CarrierEntity starken = carrier(CarrierCode.STARKEN.name(), true);

        when(shipmentRepository.findById(1L)).thenReturn(Optional.of(shipment));
        when(carrierRepository.findByActiveTrue()).thenReturn(List.of(chilexpress, starken));
        when(shipmentRepository.save(any(ShipmentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ShipmentResponse response = shipmentService.assignCarrier(
                1L,
                AssignCarrierRequest.builder()
                        .carrierCode(CarrierCode.CHILEXPRESS.name())
                        .destinationCity("Santiago")
                        .build()
        );

        assertEquals(ShipmentStatus.ASSIGNED, response.getStatus());
        assertEquals(CarrierCode.STARKEN.name(), response.getCarrier().getCode());
        assertEquals("STK-SHP-20260507-10001", response.getTrackingCode());
    }

    private ShipmentEntity prepareSavedShipment(ShipmentEntity shipment) {
        shipment.setId(1L);
        shipment.setCreatedAt(LocalDateTime.now());
        shipment.setUpdatedAt(LocalDateTime.now());
        shipment.getHistory().forEach(history -> {
            history.setId(1L);
            history.setCreatedAt(LocalDateTime.now());
        });
        return shipment;
    }

    private CarrierEntity carrier(String code, boolean available) {
        CarrierEntity carrier = CarrierEntity.builder()
                .code(code)
                .name(code)
                .serviceType("NATIONAL")
                .active(true)
                .simulatedAvailable(available)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        carrier.setId((long) code.hashCode());
        return carrier;
    }
}
