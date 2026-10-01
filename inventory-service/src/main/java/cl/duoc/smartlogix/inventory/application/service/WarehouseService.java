package cl.duoc.smartlogix.inventory.application.service;

import cl.duoc.smartlogix.inventory.presentation.dto.request.CreateWarehouseRequest;
import cl.duoc.smartlogix.inventory.presentation.dto.response.WarehouseResponse;
import java.util.List;

public interface WarehouseService {

    WarehouseResponse create(CreateWarehouseRequest request);

    List<WarehouseResponse> findAll();

    WarehouseResponse findById(Long id);
}
