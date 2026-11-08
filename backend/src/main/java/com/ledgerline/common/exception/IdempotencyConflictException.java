package com.ledgerline.common.exception;

public class IdempotencyConflictException extends BusinessException {
    public IdempotencyConflictException(String message) {
        super(message);
    }
}

