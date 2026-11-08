package com.ledgerline.common.exception;

public class AccountFrozenException extends BusinessException {
    public AccountFrozenException(String message) {
        super(message);
    }
}

