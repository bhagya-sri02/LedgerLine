package com.ledgerline.domain.account.service;

import com.ledgerline.common.exception.AccountNotFoundException;
import com.ledgerline.common.exception.BusinessException;
import com.ledgerline.domain.account.dto.*;
import com.ledgerline.domain.account.entity.Account;
import com.ledgerline.domain.account.entity.AccountStatus;
import com.ledgerline.domain.account.repository.AccountRepository;
import com.ledgerline.domain.audit.service.AuditService;
import com.ledgerline.domain.auth.entity.User;
import com.ledgerline.domain.auth.repository.UserRepository;
import com.ledgerline.domain.ledger.dto.DepositCommand;
import com.ledgerline.domain.ledger.entity.LedgerEntry;
import com.ledgerline.domain.ledger.repository.LedgerEntryRepository;
import com.ledgerline.domain.ledger.service.AccountTransactionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final AccountTransactionService accountTransactionService;
    private final AuditService auditService;
    private final SecureRandom random = new SecureRandom();

    public AccountService(
            AccountRepository accountRepository,
            UserRepository userRepository,
            LedgerEntryRepository ledgerEntryRepository,
            AccountTransactionService accountTransactionService,
            AuditService auditService
    ) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.accountTransactionService = accountTransactionService;
        this.auditService = auditService;
    }

    @Transactional
    public AccountResponse createAccount(CreateAccountRequest request, User actor) {
        User owner = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new BusinessException("User not found with ID: " + request.getUserId()));

        String accountNumber = generateUniqueAccountNumber();

        Account account = Account.builder()
                .accountNumber(accountNumber)
                .user(owner)
                .accountType(request.getAccountType())
                .currency(request.getCurrency().toUpperCase())
                .balance(BigDecimal.ZERO.setScale(4))
                .status(AccountStatus.ACTIVE)
                .build();

        Account saved = accountRepository.save(account);

        auditService.recordAudit(
                actor,
                "ACCOUNT_CREATE",
                "Account",
                saved.getId().toString(),
                java.util.Map.of("accountNumber", saved.getAccountNumber(), "currency", saved.getCurrency())
        );

        // Optional initial deposit
        if (request.getInitialDeposit() != null && request.getInitialDeposit().compareTo(BigDecimal.ZERO) > 0) {
            DepositCommand depositCmd = DepositCommand.builder()
                    .accountId(saved.getId())
                    .amount(request.getInitialDeposit())
                    .currency(saved.getCurrency())
                    .description("Initial Opening Deposit")
                    .build();
            accountTransactionService.executeDeposit(depositCmd, actor, "init-dep-" + UUID.randomUUID());
            saved = accountRepository.findById(saved.getId()).orElse(saved);
        }

        return mapToAccountResponse(saved);
    }

    @Transactional(readOnly = true)
    public AccountResponse getAccountById(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with ID: " + accountId));
        return mapToAccountResponse(account);
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> getAccountsByUserId(Long userId) {
        return accountRepository.findByUserId(userId).stream()
                .map(this::mapToAccountResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> getAllAccounts() {
        return accountRepository.findAll().stream()
                .map(this::mapToAccountResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public AccountResponse updateAccountStatus(Long accountId, AccountStatus newStatus, User actor) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with ID: " + accountId));

        AccountStatus oldStatus = account.getStatus();
        account.setStatus(newStatus);
        Account saved = accountRepository.save(account);

        auditService.recordAudit(
                actor,
                "ACCOUNT_STATUS_UPDATE",
                "Account",
                saved.getId().toString(),
                java.util.Map.of("oldStatus", oldStatus.name(), "newStatus", newStatus.name())
        );

        return mapToAccountResponse(saved);
    }

    @Transactional(readOnly = true)
    public StatementResponse getAccountStatement(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with ID: " + accountId));

        List<LedgerEntry> entries = ledgerEntryRepository.findByAccountIdOrderByCreatedAtAsc(accountId);

        List<LedgerEntryDto> entryDtos = entries.stream()
                .map(e -> LedgerEntryDto.builder()
                        .id(e.getId())
                        .direction(e.getEntryDirection())
                        .amount(e.getAmount())
                        .balanceAfter(e.getBalanceAfter())
                        .currency(e.getAccount() != null ? e.getAccount().getCurrency() : account.getCurrency())
                        .transactionReference(e.getTransaction() != null ? e.getTransaction().getTransactionReference() : null)
                        .transactionType(e.getTransaction() != null ? e.getTransaction().getTransactionType() : null)
                        .description(e.getTransaction() != null ? e.getTransaction().getDescription() : null)
                        .createdAt(e.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return StatementResponse.builder()
                .accountId(account.getId())
                .accountNumber(account.getAccountNumber())
                .currentBalance(account.getBalance())
                .currency(account.getCurrency())
                .accountType(account.getAccountType())
                .status(account.getStatus())
                .entries(entryDtos)
                .build();
    }

    private String generateUniqueAccountNumber() {
        String num;
        do {
            num = "ACC-" + (1000000000L + (long) (random.nextDouble() * 8999999999L));
        } while (accountRepository.findByAccountNumber(num).isPresent());
        return num;
    }

    public AccountResponse mapToAccountResponse(Account account) {
        return AccountResponse.builder()
                .id(account.getId())
                .accountNumber(account.getAccountNumber())
                .userId(account.getUser() != null ? account.getUser().getId() : null)
                .username(account.getUser() != null ? account.getUser().getUsername() : "SYSTEM")
                .accountType(account.getAccountType())
                .balance(account.getBalance())
                .currency(account.getCurrency())
                .status(account.getStatus())
                .createdAt(account.getCreatedAt())
                .build();
    }
}
