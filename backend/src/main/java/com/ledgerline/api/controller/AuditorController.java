package com.ledgerline.api.controller;

import com.ledgerline.domain.account.dto.LedgerEntryDto;
import com.ledgerline.domain.audit.dto.AuditLogDto;
import com.ledgerline.domain.audit.repository.AuditLogRepository;
import com.ledgerline.domain.ledger.dto.JournalTransactionDto;
import com.ledgerline.domain.ledger.dto.LedgerEntryRecord;
import com.ledgerline.domain.ledger.repository.JournalTransactionRepository;
import com.ledgerline.domain.ledger.repository.LedgerEntryRepository;
import com.ledgerline.domain.reconciliation.dto.AccountReconciliationDto;
import com.ledgerline.domain.reconciliation.dto.ReconciliationSummaryDto;
import com.ledgerline.domain.reconciliation.service.ReconciliationService;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/auditor")
@PreAuthorize("hasRole('AUDITOR')")
@Transactional(readOnly = true)
public class AuditorController {

    private final JournalTransactionRepository journalTransactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final AuditLogRepository auditLogRepository;
    private final ReconciliationService reconciliationService;

    public AuditorController(
            JournalTransactionRepository journalTransactionRepository,
            LedgerEntryRepository ledgerEntryRepository,
            AuditLogRepository auditLogRepository,
            ReconciliationService reconciliationService
    ) {
        this.journalTransactionRepository = journalTransactionRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.auditLogRepository = auditLogRepository;
        this.reconciliationService = reconciliationService;
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<JournalTransactionDto>> getTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        List<JournalTransactionDto> list = journalTransactionRepository
                .findAllByOrderByPostedAtDesc(PageRequest.of(page, size))
                .stream()
                .map(tx -> JournalTransactionDto.builder()
                        .id(tx.getId())
                        .transactionReference(tx.getTransactionReference())
                        .transactionType(tx.getTransactionType())
                        .status(tx.getStatus())
                        .description(tx.getDescription())
                        .postedAt(tx.getPostedAt())
                        .entries(tx.getEntries().stream()
                                .map(e -> LedgerEntryRecord.builder()
                                        .entryId(e.getId())
                                        .accountId(e.getAccount().getId())
                                        .accountNumber(e.getAccount().getAccountNumber())
                                        .direction(e.getEntryDirection())
                                        .amount(e.getAmount())
                                        .balanceAfter(e.getBalanceAfter())
                                        .build())
                                .collect(Collectors.toList()))
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(list);
    }

    @GetMapping("/ledger-entries")
    public ResponseEntity<List<LedgerEntryDto>> getLedgerEntries(
            @RequestParam(required = false) Long accountId
    ) {
        var entries = (accountId != null)
                ? ledgerEntryRepository.findByAccountIdOrderByCreatedAtAsc(accountId)
                : ledgerEntryRepository.findAll();

        List<LedgerEntryDto> dtos = entries.stream()
                .map(e -> LedgerEntryDto.builder()
                        .id(e.getId())
                        .direction(e.getEntryDirection())
                        .amount(e.getAmount())
                        .balanceAfter(e.getBalanceAfter())
                        .currency(e.getAccount() != null ? e.getAccount().getCurrency() : null)
                        .transactionReference(e.getTransaction() != null ? e.getTransaction().getTransactionReference() : null)
                        .transactionType(e.getTransaction() != null ? e.getTransaction().getTransactionType() : null)
                        .description(e.getTransaction() != null ? e.getTransaction().getDescription() : null)
                        .createdAt(e.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLogDto>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        List<AuditLogDto> list = auditLogRepository
                .findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
                .stream()
                .map(a -> AuditLogDto.builder()
                        .id(a.getId())
                        .actor(a.getActor() != null ? a.getActor().getUsername() : "SYSTEM")
                        .action(a.getAction())
                        .metadata(a.getMetadata())
                        .entityType(a.getEntityType())
                        .entityId(a.getEntityId())
                        .createdAt(a.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(list);
    }

    @GetMapping("/reconciliation")
    public ResponseEntity<ReconciliationSummaryDto> getGlobalReconciliation() {
        ReconciliationSummaryDto summary = reconciliationService.performGlobalReconciliation();
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/reconciliation/accounts/{id}")
    public ResponseEntity<AccountReconciliationDto> getAccountReconciliation(@PathVariable Long id) {
        AccountReconciliationDto result = reconciliationService.reconcileAccount(id);
        return ResponseEntity.ok(result);
    }
}
