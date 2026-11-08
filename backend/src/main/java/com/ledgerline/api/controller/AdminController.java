package com.ledgerline.api.controller;

import com.ledgerline.domain.account.dto.AccountResponse;
import com.ledgerline.domain.account.dto.AccountStatusUpdateRequest;
import com.ledgerline.domain.account.dto.CreateAccountRequest;
import com.ledgerline.domain.account.service.AccountService;
import com.ledgerline.domain.auth.dto.RegisterRequest;
import com.ledgerline.domain.auth.dto.UserProfileDto;
import com.ledgerline.domain.auth.entity.User;
import com.ledgerline.domain.auth.repository.UserRepository;
import com.ledgerline.domain.auth.service.AuthService;
import com.ledgerline.infrastructure.security.userdetails.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AuthService authService;
    private final AccountService accountService;
    private final UserRepository userRepository;

    public AdminController(
            AuthService authService,
            AccountService accountService,
            UserRepository userRepository
    ) {
        this.authService = authService;
        this.accountService = accountService;
        this.userRepository = userRepository;
    }

    @PostMapping("/users")
    public ResponseEntity<UserProfileDto> createUser(@Valid @RequestBody RegisterRequest request) {
        UserProfileDto created = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserProfileDto>> getAllUsers() {
        return ResponseEntity.ok(authService.getAllUsers());
    }

    @PostMapping("/accounts")
    public ResponseEntity<AccountResponse> openAccount(
            @Valid @RequestBody CreateAccountRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User actor = userRepository.findById(principal.getId()).orElseThrow();
        AccountResponse response = accountService.createAccount(request, actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/accounts")
    public ResponseEntity<List<AccountResponse>> getAllAccounts() {
        return ResponseEntity.ok(accountService.getAllAccounts());
    }

    @PutMapping("/accounts/{id}/status")
    public ResponseEntity<AccountResponse> updateAccountStatus(
            @PathVariable Long id,
            @Valid @RequestBody AccountStatusUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User actor = userRepository.findById(principal.getId()).orElseThrow();
        AccountResponse response = accountService.updateAccountStatus(id, request.getStatus(), actor);
        return ResponseEntity.ok(response);
    }
}

