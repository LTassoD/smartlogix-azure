package cl.duoc.smartlogix.shipping.infrastructure.carrier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import cl.duoc.smartlogix.shipping.domain.enums.CarrierCode;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.CarrierEntity;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.ShipmentEntity;
import java.util.List;
import org.junit.jupiter.api.Test;

class CarrierFactoryTest {

    private final CarrierFactory carrierFactory = new CarrierFactory(List.of(
            new ChilexpressCarrierAdapter(),
            new StarkenCarrierAdapter(),
            new BlueExpressCarrierAdapter()
    ));

    @Test
    void selectCarrierReturnsRequestedWhenAvailable() {
        CarrierEntity chilexpress = carrier(CarrierCode.CHILEXPRESS.name(), true);

        CarrierFactory.CarrierSelection selection = carrierFactory
                .selectCarrier(CarrierCode.CHILEXPRESS.name(), List.of(chilexpress))
                .orElseThrow();

        assertEquals(CarrierCode.CHILEXPRESS.name(), selection.carrier().getCode());
        assertEquals("CHX-SHP-TEST", selection.adapter().generateTrackingCode(shipment()));
    }

    @Test
    void selectCarrierUsesFallbackWhenRequestedIsUnavailable() {
        CarrierEntity chilexpress = carrier(CarrierCode.CHILEXPRESS.name(), false);
        CarrierEntity starken = carrier(CarrierCode.STARKEN.name(), true);

        CarrierFactory.CarrierSelection selection = carrierFactory
                .selectCarrier(CarrierCode.CHILEXPRESS.name(), List.of(chilexpress, starken))
                .orElseThrow();

        assertEquals(CarrierCode.STARKEN.name(), selection.carrier().getCode());
        assertEquals("STK-SHP-TEST", selection.adapter().generateTrackingCode(shipment()));
    }

    @Test
    void selectCarrierReturnsEmptyWhenNoCarrierIsAvailable() {
        CarrierEntity chilexpress = carrier(CarrierCode.CHILEXPRESS.name(), false);

        assertTrue(carrierFactory.selectCarrier(CarrierCode.CHILEXPRESS.name(), List.of(chilexpress)).isEmpty());
    }

    private CarrierEntity carrier(String code, boolean available) {
        return CarrierEntity.builder()
                .code(code)
                .name(code)
                .active(true)
                .simulatedAvailable(available)
                .build();
    }

    private ShipmentEntity shipment() {
        return ShipmentEntity.builder()
                .shipmentNumber("SHP-TEST")
                .build();
    }
}
