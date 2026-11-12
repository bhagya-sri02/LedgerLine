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
  6. Comprehensive integration test suite executing 12 financial test cases against MySQL 8 (100% pass rate).

---

## Prompt 6: Phase 4 Spring Security 6, JWT, RBAC & REST APIs
- **Deliverables**:
  1. Stateless JWT authentication with HMAC-SHA256 tokens (`JwtTokenProvider`, `JwtAuthenticationFilter`).
  2. Role-Based Access Control (`ROLE_ADMIN`, `ROLE_ACCOUNT_HOLDER`, `ROLE_AUDITOR`) configured in `SecurityConfig`.
  3. REST controllers for Auth, Admin, Account Holder, Transactions, and Auditor operations.
  4. Account ownership verification enforcing strict tenancy (`AccountOwnershipService`).
  5. Strict read-only auditor permissions at controller and service levels.
  6. Global reconciliation engine (`ReconciliationService`) auditing zero-sum ledger balance and per-account liability history.

---

## Prompt 7: Phase 5 Backend Testing & Validation
- **Deliverables**:
  1. Comprehensive execution of full backend test suite against MySQL 8: 24 tests executed, 24 passed (0 failures, 0 errors, 0 skipped).
  2. Bugs diagnosed and resolved:
     - Cleared thread-local authentication in `AuthService.login` and test fixtures to prevent test pollution in stateless JWT flows.
     - Added `@Transactional(readOnly = true)` and `@EntityGraph` for audit logs and transaction entries in `AuditorController` to prevent `LazyInitializationException`.
     - Added null safeguards in `ReconciliationService` for empty table aggregate operations.
     - Resolved duplicate YAML mapping keys in `application.yml`.
  3. Verified 100% test coverage across schema validation, double-entry financial invariants, concurrency-safe pessimistic locking, idempotency replay, and RBAC / JWT security.

---

## Prompt 8: Final Engineering Audit, Full-Stack Delivery & Test Suite Expansion
- **Deliverables**:
  1. **Complete Full-Stack Application**:
     - Built React 18 + Vite 5 + Tailwind CSS banking portal with Stripe-grade UI/UX.
     - Fully responsive across mobile, tablet, and desktop viewports with accessible mobile navigation drawers.
     - Confirmation modals integrated for sensitive actions (withdrawals, transfers, account freeze/close governance).
     - Browser-native CSV statements and transaction history exports with custom date-range filtering.
  2. **Performance & Database Optimizations**:
     - Eliminated N+1 query anti-patterns across `AccountRepository` and `JournalTransactionRepository` using JPA `@EntityGraph(attributePaths = ...)`.
     - Automatically provisioned default `CHECKING` account upon user registration with `ROLE_ACCOUNT_HOLDER`.
     - Verified indexes across `account_id`, `created_at`, `status`, and `idempotency_key`.
  3. **Backend Test Suite Expansion (31/31 Passed against MySQL 8)**:
     - Expanded test coverage from 24 to 31 integration tests.
     - Added edge-case test validations: zero monetary amount rejection, negative amount rejection, closed account transaction rejection, 4-decimal precision Banker's rounding (`HALF_EVEN`), extreme amount overflow protection ($99B), chained multi-account flow reconciliation, and REST API frozen account rejection (422).
  4. **Production Build Verification**:
     - Frontend production bundle cleanly compiled with 0 errors (`npm run build`).
     - Backend test suite verified 31/31 passed against live MySQL 8 instance.

