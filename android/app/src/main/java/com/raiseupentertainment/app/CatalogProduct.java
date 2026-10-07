package com.raiseupentertainment.app;

import org.json.JSONObject;

public final class CatalogProduct {
    public final String id, title, type, description, previewUrl, playId, purchaseOptionId, agreementVersion;
    public final int fileCount;
    public CatalogProduct(JSONObject json) throws Exception {
        id = json.getString("id");
        title = json.getString("title");
        type = json.getString("type");
        description = json.optString("description", "");
        String preview = json.optString("previewUrl", "");
        previewUrl = ProductPolicy.allowedPreview(preview) ? preview : "";
        playId = json.optString("googlePlayProductId", "");
        purchaseOptionId = json.optString("googlePlayPurchaseOptionId", "buy");
        agreementVersion = json.optString("agreementVersion", "");
        fileCount = json.optInt("fileCount", 0);
        ProductPolicy.validateCatalogMetadata(id, title, type, description, playId, purchaseOptionId, agreementVersion, fileCount);
    }
}
