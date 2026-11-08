package com.ledgerline.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerline.common.exception.BusinessException;
import com.ledgerline.domain.account.dto.AccountResponse;
import com.ledgerline.domain.account.dto.CreateAccountRequest;
import com.ledgerline.domain.account.entity.AccountType;
import com.ledgerline.domain.account.service.AccountService;
import com.ledgerline.domain.auth.dto.AuthResponse;
import com.ledgerline.domain.auth.dto.LoginRequest;
import com.ledgerline.domain.auth.dto.RegisterRequest;
import com.ledgerline.domain.auth.entity.Role;
import com.ledgerline.domain.auth.entity.RoleName;
import com.ledgerline.domain.auth.entity.User;
import com.ledgerline.domain.auth.entity.UserStatus;
import com.ledgerline.domain.auth.repository.RoleRepository;
import com.ledgerline.domain.auth.repository.UserRepository;
import com.ledgerline.domain.auth.service.AuthService;
import com.ledgerline.domain.ledger.dto.DepositCommand;
import com.ledgerline.domain.ledger.service.AccountTransactionService;
import com.ledgerline.domain.transaction.dto.DepositRequest;
import com.ledgerline.domain.transaction.dto.TransferRequest;
import com.ledgerline.domain.transaction.dto.WithdrawalRequest;
import com.ledgerline.infrastructure.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class SecurityAndApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthService authService;

    @Autowired
    private AccountService accountService;

    @Autowired
    private AccountTransactionService accountTransactionService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User adminUser;
    private User auditorUser;
    private String adminToken;
    private String auditorToken;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN).orElseThrow();
        Role auditorRole = roleRepository.findByName(RoleName.ROLE_AUDITOR).orElseThrow();

        adminUser = userRepository.findByUsername("admin").orElseGet(() ->
                userRepository.save(User.builder()
                        .username("admin")
                        .email("admin@ledgerline.com")
                        .passwordHash(passwordEncoder.encode("Admin@123456"))
                        .status(UserStatus.ACTIVE)
                        .roles(Set.of(adminRole))
                        .build())
        );

        auditorUser = userRepository.findByUsername("auditor").orElseGet(() ->
                userRepository.save(User.builder()
                        .username("auditor")
                        .email("auditor@ledgerline.com")
                        .passwordHash(passwordEncoder.encode("Auditor@123456"))
                        .status(UserStatus.ACTIVE)
                        .roles(Set.of(auditorRole))
                        .build())
        );

        AuthResponse adminAuth = authService.login(LoginRequest.builder().username("admin").password("Admin@123456").build());
        adminToken = adminAuth.getToken();

        AuthResponse auditorAuth = authService.login(LoginRequest.builder().username("auditor").password("Auditor@123456").build());
        auditorToken = auditorAuth.getToken();
    }

    private User createAccountHolderUser(String username) {
        Role role = roleRepository.findByName(RoleName.ROLE_ACCOUNT_HOLDER).orElseThrow();
        return userRepository.save(User.builder()
                .username(username)
                .email(username + "@example.com")
                .passwordHash(passwordEncoder.encode("Password@123"))
                .status(UserStatus.ACTIVE)
                .roles(Set.of(role))
                .build());
    }

    private String loginAndGetToken(String username, String password) {
        AuthResponse auth = authService.login(LoginRequest.builder().username(username).password(password).build());
        return auth.getToken();
    }

    // =========================================================================
    // 1. Authentication & Registration Tests
    // =========================================================================

    @Test
    @DisplayName("1. User registration encodes password with BCrypt and allows subsequent login")
    void testRegistrationAndLogin() throws Exception {
        String uniqueUser = "user_" + UUID.randomUUID().toString().substring(0, 8);
        RegisterRequest registerReq = RegisterRequest.builder()
                .username(uniqueUser)
                .email(uniqueUser + "@ledgerline.com")
                .password("SecurePass@123")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value(uniqueUser))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_ACCOUNT_HOLDER"));

        // Verify BCrypt hashing in database (must not store plain text password)
        User saved = userRepository.findByUsername(uniqueUser).orElseThrow();
        assertNotEquals("SecurePass@123", saved.getPasswordHash());
        assertTrue(passwordEncoder.matches("SecurePass@123", saved.getPasswordHash()));

        // Perform login
        LoginRequest loginReq = LoginRequest.builder()
                .username(uniqueUser)
                .password("SecurePass@123")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.username").value(uniqueUser));
    }

    @Test
    @DisplayName("2. Login with incorrect password returns 401 Unauthorized")
    void testLoginFailureWrongPassword() throws Exception {
        LoginRequest badLogin = LoginRequest.builder()
                .username("admin")
                .password("WrongPassword@999")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badLogin)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid username or password."));
    }

    @Test
    @DisplayName("3. Duplicate username or email registration is rejected with 409 Conflict")
    void testDuplicateRegistrationRejection() throws Exception {
        RegisterRequest dupReq = RegisterRequest.builder()
                .username("admin") // already exists
                .email("admin_new@ledgerline.com")
                .password("Password@123")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dupReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    // =========================================================================
    // 2. JWT Signature & Token Expiration Validation
    // =========================================================================

    @Test
    @DisplayName("4. Request to protected endpoint without JWT returns 401 Unauthorized")
    void testMissingJwtReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/accounts/my"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("5. Request with forged or malformed JWT returns 401 Unauthorized")
    void testInvalidJwtReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/accounts/my")
                        .header("Authorization", "Bearer invalid.tampered.token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    // =========================================================================
    // 3. Role-Based Access Control (RBAC) & Auditor Restrictions
    // =========================================================================

    @Test
    @DisplayName("6. Account Holder cannot access Admin or Auditor endpoints (403 Forbidden)")
    void testAccountHolderForbiddenFromAdminAndAuditorEndpoints() throws Exception {
        String holderName = "holder_rbac_" + UUID.randomUUID().toString().substring(0, 8);
        createAccountHolderUser(holderName);
        String token = loginAndGetToken(holderName, "Password@123");

        // Attempt admin endpoint
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());

        // Attempt auditor endpoint
        mockMvc.perform(get("/api/v1/auditor/reconciliation")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("7. Auditor cannot access Admin endpoints and cannot execute financial mutations (403 Forbidden)")
    void testAuditorStrictlyReadOnly() throws Exception {
        // Auditor calls Admin endpoint -> 403
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + auditorToken))
                .andExpect(status().isForbidden());

        // Auditor attempts deposit transaction -> 403 Forbidden
        DepositRequest depositReq = DepositRequest.builder()
                .accountId(1L)
                .amount(new BigDecimal("100.00"))
                .currency("USD")
                .build();

        mockMvc.perform(post("/api/v1/transactions/deposit")
                        .header("Authorization", "Bearer " + auditorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(depositReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("8. Auditor is strictly read-only at the service level")
    void testAuditorServiceLevelEnforcement() {
        DepositCommand cmd = DepositCommand.builder()
                .accountId(1L)
                .amount(new BigDecimal("50.00"))
                .currency("USD")
                .description("Illegal auditor deposit")
                .build();

        assertThrows(BusinessException.class, () ->
                accountTransactionService.deposit(cmd, auditorUser)
        );
    }

    // =========================================================================
    // 4. Account Ownership Validation
    // =========================================================================

    @Test
    @DisplayName("9. User cannot access or transacted on another user's account (403 Forbidden)")
    void testAccountOwnershipEnforcement() throws Exception {
        String userAlice = "alice_" + UUID.randomUUID().toString().substring(0, 8);
        String userBob = "bob_" + UUID.randomUUID().toString().substring(0, 8);

        User alice = createAccountHolderUser(userAlice);
        User bob = createAccountHolderUser(userBob);

        String aliceToken = loginAndGetToken(userAlice, "Password@123");
        String bobToken = loginAndGetToken(userBob, "Password@123");

        // Admin opens account for Alice ($200) and Bob ($300)
        AccountResponse aliceAcc = accountService.createAccount(
                CreateAccountRequest.builder().userId(alice.getId()).accountType(AccountType.SAVINGS).currency("USD").initialDeposit(new BigDecimal("200.00")).build(),
                adminUser
        );
        AccountResponse bobAcc = accountService.createAccount(
                CreateAccountRequest.builder().userId(bob.getId()).accountType(AccountType.CHECKING).currency("USD").initialDeposit(new BigDecimal("300.00")).build(),
                adminUser
        );

        // Bob attempts to view Alice's account -> 403 Forbidden
        mockMvc.perform(get("/api/v1/accounts/" + aliceAcc.getId())
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        // Bob attempts to view Alice's account statement -> 403 Forbidden
        mockMvc.perform(get("/api/v1/accounts/" + aliceAcc.getId() + "/statement")
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isForbidden());

        // Bob attempts to withdraw from Alice's account -> 403 Forbidden
        WithdrawalRequest withdrawReq = WithdrawalRequest.builder()
                .accountId(aliceAcc.getId())
                .amount(new BigDecimal("50.00"))
                .currency("USD")
                .build();

        mockMvc.perform(post("/api/v1/transactions/withdraw")
                        .header("Authorization", "Bearer " + bobToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(withdrawReq)))
                .andExpect(status().isForbidden());

        // Bob attempts to transfer FROM Alice's account to his own -> 403 Forbidden
        TransferRequest transferReq = TransferRequest.builder()
                .fromAccountId(aliceAcc.getId())
                .toAccountId(bobAcc.getId())
                .amount(new BigDecimal("50.00"))
                .currency("USD")
                .build();

        mockMvc.perform(post("/api/v1/transactions/transfer")
                        .header("Authorization", "Bearer " + bobToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(transferReq)))
                .andExpect(status().isForbidden());

        // Alice can access her own account -> 200 OK
        mockMvc.perform(get("/api/v1/accounts/" + aliceAcc.getId())
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(aliceAcc.getId()));
    }

    // =========================================================================
    // 5. Financial REST API & Idempotency Testing
    // =========================================================================

    @Test
    @DisplayName("10. Financial REST operations with Idempotency-Key support cached replay and reject altered payloads")
    void testFinancialApiWithIdempotency() throws Exception {
        String userName = "trader_" + UUID.randomUUID().toString().substring(0, 8);
        User trader = createAccountHolderUser(userName);
        String token = loginAndGetToken(userName, "Password@123");

        AccountResponse acc = accountService.createAccount(
                CreateAccountRequest.builder().userId(trader.getId()).accountType(AccountType.CHECKING).currency("USD").initialDeposit(new BigDecimal("100.00")).build(),
                adminUser
        );

        String idemKey = "api-idem-" + UUID.randomUUID();

        DepositRequest depositReq = DepositRequest.builder()
                .accountId(acc.getId())
                .amount(new BigDecimal("50.00"))
                .currency("USD")
                .description("API Idempotent Deposit")
                .build();

        // 1st Deposit call
        MvcResult firstResult = mockMvc.perform(post("/api/v1/transactions/deposit")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", idemKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(depositReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(50.0))
                .andReturn();

        String firstResponseStr = firstResult.getResponse().getContentAsString();

        // Immediate duplicate call with identical key & payload -> must return exact cached response
        MvcResult dupResult = mockMvc.perform(post("/api/v1/transactions/deposit")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", idemKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(depositReq)))
                .andExpect(status().isOk())
                .andReturn();

        assertEquals(firstResponseStr, dupResult.getResponse().getContentAsString(), "Duplicate call must return identical cached receipt");

        // Re-use same key with altered payload -> must be rejected with 422 Unprocessable Entity
        DepositRequest alteredReq = DepositRequest.builder()
                .accountId(acc.getId())
                .amount(new BigDecimal("100.00")) // altered from 50 to 100
                .currency("USD")
                .description("Altered Amount")
                .build();

        mockMvc.perform(post("/api/v1/transactions/deposit")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", idemKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(alteredReq)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422));

        // Verify balance reflects only $100 (initial) + $50 (first deposit) = $150
        AccountResponse currentAcc = accountService.getAccountById(acc.getId());
        assertEquals(new BigDecimal("150.0000"), currentAcc.getBalance());
    }

    // =========================================================================
    // 6. Auditor Read-Only Reporting & Global Reconciliation
    // =========================================================================

    @Test
    @DisplayName("11. Auditor successfully accesses global reconciliation, transaction journals, and audit logs")
    void testAuditorReadOperations() throws Exception {
        // Global reconciliation
        mockMvc.perform(get("/api/v1/auditor/reconciliation")
                        .header("Authorization", "Bearer " + auditorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("BALANCED"))
                .andExpect(jsonPath("$.globalZeroSumBalanced").value(true))
                .andExpect(jsonPath("$.discrepantAccountsCount").value(0));

        // Transactions list
        mockMvc.perform(get("/api/v1/auditor/transactions")
                        .header("Authorization", "Bearer " + auditorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // Audit logs list
        mockMvc.perform(get("/api/v1/auditor/audit-logs")
                        .header("Authorization", "Bearer " + auditorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}

