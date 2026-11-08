-- ============================================================================
-- V1__init_schema.sql: Core Schema Definition
-- LedgerLine - Snovasys Fresher Hiring Challenge 2026
-- ============================================================================

-- 1. Roles Table
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 2. Users Table
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. User Roles Join Table (RBAC)
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. Bank Accounts Table
-- Materialized balance with engine-level non-negative balance check.
CREATE TABLE accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(34) NOT NULL UNIQUE,
    user_id BIGINT NULL, -- NULL allowed for SYSTEM accounts
    account_type ENUM('SAVINGS', 'CHECKING', 'SYSTEM_CLEARING') NOT NULL,
    balance DECIMAL(19, 4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status ENUM('ACTIVE', 'FROZEN', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_acc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_account_balance_non_negative CHECK (
        account_type = 'SYSTEM_CLEARING' OR balance >= 0.0000
    )
) ENGINE=InnoDB;

CREATE INDEX idx_acc_user_id ON accounts (user_id);

-- 5. Journal Transactions
-- Tracks financial events. Idempotency is decoupled and owned by idempotency_records.
CREATE TABLE journal_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_reference VARCHAR(64) NOT NULL UNIQUE, -- Domain UUID
    transaction_type ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER') NOT NULL,
    status ENUM('PENDING', 'POSTED') NOT NULL DEFAULT 'PENDING',
    description VARCHAR(255) NOT NULL,
    posted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_jtx_posted_at ON journal_transactions (posted_at DESC);

-- 6. Double-Entry Ledger Entries (Append-Only)
-- Invariant: Sum of debits = Sum of credits per transaction
CREATE TABLE ledger_entries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_id BIGINT NOT NULL,
    account_id BIGINT NOT NULL,
    entry_direction ENUM('DEBIT', 'CREDIT') NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    balance_after DECIMAL(19, 4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_le_tx FOREIGN KEY (transaction_id) REFERENCES journal_transactions(id) ON DELETE RESTRICT,
    CONSTRAINT fk_le_acc FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    CONSTRAINT chk_entry_amount_positive CHECK (amount > 0.0000)
) ENGINE=InnoDB;

CREATE INDEX idx_le_acc_created ON ledger_entries (account_id, created_at DESC);
CREATE INDEX idx_le_tx ON ledger_entries (transaction_id);

-- 7. Idempotency Records
-- Authoritative single owner of idempotency keys. References completed journal transaction.
CREATE TABLE idempotency_records (
    idempotency_key VARCHAR(64) NOT NULL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    request_hash CHAR(64) NOT NULL,
    status ENUM('IN_PROGRESS', 'COMPLETED', 'FAILED') NOT NULL,
    transaction_id BIGINT NULL,
    response_status_code INT NULL,
    response_body LONGTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_idem_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_idem_tx FOREIGN KEY (transaction_id) REFERENCES journal_transactions(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_idem_user ON idempotency_records (user_id);
CREATE INDEX idx_idem_expires ON idempotency_records (expires_at);

-- 8. Audit Logs
-- Tracks administrative actions, account freezing/unfreezing, and security events.
CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_id BIGINT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs (created_at DESC);

