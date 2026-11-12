# LedgerLine Threat Model & Security Mitigations

**Framework: STRIDE Financial Security Analysis**

This document identifies potential security threats to the LedgerLine financial platform and details the defensive countermeasures implemented at the application, protocol, and database layers.

---

## 1. Spoofing (Identity Theft & Session Hijacking)

| Threat | Risk Level | Mitigation Strategy |
| :--- | :---: | :--- |
| **JWT Forgery or Tampering** | Critical | Stateless JWT signed with HMAC-SHA256 using a minimum 256-bit cryptographically secure secret (`JWT_SECRET`). Tokens are validated on every request by `JwtAuthenticationFilter`. |
| **Credential Theft via Insecure Transit** | High | Transport Layer Security (TLS 1.3 enforced in production). Sensitive passwords hashed with BCrypt (cost factor 12). |
| **Sub-Account Impersonation** | Critical | Method-level security with domain ownership verification (`@accountSecurity.isAccountOwner(principal, #accountId)`). Users cannot initiate transactions or view statements on accounts they do not own. |

---

## 2. Tampering (Unauthorized Data Modification)

| Threat | Risk Level | Mitigation Strategy |
| :--- | :---: | :--- |
| **Direct SQL Update to Ledger History** | Critical | Database-level triggers (`trg_ledger_entries_immutable_update`, `trg_ledger_entries_immutable_delete`) abort any update/delete with SQLSTATE `45000`. Entities annotated with Hibernate `@Immutable`. |
| **Negative Balance Injection / Overdraft** | Critical | Defense-in-depth: Application validation (`balance >= amount`), database `CHECK (balance >= 0.0000)` constraint, and pessimistic row locking serialize balance deductions. |
| **Unbalanced Transaction Injection** | Critical | Trigger `trg_journal_tx_verify_balance_on_post` validates that at least 2 entries exist and $\sum \text{Debits} == \sum \text{Credits}$ before any transaction can be marked `POSTED`. |
| **Idempotency Payload Tampering** | High | `request_hash` (SHA-256 of endpoint + body) is stored with each `idempotency_key`. Subsequent requests reusing a key with altered amounts or accounts are rejected with `422 Unprocessable Entity`. |

---

## 3. Repudiation (Disavowal of Financial Events)

| Threat | Risk Level | Mitigation Strategy |
| :--- | :---: | :--- |
| **Dispute of Transfer Initiation** | High | Every financial transaction logs a unique immutable `transaction_reference` (UUID) linked to the authenticated `user_id` and the client's `Idempotency-Key`. |
| **Administrative Actions Disavowed** | Medium | `audit_logs` records all sensitive operational events (account freezing, role assignments) with timestamp, actor ID, and metadata JSON. |

---

## 4. Information Disclosure (Data Leakage)

| Threat | Risk Level | Mitigation Strategy |
| :--- | :---: | :--- |
| **Unauthorized Account Balance Scraping** | High | Account queries (`/api/v1/accounts/me`) strictly scope results to the authenticated principal's user ID. Cross-account enumeration returns `403 Forbidden` or `404 Not Found`. |
| **Internal Stack Trace Leakage** | Medium | Global exception handler (`GlobalExceptionHandler`) intercepts all unhandled errors and returns standardized `ApiResponse` objects without exposing internal database schemas or stack traces. |

---

## 5. Denial of Service (Deadlocks & Starvation)

| Threat | Risk Level | Mitigation Strategy |
| :--- | :---: | :--- |
| **Bidirectional Transfer Deadlocks** | High | Deterministic lock ordering sorts account primary keys ascendingly (`Math.min(fromId, toId)` then `Math.max(fromId, toId)`) before acquiring pessimistic locks, eliminating circular wait conditions. |
| **Lock Wait Timeouts under Peak Load** | Medium | Configured pessimistic lock timeout hints prevent unbounded thread blocking. Spring Retry wraps transient database locking failures (`CannotAcquireLockException`) in fresh transactions with exponential backoff. |
| **Idempotency In-Flight Flooding** | Medium | Concurrent duplicate requests hitting an in-flight transaction immediately receive `409 Conflict`, shielding the ledger core from redundant execution. |

---

## 6. Elevation of Privilege

| Threat | Risk Level | Mitigation Strategy |
| :--- | :---: | :--- |
| **Auditor Mutating Financial State** | Critical | Auditor role (`ROLE_AUDITOR`) is strictly restricted to HTTP `GET` endpoints in `SecurityConfig`. Any `POST`, `PUT`, `PATCH`, or `DELETE` request yields `403 Forbidden`. In production, auditor database connections are granted read-only privileges (`GRANT SELECT ON ledgerline.*`). |
| **Account Holder Accessing Admin APIs** | Critical | Endpoint paths `/api/v1/admin/**` require `hasRole('ADMIN')`. |

---

## 7. Client & Operational Integrity Protections

| Threat | Risk Level | Mitigation Strategy |
| :--- | :---: | :--- |
| **Accidental / Erroneous High-Impact Execution** | High | Client-side confirmation dialogs require deliberate user confirmation before submitting irreversible withdrawals, transfers, account freezing, or account closures. |
| **Rounding Bias & Fractional Siphoning** | High | Standardized on Banker's Rounding (`BigDecimal.setScale(4, RoundingMode.HALF_EVEN)`) across all balance computations to prevent cumulative statistical drift in large transaction volumes. |
| **N+1 Database Query Starvation DOS** | Medium | JPA `@EntityGraph` eager joins prevent connection pool exhaustion during batch audits and customer transaction queries. |
| **Client CSRF & Cross-Origin Tampering** | Medium | Stateless JWT storage in memory/session with CORS origin restrictions and pre-flight HTTP `OPTIONS` validation. No session cookies are used. |

