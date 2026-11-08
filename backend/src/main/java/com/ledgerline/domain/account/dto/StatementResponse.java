package com.ledgerline.domain.account.dto;

import com.ledgerline.domain.account.entity.AccountStatus;
import com.ledgerline.domain.account.entity.AccountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatementResponse {

    private Long accountId;
    private String accountNumber;
    private BigDecimal currentBalance;
    private String currency;
    private AccountType accountType;
    private AccountStatus status;
    private List<LedgerEntryDto> entries;
}

