package com.raiseupentertainment.app;

import org.junit.Test;
import static org.junit.Assert.*;

public final class PurchasePolicyTest {
    @Test public void validPendingReceiptsAreTrackedWithoutGrantingAccess() {
        assertEquals(PurchasePolicy.Decision.WAIT_FOR_PAYMENT, PurchasePolicy.receipt(2, 1, 1, "token"));
        assertEquals(PurchasePolicy.Decision.VERIFY_WITH_SERVER, PurchasePolicy.receipt(1, 1, 1, "token"));
        assertEquals(PurchasePolicy.Decision.NEEDS_SUPPORT, PurchasePolicy.receipt(0, 1, 1, "token"));
        assertEquals(PurchasePolicy.Decision.NEEDS_SUPPORT, PurchasePolicy.receipt(1, 2, 1, "token"));
        assertEquals(PurchasePolicy.Decision.NEEDS_SUPPORT, PurchasePolicy.receipt(1, 1, 2, "token"));
        assertEquals(PurchasePolicy.Decision.NEEDS_SUPPORT, PurchasePolicy.receipt(1, 1, 1, ""));
        assertEquals(PurchasePolicy.Decision.NEEDS_SUPPORT, PurchasePolicy.receipt(1, 1, 1, "token\n"));
        assertEquals(PurchasePolicy.Decision.NEEDS_SUPPORT, PurchasePolicy.receipt(2, 0, 1, "token"));
        assertEquals(PurchasePolicy.Decision.NEEDS_SUPPORT, PurchasePolicy.receipt(2, 1, 2, "token"));
        assertEquals(PurchasePolicy.Decision.NEEDS_SUPPORT, PurchasePolicy.receipt(2, 1, 1, ""));
    }
    @Test public void verifiedOrderMustMatchProductAndLicenseExactly() {
        assertTrue(PurchasePolicy.verifiedResponse(true, "product", "standard-v1", "product", "standard-v1", "order_123"));
        assertFalse(PurchasePolicy.verifiedResponse(false, "product", "standard-v1", "product", "standard-v1", "order_123"));
        assertFalse(PurchasePolicy.verifiedResponse(true, "product", "standard-v1", "other-product", "standard-v1", "order_123"));
        assertFalse(PurchasePolicy.verifiedResponse(true, "product", "standard-v1", "product", "standard-v2", "order_123"));
        assertFalse(PurchasePolicy.verifiedResponse(true, "product", "standard-v1", "product", "standard-v1", ""));
    }
    @Test public void queuedOrFailedEmailNeverClaimsDelivery() {
        assertTrue(PurchasePolicy.emailSent(true, "sent"));
        assertFalse(PurchasePolicy.emailSent(false, "sent"));
        for (String state : new String[]{null, "", "queued", "failed", "pending"}) assertFalse(PurchasePolicy.emailSent(true, state));
    }
}
