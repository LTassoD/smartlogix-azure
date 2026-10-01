package cl.duoc.smartlogix.orders.application.service;

import cl.duoc.smartlogix.orders.presentation.dto.request.CreateOrderRequest;
import cl.duoc.smartlogix.orders.presentation.dto.request.UpdateOrderStatusRequest;
import cl.duoc.smartlogix.orders.presentation.dto.response.OrderResponse;
import cl.duoc.smartlogix.orders.presentation.dto.response.OrderStatusHistoryResponse;
import java.util.List;

public interface OrderService {

    OrderResponse create(CreateOrderRequest request);

    List<OrderResponse> findAll();

    OrderResponse findById(Long id);

    OrderResponse findByOrderNumber(String orderNumber);

    List<OrderResponse> findByCustomer(Long customerId);

    OrderResponse updateStatus(Long id, UpdateOrderStatusRequest request);

    OrderResponse confirm(Long id);

    OrderResponse cancel(Long id);

    List<OrderStatusHistoryResponse> getHistory(Long id);
}
