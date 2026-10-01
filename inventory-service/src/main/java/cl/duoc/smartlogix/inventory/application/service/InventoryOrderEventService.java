package cl.duoc.smartlogix.inventory.application.service;

import cl.duoc.smartlogix.inventory.infrastructure.messaging.event.OrderCreatedEvent;

public interface InventoryOrderEventService {

    void processOrderCreated(OrderCreatedEvent event);
}
