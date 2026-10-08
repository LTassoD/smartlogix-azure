package cl.duoc.smartlogix.sbadmin.service;

import cl.duoc.smartlogix.sbadmin.dto.AdminResponse;
import cl.duoc.smartlogix.sbadmin.dto.CreateQueueRequest;
import cl.duoc.smartlogix.sbadmin.dto.CreateRuleRequest;
import cl.duoc.smartlogix.sbadmin.dto.CreateSubscriptionRequest;
import cl.duoc.smartlogix.sbadmin.dto.CreateTopicRequest;
import com.azure.messaging.servicebus.administration.ServiceBusAdministrationAsyncClient;
import com.azure.messaging.servicebus.administration.models.CreateQueueOptions;
import com.azure.messaging.servicebus.administration.models.CreateRuleOptions;
import com.azure.messaging.servicebus.administration.models.CreateSubscriptionOptions;
import com.azure.messaging.servicebus.administration.models.CreateTopicOptions;
import com.azure.messaging.servicebus.administration.models.SqlRuleFilter;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
public class ServiceBusAdminService {

    private final ServiceBusAdministrationAsyncClient adminClient;

    public ServiceBusAdminService(ServiceBusAdministrationAsyncClient adminClient) {
        this.adminClient = adminClient;
    }

    public Mono<AdminResponse> createQueue(CreateQueueRequest request) {
        CreateQueueOptions options = new CreateQueueOptions()
                .setSessionRequired(request.requiresSession())
                .setMaxDeliveryCount(request.maxDeliveryCount() == null ? 10 : request.maxDeliveryCount())
                .setDefaultMessageTimeToLive(parseDuration(request.defaultMessageTimeToLive(),
                        java.time.Duration.ofMinutes(14 * 24 * 60)))
                .setLockDuration(parseDuration(request.lockDuration(), java.time.Duration.ofMinutes(1)));

        return adminClient.createQueue(request.name(), options)
                .map(q -> new AdminResponse("CREATE", "queue", q.getName(), "created"));
    }

    public Mono<AdminResponse> deleteQueue(String name) {
        return adminClient.deleteQueue(name)
                .thenReturn(new AdminResponse("DELETE", "queue", name, "deleted"));
    }

    public Mono<AdminResponse> createTopic(CreateTopicRequest request) {
        CreateTopicOptions options = new CreateTopicOptions()
                .setPartitioningEnabled(request.enablePartitioning())
                .setDefaultMessageTimeToLive(parseDuration(request.defaultMessageTimeToLive(),
                        java.time.Duration.ofMinutes(14 * 24 * 60)));

        return adminClient.createTopic(request.name(), options)
                .map(t -> new AdminResponse("CREATE", "topic", t.getName(), "created"));
    }

    public Mono<AdminResponse> deleteTopic(String name) {
        return adminClient.deleteTopic(name)
                .thenReturn(new AdminResponse("DELETE", "topic", name, "deleted"));
    }

    public Mono<AdminResponse> createSubscription(CreateSubscriptionRequest request, String topicName) {
        CreateSubscriptionOptions options = new CreateSubscriptionOptions()
                .setSessionRequired(false)
                .setEnableDeadLetteringOnFilterEvaluationExceptions(true);
        CreateRuleOptions ruleOptions = new CreateRuleOptions(new SqlRuleFilter(request.sqlFilter()));

        return adminClient.createSubscription(topicName, request.name(), request.name(), options, ruleOptions)
                .map(s -> new AdminResponse("CREATE", "subscription", s.getSubscriptionName(), "created"));
    }

    public Mono<AdminResponse> deleteSubscription(String topicName, String subscriptionName) {
        return adminClient.deleteSubscription(topicName, subscriptionName)
                .thenReturn(new AdminResponse("DELETE", "subscription", subscriptionName, "deleted"));
    }

    public Mono<AdminResponse> createRule(CreateRuleRequest request, String topicName, String subscriptionName) {
        CreateRuleOptions options = new CreateRuleOptions(new SqlRuleFilter(request.sqlFilter()));

        return adminClient.createRule(topicName, subscriptionName, request.name(), options)
                .map(r -> new AdminResponse("CREATE", "rule", r.getName(), "created"));
    }

    public Mono<AdminResponse> deleteRule(String topicName, String subscriptionName, String ruleName) {
        return adminClient.deleteRule(topicName, subscriptionName, ruleName)
                .thenReturn(new AdminResponse("DELETE", "rule", ruleName, "deleted"));
    }

    private java.time.Duration parseDuration(String value, java.time.Duration defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return java.time.Duration.parse(value);
    }
}
