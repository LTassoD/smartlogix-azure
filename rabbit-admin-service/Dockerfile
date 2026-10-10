FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -ntp dependency:go-offline
COPY src src
RUN ./mvnw -B -ntp package -DskipTests

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S smartlogix && adduser -S smartlogix smartlogix
WORKDIR /app
COPY --from=build --chown=smartlogix:smartlogix /workspace/target/*.jar app.jar
USER smartlogix
EXPOSE 8086
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
