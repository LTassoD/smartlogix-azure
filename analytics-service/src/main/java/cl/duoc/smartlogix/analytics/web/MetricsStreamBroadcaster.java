package cl.duoc.smartlogix.analytics.web;

import cl.duoc.smartlogix.analytics.application.MetricsAggregator;
import cl.duoc.smartlogix.analytics.domain.MetricsSnapshot;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * Empuja la foto de metricas a cada cliente SSE conectado. Un cliente que se
 * desconecta se quita de la lista sin afectar a los demas.
 */
@Slf4j
@Component
public class MetricsStreamBroadcaster {

    static final String EVENT_NAME = "metrics";

    private final MetricsAggregator aggregator;
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public MetricsStreamBroadcaster(MetricsAggregator aggregator) {
        this.aggregator = aggregator;
    }

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(error -> emitters.remove(emitter));
        if (!send(emitter, aggregator.snapshot())) {
            emitters.remove(emitter);
        }
        return emitter;
    }

    @Scheduled(fixedRateString = "${smartlogix.analytics.stream-interval-ms:1000}")
    public void broadcast() {
        if (emitters.isEmpty()) {
            return;
        }
        MetricsSnapshot snapshot = aggregator.snapshot();
        for (SseEmitter emitter : emitters) {
            if (!send(emitter, snapshot)) {
                emitters.remove(emitter);
            }
        }
    }

    public int connectedClients() {
        return emitters.size();
    }

    private boolean send(SseEmitter emitter, MetricsSnapshot snapshot) {
        try {
            emitter.send(SseEmitter.event().name(EVENT_NAME).data(snapshot));
            return true;
        } catch (IOException | IllegalStateException exception) {
            log.debug("Cliente SSE desconectado: {}", exception.getMessage());
            return false;
        }
    }
}
