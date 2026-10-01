package cl.duoc.smartlogix.orders.application.service.impl;

import cl.duoc.smartlogix.orders.application.mapper.CustomerMapper;
import cl.duoc.smartlogix.orders.application.service.CustomerService;
import cl.duoc.smartlogix.orders.domain.exception.DuplicateResourceException;
import cl.duoc.smartlogix.orders.domain.exception.ResourceNotFoundException;
import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.CustomerEntity;
import cl.duoc.smartlogix.orders.infrastructure.persistence.repository.CustomerRepository;
import cl.duoc.smartlogix.orders.presentation.dto.request.CreateCustomerRequest;
import cl.duoc.smartlogix.orders.presentation.dto.request.UpdateCustomerRequest;
import cl.duoc.smartlogix.orders.presentation.dto.response.CustomerResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;

    @Override
    @Transactional
    public CustomerResponse create(CreateCustomerRequest request) {
        String email = normalizeEmail(request.getEmail());

        if (customerRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Customer email already exists: " + email);
        }

        request.setEmail(email);
        CustomerEntity customer = CustomerMapper.toEntity(request);
        return CustomerMapper.toResponse(customerRepository.save(customer));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CustomerResponse> findAll() {
        return customerRepository.findByActiveTrue().stream()
                .map(CustomerMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerResponse findById(Long id) {
        return CustomerMapper.toResponse(findCustomerEntityById(id));
    }

    @Override
    @Transactional
    public CustomerResponse update(Long id, UpdateCustomerRequest request) {
        CustomerEntity customer = findCustomerEntityById(id);

        if (StringUtils.hasText(request.getFullName())) {
            customer.setFullName(request.getFullName());
        }

        if (request.getPhone() != null) {
            customer.setPhone(request.getPhone());
        }

        if (request.getAddress() != null) {
            customer.setAddress(request.getAddress());
        }

        if (request.getActive() != null) {
            customer.setActive(request.getActive());
        }

        return CustomerMapper.toResponse(customerRepository.save(customer));
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        CustomerEntity customer = findCustomerEntityById(id);
        customer.setActive(false);
        customerRepository.save(customer);
    }

    private CustomerEntity findCustomerEntityById(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }
}
