package com.raiseupentertainment.app;

import org.junit.Test;
import static org.junit.Assert.*;

public final class AccountPolicyTest {
    private static final String TOKEN = "A".repeat(40) + "." + "b".repeat(40);
    @Test public void verifiedUnexpiredSessionIsRequired() {
        assertTrue(AccountPolicy.validSession(true, TOKEN, "account_123", "buyer@example.com", 101, 100));
        assertFalse(AccountPolicy.validSession(false, TOKEN, "account_123", "buyer@example.com", 101, 100));
        assertFalse(AccountPolicy.validSession(true, TOKEN, "account_123", "buyer@example.com", 100, 100));
        assertFalse(AccountPolicy.validSession(true, TOKEN, "account_123", "buyer@example.com", 99, 100));
    }
    @Test public void serverTokensCannotInjectHeadersAndIdentityCannotBeBlank() {
        for (String token : new String[]{null, "short", TOKEN + "\r\nX-Injection: yes", TOKEN + " space", "a".repeat(8193)})
            assertFalse(AccountPolicy.validSession(true, token, "account_123", "buyer@example.com", 101, 100));
        for (String id : new String[]{null, "", "   ", "a\nother", "a".repeat(201)})
            assertFalse(AccountPolicy.validSession(true, TOKEN, id, "buyer@example.com", 101, 100));
        for (String email : new String[]{null, "not-an-email", "buyer@example.com\r\n", "a".repeat(250) + "@x.com"})
            assertFalse(AccountPolicy.validSession(true, TOKEN, "account_123", email, 101, 100));
    }
}
