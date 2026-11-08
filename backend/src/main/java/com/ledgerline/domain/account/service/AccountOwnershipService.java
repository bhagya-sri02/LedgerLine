package com.ledgerline.domain.account.service;

import com.ledgerline.common.exception.AccountNotFoundException;
import com.ledgerline.common.exception.AccountOwnershipException;
import com.ledgerline.domain.account.entity.Account;
import com.ledgerline.domain.account.repository.AccountRepository;
import com.ledgerline.domain.auth.entity.RoleName;
import com.ledgerline.infrastructure.security.userdetails.UserPrincipal;
import org.springframework.stereotype.Service;

@Service
public class AccountOwnershipService {

    private final AccountRepository accountRepository;

    public AccountOwnershipService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    /**
     * Validates that the authenticated principal either owns the account or has administrative/auditor authority.
     */
    public Account verifyOwnership(Long accountId, UserPrincipal principal) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with ID: " + accountId));

        boolean isAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(RoleName.ROLE_ADMIN.name()));

        if (isAdmin) {
            return account;
        }

        boolean isAuditor = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(RoleName.ROLE_AUDITOR.name()));

        if (isAuditor) {
            return account;
        }

        if (account.getUser() == null || !account.getUser().getId().equals(principal.getId())) {
            throw new AccountOwnershipException(
                    String.format("Access denied: User '%s' does not own account ID %d", principal.getUsername(), accountId)
            );
        }

        return account;
    }

    /**
     * Validates that the authenticated principal owns the account for financial transactions.
     * Auditors are strictly forbidden from performing any mutations.
     */
    public Account verifyOwnershipForMutation(Long accountId, UserPrincipal principal) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with ID: " + accountId));

        boolean isAuditor = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(RoleName.ROLE_AUDITOR.name()));

        if (isAuditor) {
            throw new AccountOwnershipException("Access denied: Auditors are strictly prohibited from performing financial transactions.");
        }

        boolean isAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(RoleName.ROLE_ADMIN.name()));

        if (isAdmin) {
            return account;
        }

        if (account.getUser() == null || !account.getUser().getId().equals(principal.getId())) {
            throw new AccountOwnershipException(
                    String.format("Access denied: User '%s' does not own account ID %d", principal.getUsername(), accountId)
            );
        }

        return account;
    }
}

