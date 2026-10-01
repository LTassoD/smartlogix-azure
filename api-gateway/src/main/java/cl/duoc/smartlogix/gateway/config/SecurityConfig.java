package cl.duoc.smartlogix.gateway.config;

// --- Importaciones: seguridad de Spring, JWT (OAuth2 Resource Server) y conversión de claims ---
import java.nio.charset.StandardCharsets;   // Para pasar el secret a bytes (UTF-8)
import java.util.List;                      // Lista de authorities
import javax.crypto.SecretKey;              // Tipo genérico de clave simétrica
import javax.crypto.spec.SecretKeySpec;     // Construye la clave desde bytes (HmacSHA256)
import org.springframework.beans.factory.annotation.Value;   // Lee propiedades del application.properties
import org.springframework.context.annotation.Bean;          // Declara beans
import org.springframework.context.annotation.Configuration; // Clase de configuración
import org.springframework.core.convert.converter.Converter; // Convierte Jwt → AuthenticationToken
import org.springframework.http.HttpMethod;                  // Para matchear métodos HTTP en las rutas
import org.springframework.security.authentication.AbstractAuthenticationToken; // Token base de autenticación
import org.springframework.security.config.Customizer;       // Configuración por defecto (p.ej. CORS)                             
import org.springframework.security.config.annotation.web.builders.HttpSecurity; // Builder de seguridad HTTP
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity; // Habilita seguridad web
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer; // Para desactivar CSRF
import org.springframework.security.core.authority.SimpleGrantedAuthority; // "ROLE_ADMIN", etc.
import org.springframework.security.oauth2.jose.jws.MacAlgorithm; // Algoritmo HS256
import org.springframework.security.oauth2.jwt.Jwt;               // Token decodificado
import org.springframework.security.oauth2.jwt.JwtDecoder;       // Valida la firma del JWT
import org.springframework.security.oauth2.jwt.JwtException;     // Error al validar claims obligatorios
import org.springframework.security.oauth2.jwt.JwtValidators;    // Validadores estándar (issuer, exp, nbf)
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder; // Implementación Nimbus del decoder
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken; // Token autenticado con el JWT
import org.springframework.security.web.SecurityFilterChain;     // La cadena de filtros de seguridad

// @Configuration + @EnableWebSecurity: activa y personaliza la seguridad web de Spring.
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // Define la CADENA DE FILTROS: cada request pasa por estos filtros JWT.
    // Aquí se decide qué rutas son públicas y cuáles exigen token y rol.
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Desactiva CSRF: la API usa tokens JWT (no cookies de sesión), CSRF no aplica.
                .csrf(AbstractHttpConfigurer::disable)
                // Activa CORS usando lo configurado (Bean WebMvcConfigurer/CorsConfigurationSource).
                .cors(Customizer.withDefaults())
                // Reglas de AUTORIZACIÓN por ruta (matcher):
                .authorizeHttpRequests(authorize -> authorize
                        // --- Rutas PÚBLICAS (sin token) ---
                        // Login: cualquiera puede pedir un token.
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        // Segundo factor (TOTP): público, es parte del login.
                        .requestMatchers(HttpMethod.POST, "/api/auth/2fa").permitAll()
                        // Health/actuator/swagger accesibles sin token (monitoreo y docs).
                        .requestMatchers(
                                "/actuator/health",
                                "/actuator/info",
                                "/actuator/gateway/routes",
                                "/api/system/health",
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/v3/api-docs",
                                "/v3/api-docs/**"
                        ).permitAll()
                        // Preflight CORS (OPTIONS) siempre permitido.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // --- Rutas que exigen CUALQUIER token válido ---
                        .requestMatchers("/api/auth/me").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/users/me/password").authenticated()

                        // --- Rutas con ROL específico ---
                        // Gestión de usuarios: SOLO admin (ROLE_ADMIN).
                        .requestMatchers("/api/users", "/api/users/**").hasRole("ADMIN")
                        // Lecturas de inventory/orders/shipping: cualquier rol autenticado
                        // (incluye al Viewer de solo lectura).
                        .requestMatchers(HttpMethod.GET, "/api/inventory/**", "/api/orders/**", "/api/shipping/**")
                        .hasAnyRole("ADMIN", "OPERATOR", "VIEWER")
                        // ESCRITURAS (POST/PATCH/DELETE) sobre esos dominios:
                        // solo admin u operator (el Viewer NO puede escribir).
                        .requestMatchers("/api/inventory/**", "/api/orders/**", "/api/shipping/**")
                        .hasAnyRole("ADMIN", "OPERATOR")
                        // Cualquier otra ruta: exige token (sin importar el rol).
                        .anyRequest().authenticated()
                )
                // Configura el servidor como OAuth2 Resource Server validando JWT.
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));

        return http.build();
    }

    // Crea el DECODER de JWT: valida la firma del token con la clave secreta (HS256)
    // y el issuer (emisor). Se inyectan desde application.properties.
    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${smartlogix.jwt.secret}") String secret,  // Clave secreta compartida
            @Value("${smartlogix.jwt.issuer}") String issuer   // Emisor esperado (p.ej. "smartlogix-identity")
    ) {
        // NimbusJwtDecoder: decodifica y verifica la firma con la clave simétrica.
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(secretKey(secret))
                .macAlgorithm(MacAlgorithm.HS256)  // El token debe estar firmado con HS256
                .build();

        // Valida el issuer, la expiración (exp) y el not-before (nbf) del token.
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuer));

        return decoder;
    }

    // Convierte el JWT validado en un AuthenticationToken de Spring.
    // Extrae el claim "role" y lo transforma en una authority "ROLE_<rol>".
    // Así los .hasRole(...)/.hasAnyRole(...) de arriba pueden comparar.
    @Bean
    public Converter<Jwt, ? extends AbstractAuthenticationToken> jwtAuthenticationConverter() {
        return jwt -> {
            // Lee el claim personalizado "role" del payload del token.
            String role = jwt.getClaimAsString("role");

            // Exigencia: el token DEBE traer un rol.
            if (role == null || role.isBlank()) {
                throw new JwtException("JWT role claim is required");
            }

            // Construye el token de autenticación con:
            //  - el JWT original,
            //  - una lista de authorities: "ROLE_" + rol (p.ej. "ROLE_ADMIN"),
            //  - el subject (usuario) como principal.
            return new JwtAuthenticationToken(
                    jwt,
                    List.of(new SimpleGrantedAuthority("ROLE_" + role)),
                    jwt.getSubject()
            );
        };
    }

    // Helper: la clave secreta (string) → objeto SecretKey usable por Nimbus (HmacSHA256).
    private SecretKey secretKey(String secret) {
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }
}