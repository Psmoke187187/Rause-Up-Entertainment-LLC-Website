package com.raiseupentertainment.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import org.json.JSONObject;
import java.net.URL;
import java.net.URI;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.net.ssl.HttpsURLConnection;

public final class VerifiedDeliveryClient {
    public static final class Account {
        public final String token, id, email;
        public final long expiresAt;
        Account(JSONObject json) throws Exception {
            token = json.getString("accessToken"); id = json.getString("accountId"); email = json.getString("email"); expiresAt = json.getLong("expiresAt");
            if (!AccountPolicy.validSession(json.optBoolean("verified", false), token, id, email, expiresAt, System.currentTimeMillis() / 1000)) throw new IllegalArgumentException("Invalid account session");
        }
        JSONObject json() throws Exception { return new JSONObject().put("verified", true).put("accessToken", token).put("accountId", id).put("email", email).put("expiresAt", expiresAt); }
        public String obfuscatedId() { return ProductPolicy.sha256("raiseup-play-account-v1:" + id); }
        public boolean valid() { return AccountPolicy.validSession(true, token, id, email, expiresAt, System.currentTimeMillis() / 1000); }
    }
    private static final String KEY_ALIAS = "raiseup-delivery-session-v1";
    private final SharedPreferences preferences;
    public VerifiedDeliveryClient(Context context) { preferences = context.getSharedPreferences("private_delivery_session", Context.MODE_PRIVATE); }
    public boolean configured() {
        try {
            URI url = URI.create(BuildConfig.DELIVERY_API_ORIGIN);
            return BuildConfig.SERVER_VERIFICATION_READY && "https".equals(url.getScheme()) && url.getHost() != null && url.getUserInfo() == null &&
                url.getFragment() == null && url.getRawQuery() == null && (url.getPath().isEmpty()) && url.getPort() == -1;
        } catch (Exception error) { return false; }
    }
    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if (!store.containsAlias(KEY_ALIAS)) {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
            generator.generateKey();
        }
        return ((KeyStore.SecretKeyEntry) store.getEntry(KEY_ALIAS, null)).getSecretKey();
    }
    public Account account() {
        String encoded = preferences.getString("session", null), iv = preferences.getString("iv", null);
        if (encoded == null || iv == null) return null;
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
            return new Account(new JSONObject(new String(cipher.doFinal(Base64.decode(encoded, Base64.NO_WRAP)), StandardCharsets.UTF_8)));
        } catch (Exception error) { clear(); return null; }
    }
    public void clear() { preferences.edit().clear().apply(); }
    private void save(Account account) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key());
        byte[] encoded = cipher.doFinal(account.json().toString().getBytes(StandardCharsets.UTF_8));
        preferences.edit().putString("session", Base64.encodeToString(encoded, Base64.NO_WRAP)).putString("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)).apply();
    }
    public boolean serverReady() throws Exception {
        if (!configured()) return false;
        JSONObject status = request("GET", "/android/health", null, null);
        return status.optBoolean("googlePlayBillingReady", false) && BuildConfig.APPLICATION_ID.equals(status.optString("packageName"));
    }
    public String startEmail(String email, String legalName) throws Exception {
        return request("POST", "/android/accounts/email/start", new JSONObject().put("email", email).put("legalName", legalName), null).getString("challengeId");
    }
    public Account verifyEmail(String challenge, String code) throws Exception {
        Account account = new Account(request("POST", "/android/accounts/email/verify", new JSONObject().put("challengeId", challenge).put("code", code), null));
        save(account); return account;
    }
    public JSONObject createPurchaseIntent(String productId, String agreementVersion, Account account) throws Exception {
        if (account == null) throw new IllegalStateException("A verified account is required");
        return request("POST", "/android/checkouts", new JSONObject().put("productId", productId).put("agreementVersion", agreementVersion).put("termsAccepted", true), account);
    }
    public JSONObject verifyPurchase(String token, String productId, String agreementVersion, String checkoutIntent, Account account) throws Exception {
        if (account == null) throw new IllegalStateException("A verified account is required");
        return request("POST", "/android/purchases/verify", new JSONObject().put("packageName", BuildConfig.APPLICATION_ID).put("productId", productId)
            .put("purchaseToken", token).put("agreementVersion", agreementVersion).put("checkoutIntentId", checkoutIntent == null ? JSONObject.NULL : checkoutIntent), account);
    }
    public JSONObject library(Account account) throws Exception { return request("GET", "/android/library", null, account); }
    public void deleteAccount(Account account) throws Exception {
        if (account == null || !account.valid()) throw new IllegalStateException("Verify the delivery account first");
        JSONObject result = request("POST", "/android/accounts/delete", new JSONObject().put("deleteAccount", true), account);
        if (!result.optBoolean("deleted", false)) throw new IllegalStateException("Deletion was not confirmed");
        clear();
    }
    private JSONObject request(String method, String path, JSONObject body, Account account) throws Exception {
        if (!configured() || !path.matches("/android/[a-z/]+")) throw new IllegalStateException("Delivery service is not ready");
        if (account != null && !account.valid()) throw new IllegalStateException("Delivery account expired");
        HttpsURLConnection connection = (HttpsURLConnection) new URL(BuildConfig.DELIVERY_API_ORIGIN + path).openConnection();
        connection.setRequestMethod(method); connection.setConnectTimeout(15000); connection.setReadTimeout(15000); connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Accept", "application/json");
        if (account != null) connection.setRequestProperty("Authorization", "Bearer " + account.token);
        try {
            if (body != null) {
                byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
                connection.setDoOutput(true); connection.setRequestProperty("Content-Type", "application/json"); connection.setFixedLengthStreamingMode(bytes.length);
                try (OutputStream output = connection.getOutputStream()) { output.write(bytes); }
            }
            if (connection.getResponseCode() != 200) throw new IllegalStateException("Delivery service unavailable");
            try (InputStream input = connection.getInputStream()) { return new JSONObject(CatalogRepository.read(input)); }
        } finally { connection.disconnect(); }
    }
}
