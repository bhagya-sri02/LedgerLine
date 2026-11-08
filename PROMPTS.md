# LedgerLine: Engineering Prompts & Decision Log

**Snovasys Fresher Hiring Challenge 2026**

This document tracks prompt requirements, technical clarifications, and architectural approvals throughout the lifecycle of the LedgerLine project.

---

## Prompt 1: Initial Requirements & Architectural Inquiry
- **Requirements**:
  - Roles: Admin, Account Holder, Auditor.
  - Double-entry append-only ledger.
  - Concurrency safety, idempotency, negative balance prevention.
  - Audit history & read-only auditor access.
  - Tech stack: Java 21, Spring Boot, Spring Data JPA/Hibernate, MySQL 8, React.js.
- **Architectural Proposal**:
  - Proposed banking liability model, deterministic pessimistic locking, idempotency with request hashing, and hybrid materialized balance design.

---

## Prompt 2: Architectural Approvals & Baseline Refinements
- **Approved Decisions**:
  1. Banking liability perspective for customer accounts (Credits = Deposits, Debits = Withdrawals).
  2. Hybrid double-entry ledger with materialized balances.
  3. Pessimistic database locking with deterministic ascending account-ID ordering.
  4. Authoritative idempotency key management.
  5. Append-only ledger entries with database-level trigger protection.
  6. Strict RBAC and account ownership verification.
- **Additional Directives**:
  - Currency and monetary precision validation.
  - Reconciliation checks for ledger totals vs materialized balances.
  - Safe deadlock and transient failure recovery with fresh transactions.
  - Clarification that locking serializes access but does not guarantee strict FIFO ordering.
  - Maven Wrapper with stable Maven 3.9.x.
  - MySQL Testcontainers for financial integration tests.

---

## Prompt 3: Phase 1 Final Refinements & Scope Definition
- **Key Refinements**:
  1. `idempotency_records` established as single authoritative owner of idempotency keys; `journal_transactions` decoupled from idempotency key uniqueness.
  2. Double-entry posting invariant enforced: a transaction is not `POSTED` unless it has $\ge 2$ entries and $\sum \text{Debits} == \sum \text{Credits}$, enforced at both application and MySQL trigger levels.
  3. Spring Retry and `@Transactional` proxy ordering: Retry advice at higher precedence than transaction advice to ensure each retry runs in a clean, fresh transaction.
  4. Phase 1 deliverables limited to scaffolding, configurations, Flyway migrations, templates, and build verification checks without business logic.

---

## Prompt 4: Phase 2 Entity Mapping & Schema Validation
- **Deliverables**:
  1. JPA Entities and Enums matching Flyway schema migrations (`V1`, `V2`, `V3`) with 100% precision.
  2. Strict `spring.jpa.hibernate.ddl-auto=validate` enforcement without schema alteration.
  3. Spring Data JPA Repositories with `@Lock(PESSIMISTIC_WRITE)` and query timeout hints.
  4. Live schema validation integration test against MySQL 8.

---

## Prompt 5: Phase 3 Core Financial Services & Concurrency Tests
- **Deliverables**:
  1. Core financial operations: `deposit`, `withdraw`, `transfer` in `AccountTransactionService`.
  2. Immutable double-entry posting engine in `LedgerPostingService` ($\ge 2$ entries, balanced debits and credits).
  3. High-concurrency pessimistic locking in ascending primary key ID order (`min(id)` then `max(id)`).
  4. Authoritative idempotency engine with SHA-256 payload hashing, replay cache, and deadlock-free reservation.
  5. Audit logging committed atomically within financial transactions.
  6. Comprehensive integration test suite executing 13 test cases against MySQL 8 (100% pass rate).

