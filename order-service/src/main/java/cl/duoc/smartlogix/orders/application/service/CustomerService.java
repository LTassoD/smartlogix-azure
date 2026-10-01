package cl.duoc.smartlogix.orders.application.service;

import cl.duoc.smartlogix.orders.presentation.dto.request.CreateCustomerRequest;
import cl.duoc.smartlogix.orders.presentation.dto.request.UpdateCustomerRequest;
import cl.duoc.smartlogix.orders.presentation.dto.response.CustomerResponse;
import java.util.List;

public interface CustomerService {

    CustomerResponse create(CreateCustomerRequest request);

    List<CustomerResponse> findAll();

    CustomerResponse findById(Long id);

    CustomerResponse update(Long id, UpdateCustomerRequest request);

    void deactivate(Long id);
}
