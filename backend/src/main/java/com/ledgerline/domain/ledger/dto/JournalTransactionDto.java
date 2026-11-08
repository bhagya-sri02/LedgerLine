package com.ledgerline.domain.ledger.dto;

import com.ledgerline.domain.ledger.entity.TransactionStatus;
import com.ledgerline.domain.ledger.entity.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JournalTransactionDto {

    private Long id;
    private String transactionReference;
    private TransactionType transactionType;
    private TransactionStatus status;
    private String description;
    private LocalDateTime postedAt;
    private List<LedgerEntryRecord> entries;
}
