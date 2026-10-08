package cl.duoc.smartlogix.sbadmin.config;

import com.azure.messaging.servicebus.administration.ServiceBusAdministrationClientBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ServiceBusAdminConfig {

    @Value("${smartlogix.servicebus.host}")
    private String host;

    @Value("${smartlogix.servicebus.policy-name}")
    private String policyName;

    @Value("${smartlogix.servicebus.policy-key}")
    private String policyKey;

    @Bean
    public com.azure.messaging.servicebus.administration.ServiceBusAdministrationAsyncClient serviceBusAdminClient() {
        String connectionString = String.format(
                "Endpoint=sb://%s/;SharedAccessKeyName=%s;SharedAccessKey=%s",
                host, policyName, policyKey);

        return new ServiceBusAdministrationClientBuilder()
                .connectionString(connectionString)
                .buildAsyncClient();
    }
}