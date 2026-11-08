package com.ledgerline.domain.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogDto {

    private Long id;
    private String actor;
    private String action;
    private String entityType;
    private String entityId;
    private String metadata;
    private LocalDateTime createdAt;
}
