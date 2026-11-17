package com.raiseupentertainment.app;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public final class ProductPolicy {
    private ProductPolicy() { }
    public static boolean validProductId(String id) {
        return id != null && id.length() <= 40 && id.matches("[a-z0-9][a-z0-9_.]*") && !id.startsWith("android.test");
    }
    public static String stableProductId(String type, String id) {
        if (!("beat".equals(type) || "pack".equals(type)) || id == null || !id.matches("[a-z0-9-]+")) throw new IllegalArgumentException("Invalid catalog product");
        return "rue_" + type + "_" + sha256(id).substring(0, 20);
    }
    public static void validateCatalogMetadata(String id, String title, String type, String description, String playId, String option, String version, int count) {
        if (id == null || id.length() > 120 || !id.matches("[a-z0-9-]+") || title == null || title.trim().isEmpty() || title.length() > 200 ||
            title.matches("(?s).*[\\p{Cntrl}].*") || !("beat".equals(type) || "pack".equals(type)) || description == null || description.length() > 5000 ||
            playId == null || (!playId.isEmpty() && !validProductId(playId)) || option == null || !option.matches("[a-z0-9][a-z0-9-]{0,62}") ||
            version == null || (!version.isEmpty() && !version.matches(("pack".equals(type) ? "pack-" : "standard-") + "[a-z0-9-]{1,100}")) || count < 0 || count > 1_000_000)
            throw new IllegalArgumentException("Invalid catalog product metadata");
    }
    public static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte b : digest) result.append(String.format(java.util.Locale.ROOT, "%02x", b & 255));
            return result.toString();
        } catch (Exception error) { throw new IllegalStateException(error); }
    }
    public static boolean allowedPreview(String value) {
        try {
            URI url = URI.create(value);
            return "https".equals(url.getScheme()) && "raiseupentertainmentllc.com".equals(url.getHost()) &&
                url.getPort() == -1 && url.getUserInfo() == null && url.getFragment() == null &&
                url.getPath().matches("/assets/audio/previews/[a-z0-9._-]+\\.mp3") &&
                (url.getRawQuery() == null || url.getRawQuery().matches("v=[a-f0-9]{1,64}"));
        } catch (Exception error) { return false; }
    }
    public static boolean canPurchase(boolean releaseEnabled, boolean serverVerified, boolean catalogEnabled, boolean productReady, boolean accountVerified) {
        return releaseEnabled && serverVerified && catalogEnabled && productReady && accountVerified;
    }
}
