package com.ledgerline.domain.account.dto;

import com.ledgerline.domain.ledger.entity.EntryDirection;
import com.ledgerline.domain.ledger.entity.TransactionType;
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
public class LedgerEntryDto {

    private Long id;
    private EntryDirection direction;
    private BigDecimal amount;
    private BigDecimal balanceAfter;
    private String currency;
    private String transactionReference;
    private TransactionType transactionType;
    private String description;
    private LocalDateTime createdAt;
}
