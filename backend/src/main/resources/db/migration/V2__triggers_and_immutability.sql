-- ============================================================================
-- V2__triggers_and_immutability.sql: Financial Correctness & Immutability Triggers
-- LedgerLine - Snovasys Fresher Hiring Challenge 2026
-- ============================================================================

DELIMITER //

-- 1. Prevent UPDATE on ledger_entries (Append-Only Enforcement)
CREATE TRIGGER trg_ledger_entries_immutable_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'FATAL: Ledger entries are append-only and cannot be updated.';
END;//

-- 2. Prevent DELETE on ledger_entries (Audit Integrity)
CREATE TRIGGER trg_ledger_entries_immutable_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'FATAL: Ledger entries are append-only and cannot be deleted.';
END;//

-- 3. Prevent DELETE on journal_transactions
CREATE TRIGGER trg_journal_tx_immutable_delete
BEFORE DELETE ON journal_transactions
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'FATAL: Journal transactions cannot be deleted.';
END;//

-- 4. Enforce Double-Entry Balancing on Posting
-- A transaction cannot transition to POSTED unless:
--   a) It has at least two ledger entries
--   b) Total Debits equal Total Credits
CREATE TRIGGER trg_journal_tx_verify_balance_on_post
BEFORE UPDATE ON journal_transactions
FOR EACH ROW
BEGIN
    DECLARE v_entry_count INT;
    DECLARE v_debit_sum DECIMAL(19, 4);
    DECLARE v_credit_sum DECIMAL(19, 4);

    -- If already posted, prevent further updates
    IF OLD.status = 'POSTED' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL: Posted journal transactions are immutable.';
    END IF;

    -- If transitioning to POSTED, verify entries and balance
    IF NEW.status = 'POSTED' AND OLD.status != 'POSTED' THEN
        SELECT 
            COUNT(*),
            COALESCE(SUM(CASE WHEN entry_direction = 'DEBIT' THEN amount ELSE 0.0000 END), 0.0000),
            COALESCE(SUM(CASE WHEN entry_direction = 'CREDIT' THEN amount ELSE 0.0000 END), 0.0000)
        INTO 
            v_entry_count, 
            v_debit_sum, 
            v_credit_sum
        FROM ledger_entries
        WHERE transaction_id = NEW.id;

        IF v_entry_count < 2 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FATAL: Journal transaction requires at least two ledger entries to be POSTED.';
        END IF;

        IF v_debit_sum <> v_credit_sum THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FATAL: Unbalanced transaction. Debits must equal Credits for posting.';
        END IF;
    END IF;
END;//

-- 5. Prevent appending ledger entries to transactions that are already POSTED
CREATE TRIGGER trg_ledger_entries_no_insert_on_posted_tx
BEFORE INSERT ON ledger_entries
FOR EACH ROW
BEGIN
    DECLARE v_tx_status VARCHAR(20);

    SELECT status INTO v_tx_status
    FROM journal_transactions
    WHERE id = NEW.transaction_id;

    IF v_tx_status = 'POSTED' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL: Cannot add ledger entries to an already POSTED journal transaction.';
    END IF;
END;//

DELIMITER ;

