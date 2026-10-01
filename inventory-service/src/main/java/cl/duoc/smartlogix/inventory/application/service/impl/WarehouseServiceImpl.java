package cl.duoc.smartlogix.inventory.application.service.impl;

import cl.duoc.smartlogix.inventory.application.mapper.WarehouseMapper;
import cl.duoc.smartlogix.inventory.application.service.WarehouseService;
import cl.duoc.smartlogix.inventory.domain.exception.DuplicateResourceException;
import cl.duoc.smartlogix.inventory.domain.exception.ResourceNotFoundException;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.WarehouseEntity;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.repository.WarehouseRepository;
import cl.duoc.smartlogix.inventory.presentation.dto.request.CreateWarehouseRequest;
import cl.duoc.smartlogix.inventory.presentation.dto.response.WarehouseResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WarehouseServiceImpl implements WarehouseService {

    private final WarehouseRepository warehouseRepository;

    @Override
    @Transactional
    public WarehouseResponse create(CreateWarehouseRequest request) {
        if (warehouseRepository.existsByCode(request.getCode())) {
            throw new DuplicateResourceException("Warehouse code already exists: " + request.getCode());
        }

        WarehouseEntity warehouse = WarehouseMapper.toEntity(request);
        return WarehouseMapper.toResponse(warehouseRepository.save(warehouse));
    }

    @Override
    @Transactional(readOnly = true)
    public List<WarehouseResponse> findAll() {
        return warehouseRepository.findAll().stream()
                .map(WarehouseMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public WarehouseResponse findById(Long id) {
        return WarehouseMapper.toResponse(findWarehouseEntityById(id));
    }

    private WarehouseEntity findWarehouseEntityById(Long id) {
        return warehouseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + id));
    }
}
