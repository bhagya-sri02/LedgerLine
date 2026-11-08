package com.ledgerline.api.controller;

import com.ledgerline.domain.account.service.AccountOwnershipService;
import com.ledgerline.domain.auth.entity.User;
import com.ledgerline.domain.auth.repository.UserRepository;
import com.ledgerline.domain.ledger.dto.DepositCommand;
import com.ledgerline.domain.ledger.dto.TransactionReceipt;
import com.ledgerline.domain.ledger.dto.TransferCommand;
import com.ledgerline.domain.ledger.dto.WithdrawalCommand;
import com.ledgerline.domain.ledger.service.AccountTransactionService;
import com.ledgerline.domain.transaction.dto.DepositRequest;
import com.ledgerline.domain.transaction.dto.TransferRequest;
import com.ledgerline.domain.transaction.dto.WithdrawalRequest;
import com.ledgerline.infrastructure.security.userdetails.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/transactions")
@PreAuthorize("hasAnyRole('ACCOUNT_HOLDER', 'ADMIN')")
public class TransactionController {

    private final AccountTransactionService transactionService;
    private final AccountOwnershipService accountOwnershipService;
    private final UserRepository userRepository;

    public TransactionController(
            AccountTransactionService transactionService,
            AccountOwnershipService accountOwnershipService,
            UserRepository userRepository
    ) {
        this.transactionService = transactionService;
        this.accountOwnershipService = accountOwnershipService;
        this.userRepository = userRepository;
    }

    @PostMapping("/deposit")
    public ResponseEntity<TransactionReceipt> deposit(
            @Valid @RequestBody DepositRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestHeader(value = "X-Idempotency-Key", required = false) String xIdempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        accountOwnershipService.verifyOwnershipForMutation(request.getAccountId(), principal);
        User actor = userRepository.findById(principal.getId()).orElseThrow();
        String key = resolveIdempotencyKey(idempotencyKey, xIdempotencyKey);

        DepositCommand cmd = DepositCommand.builder()
                .accountId(request.getAccountId())
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .description(request.getDescription())
                .build();

        TransactionReceipt receipt = transactionService.executeDeposit(cmd, actor, key);
        return ResponseEntity.ok(receipt);
    }

    @PostMapping("/withdraw")
    public ResponseEntity<TransactionReceipt> withdraw(
            @Valid @RequestBody WithdrawalRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestHeader(value = "X-Idempotency-Key", required = false) String xIdempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        accountOwnershipService.verifyOwnershipForMutation(request.getAccountId(), principal);
        User actor = userRepository.findById(principal.getId()).orElseThrow();
        String key = resolveIdempotencyKey(idempotencyKey, xIdempotencyKey);

        WithdrawalCommand cmd = WithdrawalCommand.builder()
                .accountId(request.getAccountId())
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .description(request.getDescription())
                .build();

        TransactionReceipt receipt = transactionService.executeWithdrawal(cmd, actor, key);
        return ResponseEntity.ok(receipt);
    }

    @PostMapping("/transfer")
    public ResponseEntity<TransactionReceipt> transfer(
            @Valid @RequestBody TransferRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestHeader(value = "X-Idempotency-Key", required = false) String xIdempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        accountOwnershipService.verifyOwnershipForMutation(request.getFromAccountId(), principal);
        User actor = userRepository.findById(principal.getId()).orElseThrow();
        String key = resolveIdempotencyKey(idempotencyKey, xIdempotencyKey);

        TransferCommand cmd = TransferCommand.builder()
                .fromAccountId(request.getFromAccountId())
                .toAccountId(request.getToAccountId())
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .description(request.getDescription())
                .build();

        TransactionReceipt receipt = transactionService.executeTransfer(cmd, actor, key);
        return ResponseEntity.ok(receipt);
    }

    private String resolveIdempotencyKey(String key1, String key2) {
        if (key1 != null && !key1.trim().isEmpty()) {
            return key1.trim();
        }
        if (key2 != null && !key2.trim().isEmpty()) {
            return key2.trim();
        }
        return null;
    }
}

