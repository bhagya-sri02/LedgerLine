package com.ledgerline.domain.ledger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepositCommand {
    private Long accountId;
    private BigDecimal amount;
    private String currency;
    private String description;
}

