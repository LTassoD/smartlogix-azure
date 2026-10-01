package cl.duoc.smartlogix.shipping.application.service.impl;

import cl.duoc.smartlogix.shipping.application.mapper.CarrierMapper;
import cl.duoc.smartlogix.shipping.application.service.CarrierService;
import cl.duoc.smartlogix.shipping.domain.exception.ResourceNotFoundException;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.CarrierEntity;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.repository.CarrierRepository;
import cl.duoc.smartlogix.shipping.presentation.dto.request.UpdateCarrierAvailabilityRequest;
import cl.duoc.smartlogix.shipping.presentation.dto.response.CarrierResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CarrierServiceImpl implements CarrierService {

    private final CarrierRepository carrierRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CarrierResponse> findAll() {
        return carrierRepository.findByActiveTrue().stream()
                .map(CarrierMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CarrierResponse findById(Long id) {
        return CarrierMapper.toResponse(findCarrierEntityById(id));
    }

    @Override
    @Transactional
    public CarrierResponse updateAvailability(Long id, UpdateCarrierAvailabilityRequest request) {
        CarrierEntity carrier = findCarrierEntityById(id);
        carrier.setSimulatedAvailable(request.getSimulatedAvailable());
        return CarrierMapper.toResponse(carrierRepository.save(carrier));
    }

    private CarrierEntity findCarrierEntityById(Long id) {
        return carrierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Carrier not found with id: " + id));
    }
}
