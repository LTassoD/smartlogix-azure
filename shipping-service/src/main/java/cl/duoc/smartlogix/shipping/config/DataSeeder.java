package cl.duoc.smartlogix.shipping.config;

import cl.duoc.smartlogix.shipping.domain.enums.CarrierCode;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.CarrierEntity;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.repository.CarrierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class DataSeeder {

    private final CarrierRepository carrierRepository;

    @Bean
    @ConditionalOnProperty(name = "smartlogix.seed.enabled", havingValue = "true", matchIfMissing = true)
    CommandLineRunner seedShippingData() {
        return args -> {
            seedCarrier(CarrierCode.CHILEXPRESS.name(), "Chilexpress", "NATIONAL");
            seedCarrier(CarrierCode.STARKEN.name(), "Starken", "NATIONAL");
            seedCarrier(CarrierCode.BLUE_EXPRESS.name(), "Blue Express", "EXPRESS");
        };
    }

    private void seedCarrier(String code, String name, String serviceType) {
        carrierRepository.findByCode(code)
                .orElseGet(() -> carrierRepository.save(CarrierEntity.builder()
                        .code(code)
                        .name(name)
                        .serviceType(serviceType)
                        .active(true)
                        .simulatedAvailable(true)
                        .build()));
    }
}
