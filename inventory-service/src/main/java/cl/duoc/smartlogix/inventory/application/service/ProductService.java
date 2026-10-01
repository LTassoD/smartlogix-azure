package cl.duoc.smartlogix.inventory.application.service;

import cl.duoc.smartlogix.inventory.presentation.dto.request.CreateProductRequest;
import cl.duoc.smartlogix.inventory.presentation.dto.request.UpdateProductRequest;
import cl.duoc.smartlogix.inventory.presentation.dto.response.ProductResponse;
import java.util.List;

public interface ProductService {

    ProductResponse create(CreateProductRequest request);

    List<ProductResponse> findAll();

    ProductResponse findById(Long id);

    ProductResponse update(Long id, UpdateProductRequest request);

    void deactivate(Long id);
}
