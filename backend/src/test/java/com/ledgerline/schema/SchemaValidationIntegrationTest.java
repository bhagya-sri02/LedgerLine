package com.ledgerline.schema;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class SchemaValidationIntegrationTest {

    @Autowired
    private DataSource dataSource;

    @Test
    @DisplayName("Verify Hibernate ddl-auto=validate succeeds and all expected tables exist")
    void verifySchemaValidationAndTables() throws Exception {
        assertNotNull(dataSource, "DataSource must not be null");

        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            Set<String> tableNames = new HashSet<>();
            try (ResultSet rs = metaData.getTables(connection.getCatalog(), null, "%", new String[]{"TABLE"})) {
                while (rs.next()) {
                    tableNames.add(rs.getString("TABLE_NAME").toLowerCase());
                }
            }

            assertTrue(tableNames.contains("users"), "Table 'users' must exist");
            assertTrue(tableNames.contains("roles"), "Table 'roles' must exist");
            assertTrue(tableNames.contains("user_roles"), "Table 'user_roles' must exist");
            assertTrue(tableNames.contains("accounts"), "Table 'accounts' must exist");
            assertTrue(tableNames.contains("journal_transactions"), "Table 'journal_transactions' must exist");
            assertTrue(tableNames.contains("ledger_entries"), "Table 'ledger_entries' must exist");
            assertTrue(tableNames.contains("idempotency_records"), "Table 'idempotency_records' must exist");
            assertTrue(tableNames.contains("audit_logs"), "Table 'audit_logs' must exist");
        }
    }
}

