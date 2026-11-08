package com.ledgerline.domain.ledger.dto;

import com.ledgerline.domain.ledger.entity.EntryDirection;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LedgerEntryRecord {
    private Long entryId;
    private Long accountId;
    private String accountNumber;
    private EntryDirection direction;
    private BigDecimal amount;
    private BigDecimal balanceAfter;
}

