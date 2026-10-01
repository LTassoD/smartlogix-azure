package cl.duoc.smartlogix.gateway.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-Id";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String correlationId = request.getHeader(CORRELATION_ID_HEADER);

        if (!StringUtils.hasText(correlationId)) {
            correlationId = UUID.randomUUID().toString();
        }

        response.setHeader(CORRELATION_ID_HEADER, correlationId);
        log.debug(
                "Gateway request method={} path={} correlationId={}",
                request.getMethod(),
                request.getRequestURI(),
                correlationId
        );

        filterChain.doFilter(new CorrelationIdRequestWrapper(request, correlationId), response);
    }

    private static class CorrelationIdRequestWrapper extends HttpServletRequestWrapper {

        private final String correlationId;

        private CorrelationIdRequestWrapper(HttpServletRequest request, String correlationId) {
            super(request);
            this.correlationId = correlationId;
        }

        @Override
        public String getHeader(String name) {
            if (CORRELATION_ID_HEADER.equalsIgnoreCase(name)) {
                return correlationId;
            }

            return super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            if (CORRELATION_ID_HEADER.equalsIgnoreCase(name)) {
                return Collections.enumeration(List.of(correlationId));
            }

            return super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            List<String> headerNames = new ArrayList<>(Collections.list(super.getHeaderNames()));
            boolean hasCorrelationHeader = headerNames.stream()
                    .anyMatch(name -> CORRELATION_ID_HEADER.equalsIgnoreCase(name));

            if (!hasCorrelationHeader) {
                headerNames.add(CORRELATION_ID_HEADER);
            }

            return Collections.enumeration(headerNames);
        }
    }
}
