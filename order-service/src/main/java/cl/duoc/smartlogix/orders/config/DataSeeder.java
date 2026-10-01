package cl.duoc.smartlogix.orders.config;

import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.CustomerEntity;
import cl.duoc.smartlogix.orders.infrastructure.persistence.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class DataSeeder {

    private final CustomerRepository customerRepository;

    @Bean
    @ConditionalOnProperty(name = "smartlogix.seed.enabled", havingValue = "true", matchIfMissing = true)
    CommandLineRunner seedOrderData() {
        return args -> {
            seedCustomer("Juan Perez", "juan.perez@demo.cl", "+56911111111", "Santiago");
            seedCustomer("Maria Gonzalez", "maria.gonzalez@demo.cl", "+56922222222", "Valparaiso");
        };
    }

    private void seedCustomer(String fullName, String email, String phone, String address) {
        customerRepository.findByEmail(email)
                .orElseGet(() -> customerRepository.save(CustomerEntity.builder()
                        .fullName(fullName)
                        .email(email)
                        .phone(phone)
                        .address(address)
                        .active(true)
                        .build()));
    }
}
