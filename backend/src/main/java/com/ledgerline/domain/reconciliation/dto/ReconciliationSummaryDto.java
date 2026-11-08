package com.ledgerline.domain.reconciliation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReconciliationSummaryDto {
    private String status;
    private boolean globalZeroSumBalanced;
    private BigDecimal totalGlobalDebits;
    private BigDecimal totalGlobalCredits;
    private int totalAccountsChecked;
    private int discrepantAccountsCount;
    private List<DiscrepancyDetail> discrepancies;
    private LocalDateTime timestamp;
}

