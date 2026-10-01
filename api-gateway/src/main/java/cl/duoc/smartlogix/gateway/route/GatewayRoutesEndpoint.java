package cl.duoc.smartlogix.gateway.route;

import java.util.List;
import org.springframework.boot.actuate.endpoint.annotation.Endpoint;
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation;
import org.springframework.boot.actuate.endpoint.annotation.Selector;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@Endpoint(id = "gateway")
public class GatewayRoutesEndpoint {

    private final String identityUri;
    private final String inventoryUri;
    private final String ordersUri;
    private final String shippingUri;

    public GatewayRoutesEndpoint(
            @Value("${smartlogix.services.identity.url}") String identityUri,
            @Value("${smartlogix.services.inventory.url}") String inventoryUri,
            @Value("${smartlogix.services.orders.url}") String ordersUri,
            @Value("${smartlogix.services.shipping.url}") String shippingUri
    ) {
        this.identityUri = identityUri;
        this.inventoryUri = inventoryUri;
        this.ordersUri = ordersUri;
        this.shippingUri = shippingUri;
    }

    @ReadOperation
    public List<GatewayRouteView> routes(@Selector String operation) {
        if (!"routes".equalsIgnoreCase(operation)) {
            return List.of();
        }

        return routes();
    }

    @ReadOperation
    public List<GatewayRouteView> routes() {
        return List.of(
                new GatewayRouteView(
                        "identity-service",
                        identityUri,
                        GatewayRoutesInfo.AUTH_PREFIX
                ),
                new GatewayRouteView(
                        "inventory-service",
                        inventoryUri,
                        GatewayRoutesInfo.INVENTORY_PREFIX
                ),
                new GatewayRouteView(
                        "order-service",
                        ordersUri,
                        GatewayRoutesInfo.ORDERS_PREFIX
                ),
                new GatewayRouteView(
                        "shipping-service",
                        shippingUri,
                        GatewayRoutesInfo.SHIPPING_PREFIX
                )
        );
    }

    public record GatewayRouteView(String id, String uri, String path) {
    }
}
