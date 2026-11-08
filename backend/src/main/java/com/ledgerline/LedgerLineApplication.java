package com.ledgerline;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.retry.annotation.EnableRetry;

@SpringBootApplication
@EnableRetry(order = 1)
public class LedgerLineApplication {

    public static void main(String[] args) {
        SpringApplication.run(LedgerLineApplication.class, args);
    }
}

