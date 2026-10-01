package cl.duoc.smartlogix.inventory.application.service.impl;

import cl.duoc.smartlogix.inventory.application.mapper.ProductMapper;
import cl.duoc.smartlogix.inventory.application.service.ProductService;
import cl.duoc.smartlogix.inventory.domain.exception.DuplicateResourceException;
import cl.duoc.smartlogix.inventory.domain.exception.ResourceNotFoundException;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.ProductEntity;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.repository.ProductRepository;
import cl.duoc.smartlogix.inventory.presentation.dto.request.CreateProductRequest;
import cl.duoc.smartlogix.inventory.presentation.dto.request.UpdateProductRequest;
import cl.duoc.smartlogix.inventory.presentation.dto.response.ProductResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;

    @Override
    @Transactional
    public ProductResponse create(CreateProductRequest request) {
        if (productRepository.existsBySku(request.getSku())) {
            throw new DuplicateResourceException("Product SKU already exists: " + request.getSku());
        }

        ProductEntity product = ProductMapper.toEntity(request);
        return ProductMapper.toResponse(productRepository.save(product));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> findAll() {
        return productRepository.findAll().stream()
                .map(ProductMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse findById(Long id) {
        return ProductMapper.toResponse(findProductEntityById(id));
    }

    @Override
    @Transactional
    public ProductResponse update(Long id, UpdateProductRequest request) {
        ProductEntity product = findProductEntityById(id);

        if (StringUtils.hasText(request.getSku())) {
            String sku = request.getSku().trim();
            boolean skuBelongsToAnotherProduct = productRepository.findBySku(sku)
                    .filter(existingProduct -> !existingProduct.getId().equals(id))
                    .isPresent();

            if (skuBelongsToAnotherProduct) {
                throw new DuplicateResourceException("Product SKU already exists: " + sku);
            }

            product.setSku(sku);
        }

        if (StringUtils.hasText(request.getName())) {
            product.setName(request.getName());
        }

        if (request.getDescription() != null) {
            product.setDescription(request.getDescription());
        }

        if (request.getUnitPrice() != null) {
            product.setUnitPrice(request.getUnitPrice());
        }

        if (request.getActive() != null) {
            product.setActive(request.getActive());
        }

        return ProductMapper.toResponse(productRepository.save(product));
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        ProductEntity product = findProductEntityById(id);
        product.setActive(false);
        productRepository.save(product);
    }

    private ProductEntity findProductEntityById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
    }
}
