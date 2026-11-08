package com.ledgerline.domain.ledger.repository;

import com.ledgerline.domain.ledger.entity.JournalTransaction;
import com.ledgerline.domain.ledger.entity.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JournalTransactionRepository extends JpaRepository<JournalTransaction, Long> {

    Optional<JournalTransaction> findByTransactionReference(String transactionReference);

    Page<JournalTransaction> findAllByOrderByPostedAtDesc(Pageable pageable);

    Page<JournalTransaction> findByTransactionTypeOrderByPostedAtDesc(TransactionType transactionType, Pageable pageable);
}

