package com.ledgerline.api.controller;

import com.ledgerline.domain.account.dto.AccountResponse;
import com.ledgerline.domain.account.dto.StatementResponse;
import com.ledgerline.domain.account.service.AccountOwnershipService;
import com.ledgerline.domain.account.service.AccountService;
import com.ledgerline.infrastructure.security.userdetails.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/accounts")
public class AccountController {

    private final AccountService accountService;
    private final AccountOwnershipService accountOwnershipService;

    public AccountController(
            AccountService accountService,
            AccountOwnershipService accountOwnershipService
    ) {
        this.accountService = accountService;
        this.accountOwnershipService = accountOwnershipService;
    }

    @GetMapping("/my")
    public ResponseEntity<List<AccountResponse>> getMyAccounts(@AuthenticationPrincipal UserPrincipal principal) {
        List<AccountResponse> accounts = accountService.getAccountsByUserId(principal.getId());
        return ResponseEntity.ok(accounts);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AccountResponse> getAccountById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        accountOwnershipService.verifyOwnership(id, principal);
        AccountResponse response = accountService.getAccountById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/statement")
    public ResponseEntity<StatementResponse> getAccountStatement(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        accountOwnershipService.verifyOwnership(id, principal);
        StatementResponse statement = accountService.getAccountStatement(id);
        return ResponseEntity.ok(statement);
    }
}

