package com.raiseupentertainment.app;

public final class PurchasePolicy {
    private PurchasePolicy() { }
    public enum Decision { WAIT_FOR_PAYMENT, NEEDS_SUPPORT, VERIFY_WITH_SERVER }
    public static Decision receipt(int state, int productCount, int quantity, String token) {
        // Google Play PurchaseState: UNSPECIFIED=0, PURCHASED=1, PENDING=2.
        if (productCount != 1 || quantity != 1 || token == null || token.isEmpty() || token.length() > 8192 ||
            token.matches("(?s).*[\\p{Cntrl}].*")) return Decision.NEEDS_SUPPORT;
        if (state == 2) return Decision.WAIT_FOR_PAYMENT;
        if (state != 1) return Decision.NEEDS_SUPPORT;
        return Decision.VERIFY_WITH_SERVER;
    }
    public static boolean verifiedResponse(boolean verified, String expectedProduct, String expectedVersion, String returnedProduct, String returnedVersion, String returnedOrder) {
        return verified && expectedProduct != null && expectedProduct.equals(returnedProduct) && expectedVersion != null && !expectedVersion.isEmpty() &&
            expectedVersion.equals(returnedVersion) && returnedOrder != null && returnedOrder.matches("[A-Za-z0-9_-]{8,200}");
    }
    public static boolean emailSent(boolean verifiedOrder, String state) { return verifiedOrder && "sent".equals(state); }
}
