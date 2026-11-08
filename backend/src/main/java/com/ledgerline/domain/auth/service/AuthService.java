package com.ledgerline.domain.auth.service;

import com.ledgerline.common.exception.BusinessException;
import com.ledgerline.common.exception.UserAlreadyExistsException;
import com.ledgerline.domain.audit.service.AuditService;
import com.ledgerline.domain.auth.dto.AuthResponse;
import com.ledgerline.domain.auth.dto.LoginRequest;
import com.ledgerline.domain.auth.dto.RegisterRequest;
import com.ledgerline.domain.auth.dto.UserProfileDto;
import com.ledgerline.domain.auth.entity.Role;
import com.ledgerline.domain.auth.entity.RoleName;
import com.ledgerline.domain.auth.entity.User;
import com.ledgerline.domain.auth.entity.UserStatus;
import com.ledgerline.domain.auth.repository.RoleRepository;
import com.ledgerline.domain.auth.repository.UserRepository;
import com.ledgerline.infrastructure.security.jwt.JwtTokenProvider;
import com.ledgerline.infrastructure.security.userdetails.UserPrincipal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final AuditService auditService;

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtTokenProvider tokenProvider,
            AuditService auditService
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.auditService = auditService;
    }

    @Transactional
    public UserProfileDto register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new UserAlreadyExistsException("Username '" + request.getUsername() + "' is already taken.");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("Email '" + request.getEmail() + "' is already registered.");
        }

        RoleName resolvedRole = RoleName.ROLE_ACCOUNT_HOLDER;
        if (request.getRole() != null && !request.getRole().trim().isEmpty()) {
            try {
                resolvedRole = RoleName.valueOf(request.getRole().trim());
            } catch (IllegalArgumentException ex) {
                throw new BusinessException("Invalid role specified: " + request.getRole());
            }
        }
        final RoleName targetRoleName = resolvedRole;

        Role role = roleRepository.findByName(targetRoleName)
                .orElseThrow(() -> new BusinessException("Role not found in database: " + targetRoleName));

        Set<Role> roles = new HashSet<>();
        roles.add(role);

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .status(UserStatus.ACTIVE)
                .roles(roles)
                .build();

        User savedUser = userRepository.save(user);

        auditService.recordAudit(
                savedUser,
                "USER_REGISTER",
                "User",
                savedUser.getId().toString(),
                java.util.Map.of("role", targetRoleName.name())
        );

        return mapToUserProfileDto(savedUser);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String jwt = tokenProvider.generateToken(authentication);
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

        List<String> roles = userPrincipal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        userRepository.findById(userPrincipal.getId()).ifPresent(u ->
                auditService.recordAudit(
                        u,
                        "USER_LOGIN",
                        "User",
                        u.getId().toString(),
                        java.util.Map.of("username", u.getUsername())
                )
        );

        return AuthResponse.builder()
                .token(jwt)
                .tokenType("Bearer")
                .expiresIn(tokenProvider.getExpirationMs())
                .userId(userPrincipal.getId())
                .username(userPrincipal.getUsername())
                .email(userPrincipal.getEmail())
                .roles(roles)
                .build();
    }

    @Transactional(readOnly = true)
    public UserProfileDto getCurrentUserProfile(UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new BusinessException("User not found with ID: " + principal.getId()));
        return mapToUserProfileDto(user);
    }

    @Transactional(readOnly = true)
    public List<UserProfileDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToUserProfileDto)
                .collect(Collectors.toList());
    }

    public UserProfileDto mapToUserProfileDto(User user) {
        List<String> roleNames = user.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toList());

        return UserProfileDto.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .status(user.getStatus().name())
                .roles(roleNames)
                .createdAt(user.getCreatedAt())
                .build();
    }
}
