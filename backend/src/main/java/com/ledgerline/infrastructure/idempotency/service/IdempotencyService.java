package com.ledgerline.infrastructure.idempotency.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerline.common.exception.BusinessException;
import com.ledgerline.common.exception.IdempotencyConflictException;
import com.ledgerline.common.exception.PayloadMismatchException;
import com.ledgerline.domain.auth.entity.User;
import com.ledgerline.domain.ledger.dto.TransactionReceipt;
import com.ledgerline.domain.ledger.entity.JournalTransaction;
import com.ledgerline.domain.ledger.repository.JournalTransactionRepository;
import com.ledgerline.infrastructure.idempotency.entity.IdempotencyRecord;
import com.ledgerline.infrastructure.idempotency.entity.IdempotencyStatus;
import com.ledgerline.infrastructure.idempotency.repository.IdempotencyRecordRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.function.Supplier;

@Slf4j
@Service
public class IdempotencyService {

    private final IdempotencyRecordRepository idempotencyRecordRepository;
    private final JournalTransactionRepository journalTransactionRepository;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate requiresNewTransactionTemplate;

    public IdempotencyService(
            IdempotencyRecordRepository idempotencyRecordRepository,
            JournalTransactionRepository journalTransactionRepository,
            ObjectMapper objectMapper,
            PlatformTransactionManager transactionManager
    ) {
        this.idempotencyRecordRepository = idempotencyRecordRepository;
        this.journalTransactionRepository = journalTransactionRepository;
        this.objectMapper = objectMapper;
        this.requiresNewTransactionTemplate = new TransactionTemplate(transactionManager);
        this.requiresNewTransactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * Executes an operation with strict idempotency guarantees.
     * 
     * 1. If key exists and completed with identical payload: replay cached receipt.
     * 2. If key exists and payload hash differs: reject with PayloadMismatchException.
     * 3. If key exists and status is IN_PROGRESS: reject with IdempotencyConflictException (concurrent request).
     * 4. If key is fresh: mark IN_PROGRESS in an isolated transaction, execute operation,
     *    and record COMPLETED receipt.
     */
    public TransactionReceipt executeIdempotent(
            String idempotencyKey,
            User user,
            Object requestPayload,
            Supplier<TransactionReceipt> operation
    ) {
        if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
            return operation.get();
        }

        String requestHash = computePayloadHash(requestPayload);
        String trimmedKey = idempotencyKey.trim();

        // Step 1: In an isolated REQUIRES_NEW transaction, check existing record or reserve IN_PROGRESS
        IdempotencyRecord existingRecord = reserveOrGetExisting(trimmedKey, user, requestHash);

        if (existingRecord != null && existingRecord.getStatus() == IdempotencyStatus.COMPLETED) {
            log.info("Replaying cached idempotency response for key: {}", trimmedKey);
            return deserializeReceipt(existingRecord.getResponseBody());
        }

        // Step 2: Execute the financial operation
        TransactionReceipt receipt;
        try {
            receipt = operation.get();
        } catch (Exception ex) {
            try {
                requiresNewTransactionTemplate.executeWithoutResult(status ->
                        markFailedInternal(trimmedKey, ex.getMessage())
                );
            } catch (Exception markEx) {
                log.warn("Could not mark idempotency record as failed for key {}: {}", trimmedKey, markEx.getMessage());
            }
            throw ex;
        }

        // Step 3: Record completion and store cached response
        try {
            requiresNewTransactionTemplate.executeWithoutResult(status ->
                    markCompletedInternal(trimmedKey, receipt)
            );
        } catch (Exception markEx) {
            log.warn("Could not mark idempotency record as completed for key {}: {}", trimmedKey, markEx.getMessage());
        }

        return receipt;
    }

    private IdempotencyRecord reserveOrGetExisting(String idempotencyKey, User user, String requestHash) {
        int maxAttempts = 5;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return requiresNewTransactionTemplate.execute(status -> {
                    // Non-locking read: does not acquire gap locks in MySQL InnoDB
                    Optional<IdempotencyRecord> optRecord = idempotencyRecordRepository.findById(idempotencyKey);

                    if (optRecord.isPresent()) {
                        IdempotencyRecord record = optRecord.get();

                        // Validate payload hash to prevent re-use of key with altered amounts/accounts
                        if (!record.getRequestHash().equals(requestHash)) {
                            throw new PayloadMismatchException(
                                    String.format("Idempotency key '%s' was already used with a different request payload.", idempotencyKey)
                            );
                        }

                        if (record.getStatus() == IdempotencyStatus.IN_PROGRESS) {
                            throw new IdempotencyConflictException(
                                    String.format("A financial operation with idempotency key '%s' is currently executing.", idempotencyKey)
                            );
                        }

                        if (record.getStatus() == IdempotencyStatus.COMPLETED) {
                            return record;
                        }

                        // If previously failed, allow retry by updating status to IN_PROGRESS
                        record.setStatus(IdempotencyStatus.IN_PROGRESS);
                        record.setExpiresAt(LocalDateTime.now().plusHours(24));
                        return idempotencyRecordRepository.save(record);
                    }

                    // Insert fresh IN_PROGRESS record
                    IdempotencyRecord newRecord = IdempotencyRecord.builder()
                            .idempotencyKey(idempotencyKey)
                            .user(user)
                            .requestHash(requestHash)
                            .status(IdempotencyStatus.IN_PROGRESS)
                            .expiresAt(LocalDateTime.now().plusHours(24))
                            .build();

                    return idempotencyRecordRepository.saveAndFlush(newRecord);
                });
            } catch (DataIntegrityViolationException ex) {
                // If another concurrent thread inserted the same key simultaneously
                if (attempt == maxAttempts) {
                    throw new IdempotencyConflictException(
                            String.format("A financial operation with idempotency key '%s' is currently executing.", idempotencyKey)
                    );
                }
            } catch (PessimisticLockingFailureException ex) {
                if (attempt == maxAttempts) {
                    throw ex;
                }
                try {
                    Thread.sleep(50L * attempt);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw ex;
                }
            }
        }
        throw new IdempotencyConflictException(
                String.format("Could not acquire idempotency lock for key '%s'", idempotencyKey)
        );
    }

    private void markCompletedInternal(String idempotencyKey, TransactionReceipt receipt) {
        idempotencyRecordRepository.findById(idempotencyKey).ifPresent(record -> {
            record.setStatus(IdempotencyStatus.COMPLETED);
            record.setResponseStatusCode(200);
            try {
                record.setResponseBody(objectMapper.writeValueAsString(receipt));
            } catch (JsonProcessingException e) {
                log.error("Failed to serialize transaction receipt for key {}", idempotencyKey, e);
                record.setResponseBody("{\"status\":\"COMPLETED\"}");
            }

            if (receipt.getTransactionReference() != null) {
                Optional<JournalTransaction> jTx = journalTransactionRepository
                        .findByTransactionReference(receipt.getTransactionReference());
                jTx.ifPresent(record::setTransaction);
            }

            idempotencyRecordRepository.save(record);
        });
    }

    private void markFailedInternal(String idempotencyKey, String errorMessage) {
        idempotencyRecordRepository.findById(idempotencyKey).ifPresent(record -> {
            record.setStatus(IdempotencyStatus.FAILED);
            record.setResponseStatusCode(400);
            record.setResponseBody("{\"error\":\"" + (errorMessage != null ? errorMessage.replace("\"", "'") : "Operation failed") + "\"}");
            idempotencyRecordRepository.save(record);
        });
    }

    public String computePayloadHash(Object payload) {
        if (payload == null) {
            return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // Empty SHA-256
        }
        try {
            String json = objectMapper.writeValueAsString(payload);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(json.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (JsonProcessingException | NoSuchAlgorithmException e) {
            throw new BusinessException("Failed to compute canonical request hash for idempotency", e);
        }
    }

    private TransactionReceipt deserializeReceipt(String responseBody) {
        try {
            return objectMapper.readValue(responseBody, TransactionReceipt.class);
        } catch (JsonProcessingException e) {
            throw new BusinessException("Failed to deserialize cached transaction receipt", e);
        }
    }
}
