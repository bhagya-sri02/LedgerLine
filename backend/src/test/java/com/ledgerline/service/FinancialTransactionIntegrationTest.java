package com.ledgerline.service;

import com.ledgerline.common.exception.InsufficientFundsException;
import com.ledgerline.common.exception.PayloadMismatchException;
import com.ledgerline.common.exception.UnbalancedTransactionException;
import com.ledgerline.domain.account.entity.Account;
import com.ledgerline.domain.account.entity.AccountStatus;
import com.ledgerline.domain.account.entity.AccountType;
import com.ledgerline.domain.account.repository.AccountRepository;
import com.ledgerline.domain.audit.entity.AuditLog;
import com.ledgerline.domain.audit.repository.AuditLogRepository;
import com.ledgerline.domain.auth.entity.Role;
import com.ledgerline.domain.auth.entity.RoleName;
import com.ledgerline.domain.auth.entity.User;
import com.ledgerline.domain.auth.entity.UserStatus;
import com.ledgerline.domain.auth.repository.RoleRepository;
import com.ledgerline.domain.auth.repository.UserRepository;
import com.ledgerline.domain.ledger.dto.*;
import com.ledgerline.domain.ledger.entity.EntryDirection;
import com.ledgerline.domain.ledger.entity.LedgerEntry;
import com.ledgerline.domain.ledger.entity.TransactionStatus;
import com.ledgerline.domain.ledger.entity.TransactionType;
import com.ledgerline.domain.ledger.repository.JournalTransactionRepository;
import com.ledgerline.domain.ledger.repository.LedgerEntryRepository;
import com.ledgerline.domain.ledger.service.AccountTransactionService;
import com.ledgerline.domain.ledger.service.LedgerPostingService;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@Slf4j
@SpringBootTest
@ActiveProfiles("test")
public class FinancialTransactionIntegrationTest {

    @Autowired
    private AccountTransactionService accountTransactionService;

    @Autowired
    private LedgerPostingService ledgerPostingService;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private JournalTransactionRepository journalTransactionRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    private User testUser;
    private static final int SCALE = 4;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_EVEN;

    @BeforeEach
    void setUp() {
        Role role = roleRepository.findByName(RoleName.ROLE_ACCOUNT_HOLDER).orElseGet(() ->
                roleRepository.save(Role.builder().name(RoleName.ROLE_ACCOUNT_HOLDER).build())
        );

        testUser = userRepository.findByUsername("test_trader").orElseGet(() -> {
            Set<Role> roles = new HashSet<>();
            roles.add(role);
            return userRepository.save(User.builder()
                    .username("test_trader")
                    .email("trader@test.com")
                    .passwordHash("hashed_pwd")
                    .status(UserStatus.ACTIVE)
                    .roles(roles)
                    .build());
        });
    }

    private Account createAccount(String prefix, BigDecimal initialBalance, String currency) {
        String uniqueAccNo = prefix + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        return accountRepository.save(Account.builder()
                .accountNumber(uniqueAccNo)
                .user(testUser)
                .accountType(AccountType.SAVINGS)
                .balance(initialBalance.setScale(SCALE, ROUNDING))
                .currency(currency)
                .status(AccountStatus.ACTIVE)
                .build());
    }

    // 1. Successful Deposit
    @Test
    @DisplayName("1. Successful cash deposit updates balance and writes balanced ledger entries")
    void testSuccessfulDeposit() {
        Account acc = createAccount("ACC-DEP", new BigDecimal("100.00"), "USD");
        String key = "dep-" + UUID.randomUUID();

        DepositCommand cmd = DepositCommand.builder()
                .accountId(acc.getId())
                .amount(new BigDecimal("50.00"))
                .currency("USD")
                .description("ATM deposit")
                .build();

        TransactionReceipt receipt = accountTransactionService.executeDeposit(cmd, testUser, key);

        assertNotNull(receipt);
        assertEquals(TransactionStatus.POSTED, receipt.getStatus());
        assertEquals(2, receipt.getEntries().size());

        Account updated = accountRepository.findById(acc.getId()).orElseThrow();
        assertEquals(new BigDecimal("150.0000"), updated.getBalance());

        // Verify entries in database
        List<LedgerEntry> entries = ledgerEntryRepository.findByTransactionId(
                journalTransactionRepository.findByTransactionReference(receipt.getTransactionReference()).orElseThrow().getId()
        );
        assertEquals(2, entries.size());

        BigDecimal debitSum = entries.stream().filter(e -> e.getEntryDirection() == EntryDirection.DEBIT)
                .map(LedgerEntry::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal creditSum = entries.stream().filter(e -> e.getEntryDirection() == EntryDirection.CREDIT)
                .map(LedgerEntry::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(new BigDecimal("50.0000"), debitSum);
        assertEquals(new BigDecimal("50.0000"), creditSum);
    }

    // 2. Successful Withdrawal
    @Test
    @DisplayName("2. Successful cash withdrawal updates balance and debits customer liability")
    void testSuccessfulWithdrawal() {
        Account acc = createAccount("ACC-WTH", new BigDecimal("200.00"), "USD");
        String key = "wth-" + UUID.randomUUID();

        WithdrawalCommand cmd = WithdrawalCommand.builder()
                .accountId(acc.getId())
                .amount(new BigDecimal("75.00"))
                .currency("USD")
                .description("Branch cash withdrawal")
                .build();

        TransactionReceipt receipt = accountTransactionService.executeWithdrawal(cmd, testUser, key);

        assertEquals(TransactionStatus.POSTED, receipt.getStatus());

        Account updated = accountRepository.findById(acc.getId()).orElseThrow();
        assertEquals(new BigDecimal("125.0000"), updated.getBalance());
    }

    // 3. Insufficient Balance Rejection
    @Test
    @DisplayName("3. Insufficient balance withdrawal is rejected without balance changes")
    void testInsufficientBalanceRejection() {
        Account acc = createAccount("ACC-OVERDRAFT", new BigDecimal("50.00"), "USD");
        String key = "overdraft-" + UUID.randomUUID();

        WithdrawalCommand cmd = WithdrawalCommand.builder()
                .accountId(acc.getId())
                .amount(new BigDecimal("100.00"))
                .currency("USD")
                .description("Attempted overdraft")
                .build();

        assertThrows(InsufficientFundsException.class, () ->
                accountTransactionService.executeWithdrawal(cmd, testUser, key)
        );

        Account untouched = accountRepository.findById(acc.getId()).orElseThrow();
        assertEquals(new BigDecimal("50.0000"), untouched.getBalance());
    }

    // 4. Successful Transfer
    @Test
    @DisplayName("4. Inter-account transfer atomically moves funds between accounts")
    void testSuccessfulTransfer() {
        Account fromAcc = createAccount("ACC-TRF-A", new BigDecimal("300.00"), "USD");
        Account toAcc = createAccount("ACC-TRF-B", new BigDecimal("100.00"), "USD");
        String key = "trf-" + UUID.randomUUID();

        TransferCommand cmd = TransferCommand.builder()
                .fromAccountId(fromAcc.getId())
                .toAccountId(toAcc.getId())
                .amount(new BigDecimal("120.00"))
                .currency("USD")
                .description("Invoice payment")
                .build();

        TransactionReceipt receipt = accountTransactionService.executeTransfer(cmd, testUser, key);

        assertEquals(TransactionStatus.POSTED, receipt.getStatus());

        Account updatedFrom = accountRepository.findById(fromAcc.getId()).orElseThrow();
        Account updatedTo = accountRepository.findById(toAcc.getId()).orElseThrow();

        assertEquals(new BigDecimal("180.0000"), updatedFrom.getBalance());
        assertEquals(new BigDecimal("220.0000"), updatedTo.getBalance());
    }

    // 5. Unbalanced Ledger Posting Rejection
    @Test
    @DisplayName("5. Unbalanced ledger posting is strictly rejected by posting service")
    void testUnbalancedLedgerPostingRejection() {
        Account acc1 = createAccount("ACC-UNBAL-1", new BigDecimal("500.00"), "USD");
        Account acc2 = createAccount("ACC-UNBAL-2", new BigDecimal("500.00"), "USD");

        // Create unbalanced entries: DR 100 vs CR 50
        List<PostingEntry> unbalancedEntries = List.of(
                PostingEntry.builder().account(acc1).direction(EntryDirection.DEBIT).amount(new BigDecimal("100.0000")).build(),
                PostingEntry.builder().account(acc2).direction(EntryDirection.CREDIT).amount(new BigDecimal("50.0000")).build()
        );

        assertThrows(UnbalancedTransactionException.class, () ->
                ledgerPostingService.postTransaction(
                        TransactionType.TRANSFER, "Unbalanced test",
                        new BigDecimal("100.00"), "USD", unbalancedEntries, testUser
                )
        );

        // Verify balances were not changed
        assertEquals(new BigDecimal("500.0000"), accountRepository.findById(acc1.getId()).orElseThrow().getBalance());
        assertEquals(new BigDecimal("500.0000"), accountRepository.findById(acc2.getId()).orElseThrow().getBalance());
    }

    // 6. Duplicate Idempotency Request
    @Test
    @DisplayName("6. Duplicate idempotency request returns identical original receipt without duplicate balance mutations")
    void testDuplicateIdempotencyRequest() {
        Account acc = createAccount("ACC-IDEM-DUP", new BigDecimal("200.00"), "USD");
        String idempotencyKey = "dup-key-" + UUID.randomUUID();

        DepositCommand cmd = DepositCommand.builder()
                .accountId(acc.getId())
                .amount(new BigDecimal("50.00"))
                .currency("USD")
                .description("Idempotent deposit")
                .build();

        // First call
        TransactionReceipt firstReceipt = accountTransactionService.executeDeposit(cmd, testUser, idempotencyKey);
        assertNotNull(firstReceipt);

        // Immediate duplicate call with same key and payload
        TransactionReceipt duplicateReceipt = accountTransactionService.executeDeposit(cmd, testUser, idempotencyKey);

        assertEquals(firstReceipt.getTransactionReference(), duplicateReceipt.getTransactionReference());
        assertEquals(firstReceipt.getAmount(), duplicateReceipt.getAmount());

        // Assert balance was incremented exactly ONCE ($200 + $50 = $250)
        Account updated = accountRepository.findById(acc.getId()).orElseThrow();
        assertEquals(new BigDecimal("250.0000"), updated.getBalance());
    }

    // 7. Same Idempotency Key with Different Payload Rejection
    @Test
    @DisplayName("7. Re-using same idempotency key with altered payload is rejected")
    void testSameIdempotencyKeyDifferentPayloadRejection() {
        Account acc = createAccount("ACC-IDEM-DIFF", new BigDecimal("200.00"), "USD");
        String idempotencyKey = "diff-payload-" + UUID.randomUUID();

        DepositCommand cmd1 = DepositCommand.builder()
                .accountId(acc.getId())
                .amount(new BigDecimal("50.00"))
                .currency("USD")
                .description("Initial payload")
                .build();

        accountTransactionService.executeDeposit(cmd1, testUser, idempotencyKey);

        // Altered payload with amount 100 instead of 50
        DepositCommand cmd2 = DepositCommand.builder()
                .accountId(acc.getId())
                .amount(new BigDecimal("100.00"))
                .currency("USD")
                .description("Altered payload")
                .build();

        assertThrows(PayloadMismatchException.class, () ->
                accountTransactionService.executeDeposit(cmd2, testUser, idempotencyKey)
        );

        // Verify balance reflects only first deposit ($250.00)
        assertEquals(new BigDecimal("250.0000"), accountRepository.findById(acc.getId()).orElseThrow().getBalance());
    }

    // 8. Concurrent Withdrawals Against One Account
    @Test
    @DisplayName("8. Concurrent withdrawals against single account enforce exact non-negative balance")
    void testConcurrentWithdrawalsAgainstOneAccount() throws InterruptedException {
        // Initial balance $100.00. 10 threads attempt to withdraw $20.00 each.
        // Exactly 5 should succeed ($100), exactly 5 must fail with InsufficientFundsException.
        Account acc = createAccount("ACC-CONC-WTH", new BigDecimal("100.00"), "USD");
        int threadCount = 10;
        BigDecimal withdrawAmount = new BigDecimal("20.00");

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final String key = "conc-wth-" + i + "-" + UUID.randomUUID();
            executor.submit(() -> {
                try {
                    startLatch.await();
                    WithdrawalCommand cmd = WithdrawalCommand.builder()
                            .accountId(acc.getId())
                            .amount(withdrawAmount)
                            .currency("USD")
                            .description("Concurrent withdrawal")
                            .build();
                    accountTransactionService.executeWithdrawal(cmd, testUser, key);
                    successCount.incrementAndGet();
                } catch (InsufficientFundsException ex) {
                    failCount.incrementAndGet();
                } catch (Exception ex) {
                    log.error("Unexpected error in concurrent withdrawal: {}", ex.getMessage(), ex);
                } finally {
                    endLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(endLatch.await(30, TimeUnit.SECONDS), "Concurrent test timed out");
        executor.shutdown();

        assertEquals(5, successCount.get(), "Exactly 5 withdrawals should succeed");
        assertEquals(5, failCount.get(), "Exactly 5 withdrawals should fail with InsufficientFundsException");

        Account finalAcc = accountRepository.findById(acc.getId()).orElseThrow();
        assertEquals(new BigDecimal("0.0000"), finalAcc.getBalance(), "Final balance must be exactly zero");
    }

    // 9. Concurrent Transfers in Opposite Directions (Deadlock Freedom)
    @Test
    @DisplayName("9. Concurrent bidirectional transfers between two accounts execute without deadlocks")
    void testConcurrentTransfersInOppositeDirectionsDeadlockFreedom() throws InterruptedException {
        // Acc1 has $1,000, Acc2 has $1,000.
        // 10 threads transfer Acc1 -> Acc2 ($10 each)
        // 10 threads transfer Acc2 -> Acc1 ($10 each)
        Account acc1 = createAccount("ACC-DEADLOCK-1", new BigDecimal("1000.00"), "USD");
        Account acc2 = createAccount("ACC-DEADLOCK-2", new BigDecimal("1000.00"), "USD");

        int threadCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger errorCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final boolean forward = (i % 2 == 0);
            final String key = "deadlock-test-" + i + "-" + UUID.randomUUID();

            executor.submit(() -> {
                try {
                    startLatch.await();
                    TransferCommand cmd = TransferCommand.builder()
                            .fromAccountId(forward ? acc1.getId() : acc2.getId())
                            .toAccountId(forward ? acc2.getId() : acc1.getId())
                            .amount(new BigDecimal("10.00"))
                            .currency("USD")
                            .description("Bidirectional transfer")
                            .build();
                    accountTransactionService.executeTransfer(cmd, testUser, key);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    log.error("Unexpected error in bidirectional transfer: {}", e.getMessage(), e);
                    errorCount.incrementAndGet();
                } finally {
                    endLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(endLatch.await(30, TimeUnit.SECONDS), "Bidirectional transfer timed out");
        executor.shutdown();

        assertEquals(20, successCount.get(), "All 20 transfers must succeed without deadlock");
        assertEquals(0, errorCount.get(), "Zero deadlock or concurrency errors should occur");

        Account finalAcc1 = accountRepository.findById(acc1.getId()).orElseThrow();
        Account finalAcc2 = accountRepository.findById(acc2.getId()).orElseThrow();

        // Net change across both accounts must balance out to original amounts
        assertEquals(new BigDecimal("1000.0000"), finalAcc1.getBalance());
        assertEquals(new BigDecimal("1000.0000"), finalAcc2.getBalance());
    }

    // 10. Rollback When Financial Operation Fails
    @Test
    @DisplayName("10. Failed financial operation leaves zero partial database changes")
    void testRollbackWhenFinancialOperationFails() {
        Account fromAcc = createAccount("ACC-ROLLBACK-1", new BigDecimal("100.00"), "USD");
        Account toAcc = createAccount("ACC-ROLLBACK-2", new BigDecimal("50.00"), "EUR"); // Mismatched currency!
        String key = "rollback-" + UUID.randomUUID();

        TransferCommand cmd = TransferCommand.builder()
                .fromAccountId(fromAcc.getId())
                .toAccountId(toAcc.getId())
                .amount(new BigDecimal("20.00"))
                .currency("USD")
                .description("Failed currency transfer")
                .build();

        long initialLedgerCount = ledgerEntryRepository.count();

        assertThrows(Exception.class, () ->
                accountTransactionService.executeTransfer(cmd, testUser, key)
        );

        // Verify balances untouched
        assertEquals(new BigDecimal("100.0000"), accountRepository.findById(fromAcc.getId()).orElseThrow().getBalance());
        assertEquals(new BigDecimal("50.0000"), accountRepository.findById(toAcc.getId()).orElseThrow().getBalance());

        // Zero ledger entries added
        assertEquals(initialLedgerCount, ledgerEntryRepository.count());
    }

    // 11. Account Balance Consistency With Ledger Entries (Reconciliation)
    @Test
    @DisplayName("11. Materialized balance exactly matches computed ledger entry history")
    void testAccountBalanceConsistencyWithLedgerEntries() {
        Account acc = createAccount("ACC-RECONCILE", new BigDecimal("0.00"), "USD");

        // Sequence of operations
        accountTransactionService.executeDeposit(
                DepositCommand.builder().accountId(acc.getId()).amount(new BigDecimal("150.00")).currency("USD").build(),
                testUser, "rec-dep-1-" + UUID.randomUUID()
        );
        accountTransactionService.executeWithdrawal(
                WithdrawalCommand.builder().accountId(acc.getId()).amount(new BigDecimal("40.00")).currency("USD").build(),
                testUser, "rec-wth-1-" + UUID.randomUUID()
        );
        accountTransactionService.executeDeposit(
                DepositCommand.builder().accountId(acc.getId()).amount(new BigDecimal("25.50")).currency("USD").build(),
                testUser, "rec-dep-2-" + UUID.randomUUID()
        );

        Account current = accountRepository.findById(acc.getId()).orElseThrow();
        BigDecimal expectedBalance = new BigDecimal("135.5000"); // 150 - 40 + 25.50
        assertEquals(expectedBalance, current.getBalance());

        // Compute net liability from ledger entries: Sum(Credits) - Sum(Debits)
        BigDecimal computedLedgerSum = ledgerEntryRepository.calculateNetLiabilityBalanceForAccount(acc.getId());
        assertEquals(current.getBalance(), computedLedgerSum, "Materialized balance must exactly match historical ledger calculation");

        // Verify global zero-sum invariant: Sum(All Debits) == Sum(All Credits)
        BigDecimal globalDebits = ledgerEntryRepository.sumTotalAmountByDirection(EntryDirection.DEBIT);
        BigDecimal globalCredits = ledgerEntryRepository.sumTotalAmountByDirection(EntryDirection.CREDIT);
        assertEquals(globalDebits, globalCredits, "Global ledger debits must exactly equal global credits");
    }

    // 12. Audit Record Creation
    @Test
    @DisplayName("12. Financial operations create atomic, non-sensitive audit logs")
    void testAuditRecordCreation() {
        Account acc = createAccount("ACC-AUDIT", new BigDecimal("500.00"), "USD");
        String key = "audit-check-" + UUID.randomUUID();

        TransactionReceipt receipt = accountTransactionService.executeDeposit(
                DepositCommand.builder().accountId(acc.getId()).amount(new BigDecimal("100.00")).currency("USD").description("Audit check").build(),
                testUser, key
        );

        List<AuditLog> auditLogs = auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(
                "JOURNAL_TRANSACTION", receipt.getTransactionReference(), org.springframework.data.domain.Pageable.unpaged()
        ).getContent();

        assertFalse(auditLogs.isEmpty(), "Audit log must be created for posted transaction");
        AuditLog logEntry = auditLogs.get(0);
        assertEquals("TRANSACTION_POSTED", logEntry.getAction());
        assertEquals(testUser.getId(), logEntry.getActor().getId());
        assertNotNull(logEntry.getMetadata());
        assertFalse(logEntry.getMetadata().contains("password"), "Audit logs must never contain sensitive credentials");
    }
}
