package cl.duoc.smartlogix.shipping.infrastructure.carrier;

import cl.duoc.smartlogix.shipping.domain.exception.BusinessRuleException;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.CarrierEntity;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class CarrierFactory {

    private final Map<String, CarrierAdapter> adapters;

    public CarrierFactory(List<CarrierAdapter> adapters) {
        this.adapters = adapters.stream()
                .collect(Collectors.toMap(CarrierAdapter::getCarrierCode, Function.identity()));
    }

    public Optional<CarrierSelection> selectCarrier(String requestedCarrierCode, List<CarrierEntity> carriers) {
        if (StringUtils.hasText(requestedCarrierCode)) {
            String normalizedCode = requestedCarrierCode.trim().toUpperCase();
            Optional<CarrierSelection> requestedSelection = findAvailableSelection(normalizedCode, carriers);

            if (requestedSelection.isPresent()) {
                return requestedSelection;
            }
        }

        return carriers.stream()
                .filter(this::isAvailable)
                .findFirst()
                .map(carrier -> new CarrierSelection(carrier, getAdapter(carrier.getCode())));
    }

    public CarrierAdapter getAdapter(String carrierCode) {
        CarrierAdapter adapter = adapters.get(carrierCode);

        if (adapter == null) {
            throw new BusinessRuleException("Unsupported carrier code: " + carrierCode);
        }

        return adapter;
    }

    private Optional<CarrierSelection> findAvailableSelection(String carrierCode, List<CarrierEntity> carriers) {
        return carriers.stream()
                .filter(carrier -> carrierCode.equals(carrier.getCode()))
                .filter(this::isAvailable)
                .findFirst()
                .map(carrier -> new CarrierSelection(carrier, getAdapter(carrier.getCode())));
    }

    private boolean isAvailable(CarrierEntity carrier) {
        return getAdapter(carrier.getCode()).isAvailable(carrier);
    }

    public record CarrierSelection(CarrierEntity carrier, CarrierAdapter adapter) {
    }
}
