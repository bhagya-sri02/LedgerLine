package com.ledgerline.infrastructure.init;

import com.ledgerline.domain.auth.entity.Role;
import com.ledgerline.domain.auth.entity.RoleName;
import com.ledgerline.domain.auth.entity.User;
import com.ledgerline.domain.auth.entity.UserStatus;
import com.ledgerline.domain.auth.repository.RoleRepository;
import com.ledgerline.domain.auth.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Slf4j
@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        initUserIfAbsent("admin", "admin@ledgerline.com", "Admin@123456", RoleName.ROLE_ADMIN);
        initUserIfAbsent("auditor", "auditor@ledgerline.com", "Auditor@123456", RoleName.ROLE_AUDITOR);
        initUserIfAbsent("john_doe", "john@ledgerline.com", "User@123456", RoleName.ROLE_ACCOUNT_HOLDER);
    }

    private void initUserIfAbsent(String username, String email, String rawPassword, RoleName roleName) {
        if (!userRepository.existsByUsername(username)) {
            Role role = roleRepository.findByName(roleName).orElse(null);
            if (role == null) {
                log.warn("Role {} not yet present in database; skipping initialization for {}", roleName, username);
                return;
            }

            User user = User.builder()
                    .username(username)
                    .email(email)
                    .passwordHash(passwordEncoder.encode(rawPassword))
                    .status(UserStatus.ACTIVE)
                    .roles(Set.of(role))
                    .build();

            userRepository.save(user);
            log.info("Initialized default {} user: {}", roleName, username);
        }
    }
}

