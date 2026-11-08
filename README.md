# LedgerLine

**Snovasys Fresher Hiring Challenge 2026**

LedgerLine is a high-concurrency, double-entry financial core banking ledger designed with strict mathematical correctness, atomic balance mutations, append-only auditability, and tamper-resistant constraints.

---

## 1. Core Architectural Highlights

- **Double-Entry Bookkeeping Engine**: Customer deposit accounts are treated as **Liabilities** from the bank's general ledger perspective. Deposits are recorded as credits (increasing liabilities); withdrawals are recorded as debits (decreasing liabilities). Every transaction produces balanced journal entries where:
  $$\sum \text{Debits} = \sum \text{Credits}$$
- **Atomic Hybrid Materialized Balances**: Balances are materialized on account rows for instantaneous $O(1)$ reads and validated by engine-level non-negative constraints. Balances are never modified in isolation without atomic double-entry ledger journal insertion.
- **Deterministic Concurrency & Deadlock Avoidance**: Transactions involving multiple accounts acquire pessimistic write locks (`SELECT ... FOR UPDATE`) in strictly ascending account-ID order (`min(id)` then `max(id)`), eliminating circular wait deadlocks.
- **Authoritative Idempotency Engine**: `idempotency_records` is the single authoritative owner of idempotency keys. Network retries with duplicate keys return cached responses with identical payloads; payload mutations with the same key are rejected with `422 Unprocessable Entity`.
- **Database-Level Immutability**: MySQL 8 triggers prevent `UPDATE` and `DELETE` operations on posted ledger entries and journal transactions, guaranteeing append-only immutability even against rogue SQL execution.
- **Strict Role-Based Access Control (RBAC)**:
  - `ROLE_ADMIN`: Onboards users, opens bank accounts, manages operational status.
  - `ROLE_ACCOUNT_HOLDER`: Transacts exclusively on owned accounts.
  - `ROLE_AUDITOR`: Strictly read-only access to global ledgers, transaction journals, audit trails, and reconciliation health checks.

---

## 2. Technology Stack

- **Java**: 21 (LTS)
- **Framework**: Spring Boot 3.3.5
- **Persistence**: Spring Data JPA / Hibernate 6
- **Database**: MySQL 8 (InnoDB)
- **Database Migrations**: Flyway
- **Security**: Spring Security 6 (Stateless JWT)
- **Resilience**: Spring Retry (proxy-ordered with fresh transaction execution)
- **Testing**: JUnit 5, Testcontainers MySQL 8
- **Frontend**: React.js

---

## 3. Getting Started

### Prerequisites
- Java 21 JDK (`JAVA_HOME` pointing to JDK 21+)
- MySQL 8.0+
- Node.js 18+ and npm (for frontend)

### Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env
```
Update `.env` with your local MySQL credentials:
```properties
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ledgerline
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
```

### Building the Backend
Navigate to the `backend` directory and run:
```bash
# Windows
.\mvnw.cmd clean compile

# Linux / macOS
./mvnw clean compile
```

### Running Tests
Execute the integration test suite against MySQL 8:
```powershell
# Windows PowerShell
powershell -ExecutionPolicy Bypass -File backend\run-phase3-tests.ps1
```
Or with Maven against a running MySQL 8 database:
```bash
mvnw test -Dspring.datasource.url=jdbc:mysql://localhost:3306/ledgerline
```

---

## 4. Database Migrations
Migrations are managed automatically by Flyway upon application startup:
- `V1__init_schema.sql`: Core tables (`users`, `roles`, `user_roles`, `accounts`, `journal_transactions`, `ledger_entries`, `idempotency_records`, `audit_logs`).
- `V2__triggers_and_immutability.sql`: Engine-level triggers enforcing append-only immutability and posted double-entry balance validation ($\text{count} \ge 2, \sum \text{DR} = \sum \text{CR}$).
- `V3__seed_data.sql`: Seed data for standard roles and system clearing accounts (`SYS-CASH-SETTLEMENT-*`).

