package cl.duoc.smartlogix.shipping.infrastructure.carrier;

import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.CarrierEntity;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.ShipmentEntity;

public interface CarrierAdapter {

    String getCarrierCode();

    boolean isAvailable(CarrierEntity carrier);

    String generateTrackingCode(ShipmentEntity shipment);
}
