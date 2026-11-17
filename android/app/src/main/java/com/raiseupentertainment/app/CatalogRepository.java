package com.raiseupentertainment.app;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import javax.net.ssl.HttpsURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public final class CatalogRepository {
    public static final String CATALOG_URL = "https://raiseupentertainmentllc.com/data/android-catalog.json";
    public static final class Snapshot {
        public final List<CatalogProduct> products;
        public final boolean billingEnabled;
        public final String termsText, packTermsText, privacyText;
        Snapshot(JSONObject json, boolean online) throws Exception {
            if (json.getInt("schemaVersion") != 1 || !BuildConfig.APPLICATION_ID.equals(json.getString("packageName"))) throw new IllegalArgumentException("Unsupported catalog");
            products = new ArrayList<>();
            HashSet<String> ids = new HashSet<>(), playIds = new HashSet<>();
            JSONArray items = json.getJSONArray("products");
            if (items.length() > 1000) throw new IllegalArgumentException("Catalog too large");
            for (int i = 0; i < items.length(); i++) {
                CatalogProduct product = new CatalogProduct(items.getJSONObject(i));
                if (!ids.add(product.id) || (!product.playId.isEmpty() && !playIds.add(product.playId))) throw new IllegalArgumentException("Duplicate product mapping");
                products.add(product);
            }
            billingEnabled = online && json.optBoolean("billingEnabled", false);
            termsText = json.optString("termsText", NativePolicies.BEAT_TERMS);
            packTermsText = json.optString("packTermsText", NativePolicies.PACK_TERMS);
            privacyText = json.optString("privacyText", NativePolicies.PRIVACY);
            if (termsText.length() > 100000 || packTermsText.length() > 100000 || privacyText.length() > 100000) throw new IllegalArgumentException("Policy too large");
        }
    }
    public static Snapshot loadRemote() throws Exception {
        HttpsURLConnection connection = (HttpsURLConnection) new URL(CATALOG_URL).openConnection();
        connection.setConnectTimeout(15000); connection.setReadTimeout(15000);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Accept", "application/json");
        try {
            if (connection.getResponseCode() != 200) throw new IllegalStateException("Catalog unavailable");
            try (InputStream stream = connection.getInputStream()) { return new Snapshot(new JSONObject(read(stream)), true); }
        } finally { connection.disconnect(); }
    }
    public static Snapshot loadBundled(Context context) throws Exception {
        try (InputStream stream = context.getAssets().open("android-catalog.json")) { return new Snapshot(new JSONObject(read(stream)), false); }
    }
    static String read(InputStream input) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192]; int count;
        while ((count = input.read(buffer)) != -1) {
            if (bytes.size() + count > 2_000_000) throw new IllegalArgumentException("Response too large");
            bytes.write(buffer, 0, count);
        }
        return bytes.toString(StandardCharsets.UTF_8.name());
    }
}
