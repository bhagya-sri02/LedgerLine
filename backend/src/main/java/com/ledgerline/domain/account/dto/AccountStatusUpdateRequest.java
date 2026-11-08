package com.ledgerline.domain.account.dto;

import com.ledgerline.domain.account.entity.AccountStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountStatusUpdateRequest {

    @NotNull(message = "Account status is required")
    private AccountStatus status;
}

