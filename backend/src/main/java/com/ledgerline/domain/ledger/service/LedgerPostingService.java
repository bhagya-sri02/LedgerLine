package com.ledgerline.domain.ledger.service;

import com.ledgerline.common.exception.InsufficientFundsException;
import com.ledgerline.common.exception.UnbalancedTransactionException;
import com.ledgerline.domain.account.entity.Account;
import com.ledgerline.domain.account.entity.AccountType;
import com.ledgerline.domain.account.repository.AccountRepository;
import com.ledgerline.domain.audit.service.AuditService;
import com.ledgerline.domain.auth.entity.User;
import com.ledgerline.domain.ledger.dto.LedgerEntryRecord;
import com.ledgerline.domain.ledger.dto.PostingEntry;
import com.ledgerline.domain.ledger.dto.TransactionReceipt;
import com.ledgerline.domain.ledger.entity.*;
import com.ledgerline.domain.ledger.repository.JournalTransactionRepository;
import com.ledgerline.domain.ledger.repository.LedgerEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Core Double-Entry Ledger Posting Service.
 * 
 * Enforces standard double-entry banking rules:
 * - Customer accounts are LIABILITIES (Credits increase balance, Debits decrease balance).
 * - System clearing accounts are ASSETS (Debits increase balance, Credits decrease balance).
 * - Every transaction must have at least 2 entries.
 * - Total Debits must equal Total Credits exactly.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LedgerPostingService {

    private final JournalTransactionRepository journalTransactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final AccountRepository accountRepository;
    private final AuditService auditService;

    private static final int FINANCIAL_SCALE = 4;
    private static final RoundingMode FINANCIAL_ROUNDING = RoundingMode.HALF_EVEN;

    @Transactional(propagation = Propagation.REQUIRED)
    public TransactionReceipt postTransaction(
            TransactionType type,
            String description,
            BigDecimal primaryAmount,
            String currency,
            List<PostingEntry> postingEntries,
            User actor
    ) {
        if (postingEntries == null || postingEntries.size() < 2) {
            throw new UnbalancedTransactionException("A financial transaction must contain at least two ledger entries.");
        }

        BigDecimal totalDebits = BigDecimal.ZERO.setScale(FINANCIAL_SCALE, FINANCIAL_ROUNDING);
        BigDecimal totalCredits = BigDecimal.ZERO.setScale(FINANCIAL_SCALE, FINANCIAL_ROUNDING);

        // 1. Create JournalTransaction in PENDING status
        String txRef = UUID.randomUUID().toString();
        JournalTransaction journalTx = JournalTransaction.builder()
                .transactionReference(txRef)
                .transactionType(type)
                .status(TransactionStatus.PENDING)
                .description(description)
                .build();
        journalTx = journalTransactionRepository.save(journalTx);

        List<LedgerEntryRecord> receiptEntries = new ArrayList<>();

        // 2. Process each entry and update materialized balances atomically
        for (PostingEntry posting : postingEntries) {
            Account account = posting.getAccount();
            EntryDirection direction = posting.getDirection();
            BigDecimal amount = posting.getAmount().setScale(FINANCIAL_SCALE, FINANCIAL_ROUNDING);

            if (direction == EntryDirection.DEBIT) {
                totalDebits = totalDebits.add(amount);
            } else {
                totalCredits = totalCredits.add(amount);
            }

            // Apply accounting equation to materialized balance:
            // Customer Liability accounts:
            //   - CREDIT increases balance (Bank liability increases)
            //   - DEBIT decreases balance (Bank liability decreases)
            // System Asset clearing accounts:
            //   - DEBIT increases balance (Bank cash asset increases)
            //   - CREDIT decreases balance (Bank cash asset decreases)
            BigDecimal currentBalance = account.getBalance().setScale(FINANCIAL_SCALE, FINANCIAL_ROUNDING);
            BigDecimal newBalance;

            if (account.getAccountType() == AccountType.SYSTEM_CLEARING) {
                // Asset account rules
                newBalance = (direction == EntryDirection.DEBIT)
                        ? currentBalance.add(amount)
                        : currentBalance.subtract(amount);
            } else {
                // Customer Liability account rules
                if (direction == EntryDirection.DEBIT) {
                    if (currentBalance.compareTo(amount) < 0) {
                        throw new InsufficientFundsException(
                                String.format("Insufficient funds in account %s. Current balance: %s, Requested debit: %s",
                                        account.getAccountNumber(), currentBalance, amount)
                        );
                    }
                    newBalance = currentBalance.subtract(amount);
                } else {
                    newBalance = currentBalance.add(amount);
                }
            }

            account.setBalance(newBalance.setScale(FINANCIAL_SCALE, FINANCIAL_ROUNDING));
            accountRepository.save(account);

            // Persist immutable LedgerEntry
            LedgerEntry ledgerEntry = LedgerEntry.builder()
                    .transaction(journalTx)
                    .account(account)
                    .entryDirection(direction)
                    .amount(amount)
                    .balanceAfter(newBalance)
                    .build();
            ledgerEntry = ledgerEntryRepository.save(ledgerEntry);

            receiptEntries.add(LedgerEntryRecord.builder()
                    .entryId(ledgerEntry.getId())
                    .accountId(account.getId())
                    .accountNumber(account.getAccountNumber())
                    .direction(direction)
                    .amount(amount)
                    .balanceAfter(newBalance)
                    .build());
        }

        // 3. Mathematical Double-Entry Balancing Invariant Verification
        if (totalDebits.compareTo(totalCredits) != 0) {
            throw new UnbalancedTransactionException(
                    String.format("Unbalanced transaction! Total Debits (%s) must equal Total Credits (%s)",
                            totalDebits, totalCredits)
            );
        }

        // 4. Transition transaction to POSTED
        journalTx.setStatus(TransactionStatus.POSTED);
        journalTx = journalTransactionRepository.save(journalTx);

        // 5. Emit atomic Audit Log
        Map<String, Object> auditMetadata = new HashMap<>();
        auditMetadata.put("transactionReference", txRef);
        auditMetadata.put("transactionType", type.name());
        auditMetadata.put("amount", primaryAmount.toPlainString());
        auditMetadata.put("currency", currency);
        auditMetadata.put("entriesCount", receiptEntries.size());
        auditService.recordAudit(actor, "TRANSACTION_POSTED", "JOURNAL_TRANSACTION", txRef, auditMetadata);

        return TransactionReceipt.builder()
                .transactionReference(txRef)
                .transactionType(type)
                .status(TransactionStatus.POSTED)
                .amount(primaryAmount)
                .currency(currency)
                .description(description)
                .postedAt(journalTx.getPostedAt())
                .entries(receiptEntries)
                .build();
    }
}

