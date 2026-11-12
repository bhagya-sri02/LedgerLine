package com.ledgerline.domain.reconciliation.service;

import com.ledgerline.common.exception.AccountNotFoundException;
import com.ledgerline.domain.account.entity.Account;
import com.ledgerline.domain.account.entity.AccountType;
import com.ledgerline.domain.account.repository.AccountRepository;
import com.ledgerline.domain.ledger.entity.EntryDirection;
import com.ledgerline.domain.ledger.repository.LedgerEntryRepository;
import com.ledgerline.domain.reconciliation.dto.AccountReconciliationDto;
import com.ledgerline.domain.reconciliation.dto.DiscrepancyDetail;
import com.ledgerline.domain.reconciliation.dto.ReconciliationSummaryDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class ReconciliationService {

    private final AccountRepository accountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;

    public ReconciliationService(
            AccountRepository accountRepository,
            LedgerEntryRepository ledgerEntryRepository
    ) {
        this.accountRepository = accountRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
    }

    /**
     * Executes a comprehensive system-wide reconciliation:
     * 1. Global Zero-Sum Invariant: Sum(All Debits) == Sum(All Credits)
     * 2. Account Materialized vs. Historical Invariant:
     *    For every customer liability account, balance == Sum(Credits) - Sum(Debits)
     */
    @Transactional(readOnly = true)
    public ReconciliationSummaryDto performGlobalReconciliation() {
        log.info("Starting global ledger reconciliation audit...");

        BigDecimal totalDebits = ledgerEntryRepository.sumTotalAmountByDirection(EntryDirection.DEBIT);
        if (totalDebits == null) totalDebits = BigDecimal.ZERO.setScale(4);
        BigDecimal totalCredits = ledgerEntryRepository.sumTotalAmountByDirection(EntryDirection.CREDIT);
        if (totalCredits == null) totalCredits = BigDecimal.ZERO.setScale(4);

        boolean globalBalanced = totalDebits.compareTo(totalCredits) == 0;

        List<Account> customerAccounts = accountRepository.findAll().stream()
                .filter(a -> a.getAccountType() != AccountType.SYSTEM_CLEARING)
                .toList();

        List<DiscrepancyDetail> discrepancies = new ArrayList<>();

        for (Account acc : customerAccounts) {
            BigDecimal computedBalance = ledgerEntryRepository.calculateNetLiabilityBalanceForAccount(acc.getId());
            if (computedBalance == null) computedBalance = BigDecimal.ZERO.setScale(4);
            BigDecimal materializedBalance = acc.getBalance() != null ? acc.getBalance() : BigDecimal.ZERO.setScale(4);

            if (materializedBalance.compareTo(computedBalance) != 0) {
                BigDecimal diff = materializedBalance.subtract(computedBalance);
                discrepancies.add(DiscrepancyDetail.builder()
                        .accountId(acc.getId())
                        .accountNumber(acc.getAccountNumber())
                        .materializedBalance(materializedBalance)
                        .ledgerComputedBalance(computedBalance)
                        .difference(diff)
                        .build());
            }
        }

        boolean allBalanced = globalBalanced && discrepancies.isEmpty();

        ReconciliationSummaryDto summary = ReconciliationSummaryDto.builder()
                .status(allBalanced ? "BALANCED" : "DISCREPANCY_DETECTED")
                .globalZeroSumBalanced(globalBalanced)
                .totalGlobalDebits(totalDebits)
                .totalGlobalCredits(totalCredits)
                .totalAccountsChecked(customerAccounts.size())
                .discrepantAccountsCount(discrepancies.size())
                .discrepancies(discrepancies)
                .timestamp(LocalDateTime.now())
                .build();

        log.info("Global reconciliation completed. Status: {}, Discrepant Accounts: {}",
                summary.getStatus(), summary.getDiscrepantAccountsCount());

        return summary;
    }

    /**
     * Reconciles a single account against its double-entry ledger history.
     */
    @Transactional(readOnly = true)
    public AccountReconciliationDto reconcileAccount(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with ID: " + accountId));

        BigDecimal computedBalance = ledgerEntryRepository.calculateNetLiabilityBalanceForAccount(accountId);
        if (computedBalance == null) computedBalance = BigDecimal.ZERO.setScale(4);
        BigDecimal materializedBalance = account.getBalance() != null ? account.getBalance() : BigDecimal.ZERO.setScale(4);
        BigDecimal diff = materializedBalance.subtract(computedBalance);
        boolean isBalanced = diff.compareTo(BigDecimal.ZERO) == 0;

        return AccountReconciliationDto.builder()
                .accountId(account.getId())
                .accountNumber(account.getAccountNumber())
                .materializedBalance(materializedBalance)
                .ledgerComputedBalance(computedBalance)
                .difference(diff)
                .balanced(isBalanced)
                .currency(account.getCurrency())
                .reconciledAt(LocalDateTime.now())
                .build();
    }
}

