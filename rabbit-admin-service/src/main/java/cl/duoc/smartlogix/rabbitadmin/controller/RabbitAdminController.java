package cl.duoc.smartlogix.rabbitadmin.controller;

import cl.duoc.smartlogix.rabbitadmin.dto.AdminResponse;
import cl.duoc.smartlogix.rabbitadmin.dto.CreateBindingRequest;
import cl.duoc.smartlogix.rabbitadmin.dto.CreateExchangeRequest;
import cl.duoc.smartlogix.rabbitadmin.dto.CreateQueueRequest;
import cl.duoc.smartlogix.rabbitadmin.service.RabbitAdminService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API REST de administración de RabbitMQ.
 *
 * Endpoints mínimos exigidos por la rúbrica:
 *   POST   /api/admin/queues              -> crear cola
 *   DELETE /api/admin/queues/{name}       -> borrar cola
 * Se agregan exchanges y bindings para operar la topología completa
 * (direct y topic) desde la misma API.
 */
@RestController
@RequestMapping("/api/admin")
public class RabbitAdminController {

    private final RabbitAdminService adminService;

    public RabbitAdminController(RabbitAdminService adminService) {
        this.adminService = adminService;
    }

    @PostMapping("/queues")
    public AdminResponse createQueue(@Valid @RequestBody CreateQueueRequest request) {
        return adminService.createQueue(request);
    }

    @DeleteMapping("/queues/{name}")
    public AdminResponse deleteQueue(@PathVariable String name) {
        return adminService.deleteQueue(name);
    }

    @PostMapping("/exchanges")
    public AdminResponse createExchange(@Valid @RequestBody CreateExchangeRequest request) {
        return adminService.createExchange(request);
    }

    @DeleteMapping("/exchanges/{name}")
    public AdminResponse deleteExchange(@PathVariable String name) {
        return adminService.deleteExchange(name);
    }

    @PostMapping("/bindings")
    public AdminResponse createBinding(@Valid @RequestBody CreateBindingRequest request) {
        return adminService.createBinding(request);
    }

    @DeleteMapping("/bindings")
    public AdminResponse deleteBinding(@Valid @RequestBody CreateBindingRequest request) {
        return adminService.deleteBinding(request);
    }
}
