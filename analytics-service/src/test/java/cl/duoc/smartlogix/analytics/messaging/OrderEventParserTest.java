package cl.duoc.smartlogix.analytics.messaging;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class OrderEventParserTest {

    private final OrderEventParser parser = new OrderEventParser(JsonMapper.builder().build());

    @Test
    void parseaElContratoDeOrderCreated() {
        String json = """
                {"orderId":991,"orderNumber":"ORD-20261118-00991","customerId":57,
                 "totalAmount":24990.00,
                 "items":[{"productId":17,"warehouseId":2,"sku":"HUB-017",
                           "productName":"Hub USB 7 puertos","quantity":2,"unitPrice":12495.00}],
                 "createdAt":"2026-11-18T10:30:00"}
                """;

        var pedido = parser.parse(json, 2).orElseThrow();

        assertEquals("ORD-20261118-00991", pedido.orderNumber());
        assertEquals(2, pedido.partition());
        assertEquals(0, new BigDecimal("24990.00").compareTo(pedido.total()));
        assertEquals("Hub USB 7 puertos", pedido.items().get(0).productName());
        assertEquals(2, pedido.items().get(0).quantity());
        assertEquals(0, new BigDecimal("24990.00").compareTo(pedido.items().get(0).subtotal()));
    }

    @Test
    void jsonMalformadoSeDescarta() {
        assertFalse(parser.parse("{esto no es json", 0).isPresent());
    }

    @Test
    void eventoSinOrderNumberSeDescarta() {
        assertFalse(parser.parse("{\"totalAmount\":100}", 0).isPresent());
    }

    @Test
    void itemsAusentesNoRompen() {
        var pedido = parser.parse("{\"orderNumber\":\"ORD-1\",\"totalAmount\":0}", 1).orElseThrow();

        assertTrue(pedido.items().isEmpty());
    }
}
