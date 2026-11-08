package com.ledgerline.domain.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerline.domain.audit.entity.AuditLog;
import com.ledgerline.domain.audit.repository.AuditLogRepository;
import com.ledgerline.domain.auth.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    /**
     * Records an audit event atomically within the calling transaction.
     * Never logs passwords, secrets or credentials.
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public AuditLog recordAudit(User actor, String action, String entityType, String entityId, Map<String, Object> metadata) {
        String sanitizedMetadataJson = null;
        if (metadata != null && !metadata.isEmpty()) {
            Map<String, Object> sanitized = new HashMap<>(metadata);
            sanitized.remove("password");
            sanitized.remove("passwordHash");
            sanitized.remove("secret");
            sanitized.remove("token");
            try {
                sanitizedMetadataJson = objectMapper.writeValueAsString(sanitized);
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize audit metadata for entity {}", entityId, e);
                sanitizedMetadataJson = "{\"error\":\"Serialization failed\"}";
            }
        }

        AuditLog auditLog = AuditLog.builder()
                .actor(actor)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .metadata(sanitizedMetadataJson)
                .build();

        return auditLogRepository.save(auditLog);
    }
}

