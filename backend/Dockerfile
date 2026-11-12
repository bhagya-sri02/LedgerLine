# ==============================================================================
# LedgerLine Core Banking Platform - Production Backend Dockerfile
# Multi-stage build targeting Java 21 LTS for Render & Cloud Deployment
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Package with Maven & Java 21
# ------------------------------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21-jammy AS builder

WORKDIR /app

# Step 1: Cache Maven dependencies (Docker layer caching)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Step 2: Copy source code and build production artifact
COPY src ./src
RUN mvn clean package -DskipTests -B

# Step 3: Identify the repackaged Spring Boot executable JAR (excluding .original)
RUN find target -maxdepth 1 -name "ledgerline-backend-*.jar" ! -name "*.original" -exec cp {} /app/app.jar \;

# ------------------------------------------------------------------------------
# Stage 2: Minimal Production Runtime with Java 21 JRE
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-jammy AS runner

# Create non-privileged user and group for security compliance
RUN groupadd -r ledgerline && useradd -r -g ledgerline -u 1001 -m -s /sbin/nologin ledgerline

WORKDIR /app

# Copy executable jar from builder stage
COPY --from=builder --chown=ledgerline:ledgerline /app/app.jar app.jar

# Render & Cloud environment port configuration (defaults to 8080)
ENV PORT=8080
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

# Switch to non-root user
USER ledgerline

# Expose container port
EXPOSE 8080

# Execute Spring Boot with dynamic PORT binding and exec signal forwarding
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dserver.port=${PORT} -jar app.jar"]

