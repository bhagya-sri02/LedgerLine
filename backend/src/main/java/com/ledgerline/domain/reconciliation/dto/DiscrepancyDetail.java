package com.ledgerline.domain.reconciliation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiscrepancyDetail {
    private Long accountId;
    private String accountNumber;
    private BigDecimal materializedBalance;
    private BigDecimal ledgerComputedBalance;
    private BigDecimal difference;
}

