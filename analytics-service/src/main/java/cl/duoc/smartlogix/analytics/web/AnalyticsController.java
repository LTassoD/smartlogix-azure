package cl.duoc.smartlogix.analytics.web;

import cl.duoc.smartlogix.analytics.application.MetricsAggregator;
import cl.duoc.smartlogix.analytics.domain.MetricsSnapshot;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final MetricsAggregator aggregator;
    private final MetricsStreamBroadcaster broadcaster;

    public AnalyticsController(MetricsAggregator aggregator, MetricsStreamBroadcaster broadcaster) {
        this.aggregator = aggregator;
        this.broadcaster = broadcaster;
    }

    @GetMapping("/metrics")
    public MetricsSnapshot metrics() {
        return aggregator.snapshot();
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return broadcaster.subscribe();
    }
}
