package cl.duoc.smartlogix.shipping.application.service;

import cl.duoc.smartlogix.shipping.presentation.dto.request.UpdateCarrierAvailabilityRequest;
import cl.duoc.smartlogix.shipping.presentation.dto.response.CarrierResponse;
import java.util.List;

public interface CarrierService {

    List<CarrierResponse> findAll();

    CarrierResponse findById(Long id);

    CarrierResponse updateAvailability(Long id, UpdateCarrierAvailabilityRequest request);
}
