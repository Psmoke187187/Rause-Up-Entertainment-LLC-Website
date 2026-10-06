package com.raiseupentertainment.app;

import org.junit.Test;
import static org.junit.Assert.*;

public final class ProductPolicyTest {
    @Test public void productIdsStayStableAndDifferentTypesCannotCollide() {
        String beat = ProductPolicy.stableProductId("beat", "club");
        assertEquals("rue_beat_cc2585df74ecdb8b43e3", beat);
        assertEquals(beat, ProductPolicy.stableProductId("beat", "club"));
        assertTrue(ProductPolicy.validProductId(beat));
        assertNotEquals(beat, ProductPolicy.stableProductId("pack", "club"));
        assertNotEquals(beat, ProductPolicy.stableProductId("beat", "dark-detroit"));
        for (String id : new String[]{"android.test.purchased", "UpperCase", "has-dash", "bad/id", "x".repeat(41), ""}) assertFalse(ProductPolicy.validProductId(id));
    }
    @Test public void malformedCatalogFieldsCannotEnablePurchases() {
        ProductPolicy.validateCatalogMetadata("club", "Club", "beat", "", "rue_beat_cc2585df74ecdb8b43e3", "buy", "standard-2026-10-04-v1", 1);
        ProductPolicy.validateCatalogMetadata("drums", "Drums", "pack", "", "rue_pack_1234", "buy", "pack-2026-10-04-v1", 200);
        for (String[] item : new String[][]{{"../club", "Club", "beat", "standard-v1"}, {"club", "Club\nforged", "beat", "standard-v1"},
            {"club", "Club", "apparel", "standard-v1"}, {"club", "Club", "beat", "pack-v1"}, {"drums", "Drums", "pack", "standard-v1"}}) {
            assertThrows(IllegalArgumentException.class, () -> ProductPolicy.validateCatalogMetadata(item[0], item[1], item[2], "", "", "buy", item[3], 1));
        }
        assertThrows(IllegalArgumentException.class, () -> ProductPolicy.validateCatalogMetadata("drums", "Drums", "pack", "", "", "buy", "pack-v1", -1));
        assertThrows(IllegalArgumentException.class, () -> ProductPolicy.validateCatalogMetadata("club", "Club", "beat", "", "", "../buy", "standard-v1", 1));
    }
    @Test public void previewUrlsCannotReachPaymentSitesMastersOrOffDomainHosts() {
        assertTrue(ProductPolicy.allowedPreview("https://raiseupentertainmentllc.com/assets/audio/previews/club-preview.mp3?v=ee213e5"));
        for (String url : new String[]{"https://checkout.stripe.com/x.mp3", "https://raiseupentertainmentllc.com.evil.example/assets/audio/previews/a.mp3",
            "https://raiseupentertainmentllc.com/masters/club.mp3", "http://raiseupentertainmentllc.com/assets/audio/previews/a.mp3",
            "https://user@raiseupentertainmentllc.com/assets/audio/previews/a.mp3", "https://raiseupentertainmentllc.com:443/assets/audio/previews/a.mp3",
            "https://raiseupentertainmentllc.com/assets/audio/previews/../a.mp3", "https://raiseupentertainmentllc.com/assets/audio/previews/a.mp3?redirect=https://checkout.stripe.com",
            "https://raiseupentertainmentllc.com/assets/audio/previews/a.mp3#fragment"}) assertFalse(ProductPolicy.allowedPreview(url));
    }
    @Test public void paymentRequiresEveryReleaseAndVerificationGate() {
        assertTrue(ProductPolicy.canPurchase(true, true, true, true, true));
        for (int missing = 0; missing < 5; missing++) {
            boolean[] gates = {true,true,true,true,true}; gates[missing] = false;
            assertFalse(ProductPolicy.canPurchase(gates[0],gates[1],gates[2],gates[3],gates[4]));
        }
    }
}
