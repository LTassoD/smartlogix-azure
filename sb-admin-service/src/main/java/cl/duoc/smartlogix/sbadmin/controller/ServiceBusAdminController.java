package cl.duoc.smartlogix.sbadmin.controller;

import cl.duoc.smartlogix.sbadmin.dto.AdminResponse;
import cl.duoc.smartlogix.sbadmin.dto.CreateQueueRequest;
import cl.duoc.smartlogix.sbadmin.dto.CreateRuleRequest;
import cl.duoc.smartlogix.sbadmin.dto.CreateSubscriptionRequest;
import cl.duoc.smartlogix.sbadmin.dto.CreateTopicRequest;
import cl.duoc.smartlogix.sbadmin.service.ServiceBusAdminService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/admin")
public class ServiceBusAdminController {

    private final ServiceBusAdminService adminService;

    public ServiceBusAdminController(ServiceBusAdminService adminService) {
        this.adminService = adminService;
    }

    @PostMapping("/queues")
    public Mono<AdminResponse> createQueue(@Valid @RequestBody CreateQueueRequest request) {
        return adminService.createQueue(request);
    }

    @DeleteMapping("/queues/{name}")
    public Mono<AdminResponse> deleteQueue(@PathVariable String name) {
        return adminService.deleteQueue(name);
    }

    @PostMapping("/topics")
    public Mono<AdminResponse> createTopic(@Valid @RequestBody CreateTopicRequest request) {
        return adminService.createTopic(request);
    }

    @DeleteMapping("/topics/{name}")
    public Mono<AdminResponse> deleteTopic(@PathVariable String name) {
        return adminService.deleteTopic(name);
    }

    @PostMapping("/topics/{topicName}/subscriptions")
    public Mono<AdminResponse> createSubscription(
            @PathVariable String topicName,
            @Valid @RequestBody CreateSubscriptionRequest request) {
        return adminService.createSubscription(request, topicName);
    }

    @DeleteMapping("/topics/{topicName}/subscriptions/{subscriptionName}")
    public Mono<AdminResponse> deleteSubscription(
            @PathVariable String topicName,
            @PathVariable String subscriptionName) {
        return adminService.deleteSubscription(topicName, subscriptionName);
    }

    @PostMapping("/topics/{topicName}/subscriptions/{subscriptionName}/rules")
    public Mono<AdminResponse> createRule(
            @PathVariable String topicName,
            @PathVariable String subscriptionName,
            @Valid @RequestBody CreateRuleRequest request) {
        return adminService.createRule(request, topicName, subscriptionName);
    }

    @DeleteMapping("/topics/{topicName}/subscriptions/{subscriptionName}/rules/{ruleName}")
    public Mono<AdminResponse> deleteRule(
            @PathVariable String topicName,
            @PathVariable String subscriptionName,
            @PathVariable String ruleName) {
        return adminService.deleteRule(topicName, subscriptionName, ruleName);
    }
}