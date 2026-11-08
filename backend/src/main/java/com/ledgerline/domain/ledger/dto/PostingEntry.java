package com.ledgerline.domain.ledger.dto;

import com.ledgerline.domain.account.entity.Account;
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
public class PostingEntry {
    private Account account;
    private EntryDirection direction;
    private BigDecimal amount;
}

