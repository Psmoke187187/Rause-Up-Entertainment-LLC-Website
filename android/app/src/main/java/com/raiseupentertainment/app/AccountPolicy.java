package com.raiseupentertainment.app;

public final class AccountPolicy {
    private AccountPolicy() { }
    public static boolean validSession(boolean verified, String token, String id, String email, long expiresAt, long now) {
        return verified && token != null && token.length() >= 32 && token.length() <= 8192 && token.matches("[A-Za-z0-9._~+/-]+=*") &&
            id != null && !id.trim().isEmpty() && id.length() <= 200 && !id.matches("(?s).*[\\p{Cntrl}].*") &&
            email != null && email.length() <= 254 && email.matches("[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}") && expiresAt > now;
    }
}
