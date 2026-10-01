package cl.duoc.smartlogix.shipping.infrastructure.carrier;

import cl.duoc.smartlogix.shipping.domain.enums.CarrierCode;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.CarrierEntity;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.ShipmentEntity;
import org.springframework.stereotype.Component;

@Component
public class StarkenCarrierAdapter implements CarrierAdapter {

    @Override
    public String getCarrierCode() {
        return CarrierCode.STARKEN.name();
    }

    @Override
    public boolean isAvailable(CarrierEntity carrier) {
        return Boolean.TRUE.equals(carrier.getActive()) && Boolean.TRUE.equals(carrier.getSimulatedAvailable());
    }

    @Override
    public String generateTrackingCode(ShipmentEntity shipment) {
        return "STK-" + shipment.getShipmentNumber();
    }
}
