package com.ledgerline.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class AccountOwnershipException extends BusinessException {
    public AccountOwnershipException(String message) {
        super(message);
    }
}

