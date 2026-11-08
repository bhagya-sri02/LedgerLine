package com.ledgerline.api.controller;

import com.ledgerline.domain.auth.dto.AuthResponse;
import com.ledgerline.domain.auth.dto.LoginRequest;
import com.ledgerline.domain.auth.dto.RegisterRequest;
import com.ledgerline.domain.auth.dto.UserProfileDto;
import com.ledgerline.domain.auth.service.AuthService;
import com.ledgerline.infrastructure.security.userdetails.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserProfileDto> register(@Valid @RequestBody RegisterRequest request) {
        UserProfileDto created = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        UserProfileDto profile = authService.getCurrentUserProfile(principal);
        return ResponseEntity.ok(profile);
    }
}

