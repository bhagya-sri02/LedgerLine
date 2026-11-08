-- ============================================================================
-- V3__seed_data.sql: Initial Seed Data for Roles and System Clearing Accounts
-- LedgerLine - Snovasys Fresher Hiring Challenge 2026
-- ============================================================================

-- Seed Roles
INSERT INTO roles (id, name) VALUES 
(1, 'ROLE_ADMIN'),
(2, 'ROLE_ACCOUNT_HOLDER'),
(3, 'ROLE_AUDITOR')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Seed System Clearing Accounts (Settlement counterpart for cash deposits/withdrawals)
INSERT INTO accounts (account_number, user_id, account_type, balance, currency, status) VALUES
('SYS-CASH-SETTLEMENT-USD', NULL, 'SYSTEM_CLEARING', 0.0000, 'USD', 'ACTIVE'),
('SYS-CASH-SETTLEMENT-EUR', NULL, 'SYSTEM_CLEARING', 0.0000, 'EUR', 'ACTIVE'),
('SYS-CASH-SETTLEMENT-INR', NULL, 'SYSTEM_CLEARING', 0.0000, 'INR', 'ACTIVE')
ON DUPLICATE KEY UPDATE status=VALUES(status);

