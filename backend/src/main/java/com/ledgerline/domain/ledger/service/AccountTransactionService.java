package com.ledgerline.domain.ledger.service;

import com.ledgerline.common.exception.*;
import com.ledgerline.domain.account.entity.Account;
import com.ledgerline.domain.account.entity.AccountStatus;
import com.ledgerline.domain.account.entity.AccountType;
import com.ledgerline.domain.account.repository.AccountRepository;
import com.ledgerline.domain.auth.entity.RoleName;
import com.ledgerline.domain.auth.entity.User;
import com.ledgerline.domain.ledger.dto.*;
import com.ledgerline.domain.ledger.entity.EntryDirection;
import com.ledgerline.domain.ledger.entity.TransactionType;
import com.ledgerline.infrastructure.idempotency.service.IdempotencyService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.DeadlockLoserDataAccessException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * High-concurrency financial service managing Deposits, Withdrawals, and Transfers.
 * 
 * Locking & Concurrency Invariant:
 * Every transaction involving two accounts acquires PESSIMISTIC_WRITE locks
 * in strictly ascending Primary Key (ID) order (Math.min(id1, id2) then Math.max(id1, id2)).
 * This breaks the circular wait condition (Coffman condition #4) and prevents deadlocks.
 *
 * Retry Semantics:
 * Wrapped with Spring Retry to recover from transient lock wait timeouts or deadlocks.
 * Because @EnableRetry is configured at order 1 (higher precedence than @Transactional),
 * each retry attempt executes within a completely fresh database transaction.
 */
@Slf4j
@Service
public class AccountTransactionService {

    private final AccountRepository accountRepository;
    private final LedgerPostingService ledgerPostingService;
    private final IdempotencyService idempotencyService;

    @Autowired
    @Lazy
    private AccountTransactionService self;

    private static final int FINANCIAL_SCALE = 4;
    private static final RoundingMode FINANCIAL_ROUNDING = RoundingMode.HALF_EVEN;

    public AccountTransactionService(
            AccountRepository accountRepository,
            LedgerPostingService ledgerPostingService,
            IdempotencyService idempotencyService
    ) {
        this.accountRepository = accountRepository;
        this.ledgerPostingService = ledgerPostingService;
        this.idempotencyService = idempotencyService;
    }

    // =========================================================================
    // Idempotent Public API Facade
    // =========================================================================

    public TransactionReceipt executeDeposit(DepositCommand cmd, User actor, String idempotencyKey) {
        return idempotencyService.executeIdempotent(
                idempotencyKey,
                actor,
                cmd,
                () -> (self != null ? self : this).deposit(cmd, actor)
        );
    }

    public TransactionReceipt executeWithdrawal(WithdrawalCommand cmd, User actor, String idempotencyKey) {
        return idempotencyService.executeIdempotent(
                idempotencyKey,
                actor,
                cmd,
                () -> (self != null ? self : this).withdraw(cmd, actor)
        );
    }

    public TransactionReceipt executeTransfer(TransferCommand cmd, User actor, String idempotencyKey) {
        return idempotencyService.executeIdempotent(
                idempotencyKey,
                actor,
                cmd,
                () -> (self != null ? self : this).transfer(cmd, actor)
        );
    }

    // =========================================================================
    // Atomic Transactional & Retryable Operations
    // =========================================================================

    /**
     * Executes a Cash Deposit within a single database transaction.
     * 
     * Accounting perspective:
     * - Debits System Clearing Asset Account (Bank Cash Vault +)
     * - Credits Customer Liability Account (Customer Balance +)
     */
    @Retryable(
        retryFor = {
            ConcurrencyFailureException.class,
            PessimisticLockingFailureException.class,
            CannotAcquireLockException.class,
            DeadlockLoserDataAccessException.class
        },
        noRetryFor = { BusinessException.class, IllegalArgumentException.class },
        maxAttempts = 5,
        backoff = @Backoff(delay = 100, multiplier = 2.0, maxDelay = 1000)
    )
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public TransactionReceipt deposit(DepositCommand cmd, User actor) {
        validateActorNotAuditor(actor);
        validateMonetaryAmount(cmd.getAmount());
        String currency = normalizeCurrency(cmd.getCurrency());

        // Resolve system clearing account ID without loading entity before locking
        Long systemAccountId = getSystemClearingAccountId(currency);
        Long customerAccountId = cmd.getAccountId();

        // Acquire deterministic ascending locks: min(id), then max(id)
        LockedPair lockedPair = lockPairInAscendingOrder(customerAccountId, systemAccountId);
        Account customerAccount = lockedPair.getAccountById(customerAccountId);
        Account systemAccount = lockedPair.getAccountById(systemAccountId);

        validateAccountActive(customerAccount);
        validateCurrencyMatch(customerAccount, currency);

        BigDecimal amount = cmd.getAmount().setScale(FINANCIAL_SCALE, FINANCIAL_ROUNDING);

        // Double-entry legs: DR System Clearing (Asset +), CR Customer (Liability +)
        List<PostingEntry> legs = List.of(
            PostingEntry.builder().account(systemAccount).direction(EntryDirection.DEBIT).amount(amount).build(),
            PostingEntry.builder().account(customerAccount).direction(EntryDirection.CREDIT).amount(amount).build()
        );

        String desc = cmd.getDescription() != null ? cmd.getDescription() : "Cash Deposit";
        return ledgerPostingService.postTransaction(
            TransactionType.DEPOSIT, desc, amount, currency, legs, actor
        );
    }

    /**
     * Executes a Cash Withdrawal within a single database transaction.
     * 
     * Accounting perspective:
     * - Debits Customer Liability Account (Customer Balance -)
     * - Credits System Clearing Asset Account (Bank Cash Vault -)
     */
    @Retryable(
        retryFor = {
            ConcurrencyFailureException.class,
            PessimisticLockingFailureException.class,
            CannotAcquireLockException.class,
            DeadlockLoserDataAccessException.class
        },
        noRetryFor = { BusinessException.class, IllegalArgumentException.class },
        maxAttempts = 5,
        backoff = @Backoff(delay = 100, multiplier = 2.0, maxDelay = 1000)
    )
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public TransactionReceipt withdraw(WithdrawalCommand cmd, User actor) {
        validateActorNotAuditor(actor);
        validateMonetaryAmount(cmd.getAmount());
        String currency = normalizeCurrency(cmd.getCurrency());

        // Resolve system clearing account ID without loading entity before locking
        Long systemAccountId = getSystemClearingAccountId(currency);
        Long customerAccountId = cmd.getAccountId();

        // Acquire deterministic ascending locks
        LockedPair lockedPair = lockPairInAscendingOrder(customerAccountId, systemAccountId);
        Account customerAccount = lockedPair.getAccountById(customerAccountId);
        Account systemAccount = lockedPair.getAccountById(systemAccountId);

        validateAccountActive(customerAccount);
        validateCurrencyMatch(customerAccount, currency);

        BigDecimal amount = cmd.getAmount().setScale(FINANCIAL_SCALE, FINANCIAL_ROUNDING);

        // Pre-validate balance sufficiency (additional layer before ledger posting)
        if (customerAccount.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException(
                String.format("Insufficient funds in account %s. Balance: %s, Requested: %s",
                    customerAccount.getAccountNumber(), customerAccount.getBalance(), amount)
            );
        }

        // Double-entry legs: DR Customer (Liability -), CR System Clearing (Asset -)
        List<PostingEntry> legs = List.of(
            PostingEntry.builder().account(customerAccount).direction(EntryDirection.DEBIT).amount(amount).build(),
            PostingEntry.builder().account(systemAccount).direction(EntryDirection.CREDIT).amount(amount).build()
        );

        String desc = cmd.getDescription() != null ? cmd.getDescription() : "Cash Withdrawal";
        return ledgerPostingService.postTransaction(
            TransactionType.WITHDRAWAL, desc, amount, currency, legs, actor
        );
    }

    /**
     * Executes an Inter-Account Transfer within a single database transaction.
     * 
     * Accounting perspective:
     * - Debits Sender Liability Account (Sender Balance -)
     * - Credits Receiver Liability Account (Receiver Balance +)
     */
    @Retryable(
        retryFor = {
            ConcurrencyFailureException.class,
            PessimisticLockingFailureException.class,
            CannotAcquireLockException.class,
            DeadlockLoserDataAccessException.class
        },
        noRetryFor = { BusinessException.class, IllegalArgumentException.class },
        maxAttempts = 5,
        backoff = @Backoff(delay = 100, multiplier = 2.0, maxDelay = 1000)
    )
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public TransactionReceipt transfer(TransferCommand cmd, User actor) {
        validateActorNotAuditor(actor);
        if (cmd.getFromAccountId().equals(cmd.getToAccountId())) {
            throw new BusinessException("Cannot transfer funds to the same account.");
        }

        validateMonetaryAmount(cmd.getAmount());
        String currency = normalizeCurrency(cmd.getCurrency());

        // Acquire deterministic ascending locks on fromAccount and toAccount
        LockedPair lockedPair = lockPairInAscendingOrder(cmd.getFromAccountId(), cmd.getToAccountId());
        Account fromAccount = lockedPair.getAccountById(cmd.getFromAccountId());
        Account toAccount = lockedPair.getAccountById(cmd.getToAccountId());

        validateAccountActive(fromAccount);
        validateAccountActive(toAccount);

        validateCurrencyMatch(fromAccount, currency);
        validateCurrencyMatch(toAccount, currency);

        BigDecimal amount = cmd.getAmount().setScale(FINANCIAL_SCALE, FINANCIAL_ROUNDING);

        if (fromAccount.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException(
                String.format("Insufficient funds in account %s. Balance: %s, Transfer amount: %s",
                    fromAccount.getAccountNumber(), fromAccount.getBalance(), amount)
            );
        }

        // Double-entry legs: DR FromAccount (Liability -), CR ToAccount (Liability +)
        List<PostingEntry> legs = List.of(
            PostingEntry.builder().account(fromAccount).direction(EntryDirection.DEBIT).amount(amount).build(),
            PostingEntry.builder().account(toAccount).direction(EntryDirection.CREDIT).amount(amount).build()
        );

        String desc = cmd.getDescription() != null ? cmd.getDescription() : "Account Transfer";
        return ledgerPostingService.postTransaction(
            TransactionType.TRANSFER, desc, amount, currency, legs, actor
        );
    }

    // =========================================================================
    // Deterministic Lock Ordering & Validation Helpers
    // =========================================================================

    private LockedPair lockPairInAscendingOrder(Long id1, Long id2) {
        Long firstId = Math.min(id1, id2);
        Long secondId = Math.max(id1, id2);

        // Always lock firstId then secondId
        Account firstLocked = accountRepository.findByIdForUpdate(firstId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with ID: " + firstId));

        Account secondLocked = accountRepository.findByIdForUpdate(secondId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with ID: " + secondId));

        return new LockedPair(firstLocked, secondLocked);
    }

    private Long getSystemClearingAccountId(String currency) {
        String clearingAccountNumber = "SYS-CASH-SETTLEMENT-" + currency;
        return accountRepository.findIdByAccountNumber(clearingAccountNumber)
                .orElseThrow(() -> new AccountNotFoundException(
                        "System clearing account not configured for currency: " + currency)
                );
    }

    private void validateActorNotAuditor(User actor) {
        if (actor != null && actor.getRoles() != null) {
            boolean isAuditor = actor.getRoles().stream()
                    .anyMatch(r -> r.getName() == RoleName.ROLE_AUDITOR);
            boolean isAdmin = actor.getRoles().stream()
                    .anyMatch(r -> r.getName() == RoleName.ROLE_ADMIN);
            if (isAuditor && !isAdmin) {
                throw new BusinessException("Auditor role is strictly read-only and cannot perform financial mutations.");
            }
        }
    }

    private void validateMonetaryAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidAmountException("Transaction amount must be strictly positive and greater than zero.");
        }
    }

    private String normalizeCurrency(String currency) {
        if (currency == null || currency.trim().isEmpty()) {
            throw new InvalidAmountException("Currency code must be specified.");
        }
        return currency.trim().toUpperCase();
    }

    private void validateAccountActive(Account account) {
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new AccountFrozenException(
                String.format("Account %s is not active. Current status: %s",
                    account.getAccountNumber(), account.getStatus())
            );
        }
    }

    private void validateCurrencyMatch(Account account, String expectedCurrency) {
        if (!account.getCurrency().equalsIgnoreCase(expectedCurrency)) {
            throw new CurrencyMismatchException(
                String.format("Currency mismatch on account %s. Expected: %s, Account currency: %s",
                    account.getAccountNumber(), expectedCurrency, account.getCurrency())
            );
        }
    }

    private static class LockedPair {
        private final Account first;
        private final Account second;

        public LockedPair(Account first, Account second) {
            this.first = first;
            this.second = second;
        }

        public Account getAccountById(Long id) {
            if (first.getId().equals(id)) return first;
            if (second.getId().equals(id)) return second;
            throw new AccountNotFoundException("Account ID " + id + " not in locked pair");
        }
    }
}
