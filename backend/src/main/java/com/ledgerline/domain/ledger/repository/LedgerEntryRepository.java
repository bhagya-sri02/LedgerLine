package com.ledgerline.domain.ledger.repository;

import com.ledgerline.domain.ledger.entity.EntryDirection;
import com.ledgerline.domain.ledger.entity.LedgerEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {

    List<LedgerEntry> findByTransactionId(Long transactionId);

    List<LedgerEntry> findByAccountIdOrderByCreatedAtAsc(Long accountId);

    List<LedgerEntry> findByAccountIdOrderByCreatedAtDesc(Long accountId);

    Page<LedgerEntry> findByAccountIdOrderByCreatedAtDesc(Long accountId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(CASE WHEN e.entryDirection = com.ledgerline.domain.ledger.entity.EntryDirection.CREDIT THEN e.amount ELSE -e.amount END), 0.0000) " +
           "FROM LedgerEntry e WHERE e.account.id = :accountId")
    BigDecimal calculateNetLiabilityBalanceForAccount(@Param("accountId") Long accountId);

    @Query("SELECT COALESCE(SUM(e.amount), 0.0000) FROM LedgerEntry e WHERE e.entryDirection = :direction")
    BigDecimal sumTotalAmountByDirection(@Param("direction") EntryDirection direction);
}

