package com.ledgerline.domain.reconciliation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountReconciliationDto {
    private Long accountId;
    private String accountNumber;
    private BigDecimal materializedBalance;
    private BigDecimal ledgerComputedBalance;
    private BigDecimal difference;
    private boolean balanced;
    private String currency;
    private LocalDateTime reconciledAt;
}

