package com.raiseupentertainment.app;

import android.app.Activity;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class BillingController {
    public interface Listener {
        void changed();
        void status(String message);
        void purchase(Purchase purchase);
    }
    public interface ReadyPurchase { void ready(ProductDetails details, ProductDetails.OneTimePurchaseOfferDetails offer); }
    private final Activity activity;
    private final Listener listener;
    private final BillingClient billing;
    private final Map<String, ProductDetails> details = new HashMap<>();
    private List<CatalogProduct> catalog = Collections.emptyList();
    private boolean closed;
    public BillingController(Activity activity, Listener listener) {
        this.activity = activity; this.listener = listener;
        billing = BillingClient.newBuilder(activity)
            .setListener((result, purchases) -> onUi(() -> {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) for (Purchase purchase : purchases) listener.purchase(purchase);
                else if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) listener.status("Purchase canceled.");
                else if (result.getResponseCode() == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) { listener.status("This product is already owned. Checking your purchases."); restore(); }
                else listener.status("Google Play could not complete the purchase. Please try again later.");
            }))
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection().build();
    }
    private void onUi(Runnable action) { activity.runOnUiThread(() -> { if (!closed && !activity.isFinishing()) action.run(); }); }
    public void connect() {
        billing.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) { onUi(() -> {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) { refresh(); restore(); }
                else { listener.status("Google Play purchases are unavailable on this device right now."); listener.changed(); }
            }); }
            @Override public void onBillingServiceDisconnected() { onUi(() -> { listener.status("Google Play disconnected. Purchases will reconnect when available."); listener.changed(); }); }
        });
    }
    public void setCatalog(List<CatalogProduct> products) { catalog = new ArrayList<>(products); if (billing.isReady()) refresh(); }
    public boolean isReady() { return !closed && billing.isReady(); }
    public ProductDetails.OneTimePurchaseOfferDetails offer(CatalogProduct product) { return chooseOffer(details.get(product.playId), product.purchaseOptionId); }
    public String price(CatalogProduct product) {
        ProductDetails.OneTimePurchaseOfferDetails offer = offer(product);
        return offer == null ? "Price unavailable" : offer.getFormattedPrice();
    }
    private static ProductDetails.OneTimePurchaseOfferDetails chooseOffer(ProductDetails details, String expectedOption) {
        if (details == null || !BillingClient.ProductType.INAPP.equals(details.getProductType())) return null;
        List<ProductDetails.OneTimePurchaseOfferDetails> offers = details.getOneTimePurchaseOfferDetailsList();
        if (offers == null || offers.isEmpty()) {
            ProductDetails.OneTimePurchaseOfferDetails single = details.getOneTimePurchaseOfferDetails();
            offers = single == null ? Collections.emptyList() : Collections.singletonList(single);
        }
        for (ProductDetails.OneTimePurchaseOfferDetails offer : offers) {
            String option = offer.getPurchaseOptionId();
            boolean optionMatches = expectedOption.equals(option) || ((option == null || option.isEmpty()) && "buy".equals(expectedOption));
            if (optionMatches && offer.getRentalDetails() == null && offer.getPreorderDetails() == null && offer.getPriceAmountMicros() > 0) return offer;
        }
        return null;
    }
    public void refresh() {
        if (!isReady()) return;
        details.clear();
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (CatalogProduct product : catalog) if (!product.playId.isEmpty()) products.add(QueryProductDetailsParams.Product.newBuilder().setProductId(product.playId).setProductType(BillingClient.ProductType.INAPP).build());
        for (int start = 0; start < products.size(); start += 20) {
            List<QueryProductDetailsParams.Product> batch = new ArrayList<>(products.subList(start, Math.min(start + 20, products.size())));
            billing.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(batch).build(), (result, queried) -> onUi(() -> {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) for (ProductDetails item : queried.getProductDetailsList()) details.put(item.getProductId(), item);
                listener.changed();
            }));
        }
        listener.changed();
    }
    public void preparePurchase(CatalogProduct product, ReadyPurchase ready) {
        if (!isReady() || product.playId.isEmpty()) { listener.status("This purchase is unavailable right now."); return; }
        QueryProductDetailsParams.Product item = QueryProductDetailsParams.Product.newBuilder().setProductId(product.playId).setProductType(BillingClient.ProductType.INAPP).build();
        billing.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(item)).build(), (result, queried) -> onUi(() -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || queried.getProductDetailsList().size() != 1) { listener.status("Google Play has no available offer for this product in your account or country."); return; }
            ProductDetails current = queried.getProductDetailsList().get(0);
            ProductDetails.OneTimePurchaseOfferDetails selected = chooseOffer(current, product.purchaseOptionId);
            if (!product.playId.equals(current.getProductId()) || selected == null) { listener.status("This purchase offer is unavailable."); return; }
            ready.ready(current, selected);
        }));
    }
    public void launch(ProductDetails current, ProductDetails.OneTimePurchaseOfferDetails offer, String obfuscatedAccountId, String obfuscatedProfileId) {
        if (!isReady()) { listener.status("Google Play is unavailable. Please try again."); return; }
        BillingFlowParams.ProductDetailsParams.Builder product = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(current);
        String token = offer.getOfferToken();
        if (token != null && !token.isEmpty()) product.setOfferToken(token);
        BillingFlowParams flow = BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(product.build()))
            .setObfuscatedAccountId(obfuscatedAccountId).setObfuscatedProfileId(obfuscatedProfileId).build();
        BillingResult result = billing.launchBillingFlow(activity, flow);
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) listener.status("Google Play could not open the purchase confirmation.");
    }
    public void restore() {
        if (!isReady()) return;
        billing.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(), (result, purchases) -> onUi(() -> {
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                for (Purchase purchase : purchases) listener.purchase(purchase);
                if (purchases.isEmpty()) listener.status("No active Google Play purchases were found for this account.");
            } else listener.status("Google Play could not restore purchases. Please try again.");
        }));
    }
    public void close() { closed = true; billing.endConnection(); details.clear(); }
}
