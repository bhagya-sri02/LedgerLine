package com.ledgerline.domain.ledger.repository;

import com.ledgerline.domain.ledger.entity.JournalTransaction;
import com.ledgerline.domain.ledger.entity.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JournalTransactionRepository extends JpaRepository<JournalTransaction, Long> {

    Optional<JournalTransaction> findByTransactionReference(String transactionReference);

    @EntityGraph(attributePaths = {"entries", "entries.account"})
    Page<JournalTransaction> findAllByOrderByPostedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"entries", "entries.account"})
    Page<JournalTransaction> findByTransactionTypeOrderByPostedAtDesc(TransactionType transactionType, Pageable pageable);
}

