package cl.duoc.smartlogix.inventory.application.service.impl;

import cl.duoc.smartlogix.inventory.application.mapper.StockMapper;
import cl.duoc.smartlogix.inventory.application.mapper.StockMovementMapper;
import cl.duoc.smartlogix.inventory.application.service.StockService;
import cl.duoc.smartlogix.inventory.domain.enums.StockMovementType;
import cl.duoc.smartlogix.inventory.domain.exception.BusinessRuleException;
import cl.duoc.smartlogix.inventory.domain.exception.ResourceNotFoundException;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.ProductEntity;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.StockEntity;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.StockMovementEntity;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.WarehouseEntity;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.repository.ProductRepository;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.repository.StockMovementRepository;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.repository.StockRepository;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.repository.WarehouseRepository;
import cl.duoc.smartlogix.inventory.presentation.dto.request.CreateStockMovementRequest;
import cl.duoc.smartlogix.inventory.presentation.dto.request.UpdateStockMinimumRequest;
import cl.duoc.smartlogix.inventory.presentation.dto.response.StockMovementResponse;
import cl.duoc.smartlogix.inventory.presentation.dto.response.StockResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StockServiceImpl implements StockService {

    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;
    private final StockRepository stockRepository;
    private final StockMovementRepository stockMovementRepository;

    @Override
    @Transactional
    public StockMovementResponse createMovement(CreateStockMovementRequest request) {
        ProductEntity product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with id: " + request.getProductId()
                ));
        WarehouseEntity warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Warehouse not found with id: " + request.getWarehouseId()
                ));

        StockEntity stock = applyMovement(product, warehouse, request);
        stockRepository.save(stock);

        StockMovementEntity movement = StockMovementEntity.builder()
                .product(product)
                .warehouse(warehouse)
                .type(request.getType())
                .quantity(request.getQuantity())
                .reason(request.getReason())
                .referenceCode(request.getReferenceCode())
                .build();

        return StockMovementMapper.toResponse(stockMovementRepository.save(movement));
    }

    @Override
    @Transactional
    public StockMovementResponse createOrderOutMovement(
            Long productId,
            Long warehouseId,
            Integer quantity,
            String reason,
            String referenceCode
    ) {
        return createMovement(CreateStockMovementRequest.builder()
                .productId(productId)
                .warehouseId(warehouseId)
                .type(StockMovementType.ORDER_OUT)
                .quantity(quantity)
                .reason(reason)
                .referenceCode(referenceCode)
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockResponse> findStockByProduct(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found with id: " + productId);
        }

        return stockRepository.findByProductId(productId).stream()
                .map(StockMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public StockResponse updateMinimumStock(Long productId, Long warehouseId, UpdateStockMinimumRequest request) {
        ProductEntity product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));
        WarehouseEntity warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + warehouseId));

        StockEntity stock = getOrCreateStock(product, warehouse);
        stock.setMinimumStock(request.getMinimumStock());

        return StockMapper.toResponse(stockRepository.save(stock));
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockMovementResponse> findAllMovements() {
        return stockMovementRepository.findAll().stream()
                .map(StockMovementMapper::toResponse)
                .toList();
    }

    private StockEntity applyMovement(
            ProductEntity product,
            WarehouseEntity warehouse,
            CreateStockMovementRequest request
    ) {
        return switch (request.getType()) {
            case IN -> applyInbound(product, warehouse, request.getQuantity());
            case ADJUSTMENT -> applyAdjustment(product, warehouse, request.getQuantity());
            case OUT, ORDER_OUT -> applyOutbound(product.getId(), warehouse.getId(), request);
        };
    }

    private StockEntity applyInbound(ProductEntity product, WarehouseEntity warehouse, Integer quantity) {
        StockEntity stock = getOrCreateStock(product, warehouse);
        stock.setQuantity(stock.getQuantity() + quantity);
        return stock;
    }

    private StockEntity applyAdjustment(ProductEntity product, WarehouseEntity warehouse, Integer quantity) {
        StockEntity stock = getOrCreateStock(product, warehouse);
        stock.setQuantity(quantity);
        return stock;
    }

    private StockEntity applyOutbound(Long productId, Long warehouseId, CreateStockMovementRequest request) {
        StockEntity stock = stockRepository.findByProductIdAndWarehouseId(productId, warehouseId)
                .orElseThrow(() -> new BusinessRuleException(
                        "Stock does not exist for product " + productId + " and warehouse " + warehouseId
                ));

        int newQuantity = stock.getQuantity() - request.getQuantity();
        if (newQuantity < 0) {
            throw new BusinessRuleException("Stock cannot be negative");
        }

        stock.setQuantity(newQuantity);
        return stock;
    }

    private StockEntity getOrCreateStock(ProductEntity product, WarehouseEntity warehouse) {
        return stockRepository.findByProductIdAndWarehouseId(product.getId(), warehouse.getId())
                .orElseGet(() -> StockEntity.builder()
                        .product(product)
                        .warehouse(warehouse)
                        .quantity(0)
                        .minimumStock(0)
                        .build());
    }
}
