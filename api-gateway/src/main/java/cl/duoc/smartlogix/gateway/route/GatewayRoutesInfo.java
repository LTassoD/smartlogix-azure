package cl.duoc.smartlogix.gateway.route;

public final class GatewayRoutesInfo {

    public static final String AUTH_PREFIX = "/api/auth/**";
    public static final String INVENTORY_PREFIX = "/api/inventory/**";
    public static final String ORDERS_PREFIX = "/api/orders/**";
    public static final String SHIPPING_PREFIX = "/api/shipping/**";
    public static final String AUTH_URI = "http://localhost:8084";
    public static final String INVENTORY_URI = "http://localhost:8081";
    public static final String ORDERS_URI = "http://localhost:8082";
    public static final String SHIPPING_URI = "http://localhost:8083";

    private GatewayRoutesInfo() {
        throw new UnsupportedOperationException("Utility class");
    }
}
