package com.raiseupentertainment.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.EditText;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import com.android.billingclient.api.Purchase;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity implements BillingController.Listener {
    private static final int BG = Color.rgb(9, 9, 15), CARD = Color.rgb(24, 20, 32), GOLD = Color.rgb(245, 189, 73), MUTED = Color.rgb(205, 204, 217);
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Set<String> verifyingTokens = new HashSet<>();
    private final Map<String, String> checkoutIntents = new HashMap<>();
    private CatalogRepository.Snapshot catalog;
    private BillingController billing;
    private VerifiedDeliveryClient delivery;
    private VerifiedDeliveryClient.Account account;
    private PreviewPlayer player;
    private LinearLayout content;
    private TextView status, playerStatus;
    private EditText search;
    private Button playPause;
    private String section = "beat";
    private boolean serverReady, destroyed, onlineCatalog;
    private JSONArray library = new JSONArray();

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        delivery = new VerifiedDeliveryClient(this); account = delivery.account();
        buildScreen();
        player = new PreviewPlayer(this, (message, playing) -> { playerStatus.setText(message); playPause.setText(playing ? "Pause" : "Resume"); });
        billing = new BillingController(this, this);
        try { catalog = CatalogRepository.loadBundled(this); billing.setCatalog(catalog.products); render(); }
        catch (Exception error) { status("Catalog is being prepared. Please refresh when connected."); }
        billing.connect(); loadCatalog();
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private TextView text(String message, int size, int color) {
        TextView view = new TextView(this); view.setText(message); view.setTextSize(size); view.setTextColor(color); view.setPadding(0, dp(6), 0, dp(6)); return view;
    }
    private Button button(String title, Runnable action) {
        Button button = new Button(this); button.setText(title); button.setTextColor(GOLD); button.setAllCaps(false); button.setMinHeight(dp(48));
        button.setOnClickListener(view -> action.run()); return button;
    }
    private LinearLayout column() { LinearLayout layout = new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL); return layout; }
    private void buildScreen() {
        LinearLayout root = column(); root.setBackgroundColor(BG); root.setPadding(dp(20), dp(12), dp(20), dp(12));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int top, bottom;
            if (Build.VERSION.SDK_INT >= 30) { android.graphics.Insets system = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout()); top = system.top; bottom = system.bottom; }
            else { top = insets.getSystemWindowInsetTop(); bottom = insets.getSystemWindowInsetBottom(); }
            view.setPadding(dp(20), dp(12) + top, dp(20), dp(12) + bottom); return insets;
        });
        TextView brand = text("RAISE UP", 30, GOLD); brand.setTypeface(Typeface.DEFAULT, Typeface.BOLD); root.addView(brand);
        root.addView(text("ENTERTAINMENT LLC · raiseupentertainmentllc.com", 12, MUTED));
        HorizontalScrollView navigation = new HorizontalScrollView(this); navigation.setHorizontalScrollBarEnabled(false);
        LinearLayout row = new LinearLayout(this);
        row.addView(button("Beats", () -> select("beat"))); row.addView(button("Sound packs", () -> select("pack")));
        row.addView(button("My licenses", () -> { select("library"); restoreLibrary(); })); row.addView(button("Help", () -> select("help")));
        navigation.addView(row); root.addView(navigation);
        search = new EditText(this); search.setSingleLine(true); search.setHint("Search beats or sound packs"); search.setHintTextColor(MUTED); search.setTextColor(Color.WHITE);
        search.setInputType(InputType.TYPE_CLASS_TEXT); root.addView(search);
        search.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) { }
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) { render(); }
            @Override public void afterTextChanged(Editable s) { }
        });
        status = text("Loading catalog…", 13, GOLD); status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE); root.addView(status);
        ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true); content = column(); scroll.addView(content); root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        LinearLayout controls = new LinearLayout(this); controls.setGravity(Gravity.CENTER_VERTICAL);
        playPause = button("Resume", () -> { if (player != null) player.toggle(); }); controls.addView(playPause);
        controls.addView(button("Stop", () -> { if (player != null) player.stop(); })); root.addView(controls);
        playerStatus = text("Choose a preview", 13, MUTED); playerStatus.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE); root.addView(playerStatus);
        setContentView(root); root.requestApplyInsets();
    }
    private void select(String value) { section = value; search.setVisibility(value.equals("beat") || value.equals("pack") ? View.VISIBLE : View.GONE); render(); }
    private void loadCatalog() {
        status("Refreshing catalog…");
        io.execute(() -> {
            try {
                CatalogRepository.Snapshot loaded = CatalogRepository.loadRemote();
                boolean ready = delivery.serverReady();
                ui(() -> { catalog = loaded; onlineCatalog = true; serverReady = ready; billing.setCatalog(catalog.products); render();
                    status(purchasesOpen() ? "Google Play prices shown for available products." : "Purchases are being prepared. Browse the catalog and listen to previews."); });
            } catch (Exception error) { ui(() -> { onlineCatalog = false; serverReady = false; render(); status("Showing the saved catalog. Connect and refresh to check availability."); }); }
        });
    }
    private boolean purchasesOpen() { return BuildConfig.BILLING_RELEASE_ENABLED && BuildConfig.SERVER_VERIFICATION_READY && serverReady && onlineCatalog && catalog != null && catalog.billingEnabled; }
    private boolean canPurchase(CatalogProduct product) {
        return ProductPolicy.canPurchase(BuildConfig.BILLING_RELEASE_ENABLED, serverReady && BuildConfig.SERVER_VERIFICATION_READY,
            onlineCatalog && catalog != null && catalog.billingEnabled, billing != null && billing.isReady() && billing.offer(product) != null && !product.agreementVersion.isEmpty(), account != null && account.valid());
    }
    private void render() {
        if (content == null) return; content.removeAllViews();
        if (account != null && !account.valid()) { delivery.clear(); account = null; library = new JSONArray(); checkoutIntents.clear(); }
        if (section.equals("help")) { renderHelp(); return; }
        if (section.equals("library")) { renderLibrary(); return; }
        if (catalog == null) { content.addView(text("The catalog is unavailable. Please refresh.", 18, Color.WHITE)); return; }
        String query = search.getText().toString().toLowerCase(Locale.ROOT).trim(); int count = 0;
        for (CatalogProduct product : catalog.products) if (product.type.equals(section) && (product.title + " " + product.description).toLowerCase(Locale.ROOT).contains(query)) {
            count++; LinearLayout card = column(); card.setPadding(dp(16), dp(12), dp(16), dp(16));
            GradientDrawable background = new GradientDrawable(); background.setColor(CARD); background.setCornerRadius(dp(20)); background.setStroke(dp(1), Color.rgb(75, 57, 70)); card.setBackground(background);
            LinearLayout.LayoutParams spacing = new LinearLayout.LayoutParams(-1, -2); spacing.bottomMargin = dp(16); content.addView(card, spacing);
            TextView title = text(product.title, 22, Color.WHITE); title.setTypeface(Typeface.DEFAULT, Typeface.BOLD); card.addView(title);
            card.addView(text(product.type.equals("beat") ? "STANDARD BEAT LICENSE" : "SOUND PACK · " + product.fileCount + " sounds", 12, GOLD));
            if (!product.description.isEmpty()) card.addView(text(product.description, 14, MUTED));
            if (!product.previewUrl.isEmpty()) card.addView(button("Play preview", () -> player.play(product)));
            else card.addView(text("Preview being prepared", 13, MUTED));
            card.addView(button("Read license", () -> policy(product.type.equals("beat") ? "Standard beat license" : "Sound pack license", product.type.equals("beat") ? catalog.termsText : catalog.packTermsText)));
            String price = billing == null ? "Price unavailable" : billing.price(product);
            Button buy = button(canPurchase(product) ? "Buy · " + price : (purchasesOpen() && account == null ? "Verify delivery email to purchase" : "Purchase unavailable"), () -> beginPurchase(product));
            buy.setEnabled(canPurchase(product) || (purchasesOpen() && account == null)); card.addView(buy);
            if (purchasesOpen() && billing.offer(product) != null) card.addView(text("Google Play price: " + price, 13, MUTED));
        }
        if (count == 0) content.addView(text("No matching products.", 18, MUTED));
        content.addView(button("Refresh catalog", this::loadCatalog));
    }
    private void renderHelp() {
        content.addView(text("Raise Up Entertainment LLC", 24, Color.WHITE));
        content.addView(text("Original beats, producer sounds and support for your next release.", 16, MUTED));
        content.addView(button("Standard beat terms", () -> policy("Standard beat license", catalog == null ? NativePolicies.BEAT_TERMS : catalog.termsText)));
        content.addView(button("Sound pack terms", () -> policy("Sound pack license", catalog == null ? NativePolicies.PACK_TERMS : catalog.packTermsText)));
        content.addView(button("Privacy", () -> policy("Privacy", catalog == null ? NativePolicies.PRIVACY : catalog.privacyText)));
        content.addView(button("Contact Raise Up", this::contact));
        content.addView(button("Refresh catalog", this::loadCatalog));
        if (account != null) content.addView(button("Sign out of delivery account", () -> { delivery.clear(); account = null; library = new JSONArray(); checkoutIntents.clear(); render(); status("Signed out of the delivery account."); }));
        if (account != null) content.addView(button("Delete delivery account", this::deleteDeliveryAccount));
    }
    private void renderLibrary() {
        content.addView(text("My licenses", 24, Color.WHITE));
        content.addView(text("Restore purchases from the same Google Play account. A verified Raise Up delivery account is required before downloads can be issued.", 15, MUTED));
        content.addView(button("Restore Google Play purchases", () -> { billing.restore(); restoreLibrary(); }));
        if (account == null) content.addView(button("Verify delivery email", this::signIn));
        else content.addView(text("Delivery email: " + account.email, 14, GOLD));
        for (int i = 0; i < library.length(); i++) {
            JSONObject order = library.optJSONObject(i); if (order == null || !order.optBoolean("verified", false)) continue;
            content.addView(text(order.optString("title", "Purchased product"), 20, Color.WHITE));
            String deliveryState = order.optString("deliveryStatus");
            content.addView(text(("sent".equals(deliveryState) ? "Download links emailed" : "attention".equals(deliveryState) ? "Delivery needs support" : "Delivery is being prepared") + " · " + order.optString("agreementVersion", ""), 13, MUTED));
        }
        if (library.length() == 0) content.addView(text("Verified licenses will appear here when purchase delivery is available.", 15, MUTED));
    }
    private void policy(String title, String message) {
        ScrollView scroll = new ScrollView(this); TextView text = text(message, 16, Color.WHITE); text.setPadding(dp(20), dp(12), dp(20), dp(20)); scroll.addView(text);
        new AlertDialog.Builder(this).setTitle(title).setView(scroll).setPositiveButton("Close", null).show();
    }
    private void contact() {
        Intent intent = new Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:raiseupent.ru@gmail.com"));
        intent.putExtra(Intent.EXTRA_SUBJECT, "Raise Up app support");
        try { startActivity(intent); } catch (Exception error) { status("Email raiseupent.ru@gmail.com for support."); }
    }
    private void deleteDeliveryAccount() {
        if (account == null || !account.valid() || !serverReady || !delivery.configured()) { status("Account deletion is unavailable right now. Contact raiseupent.ru@gmail.com for help."); return; }
        VerifiedDeliveryClient.Account buyer = account;
        new AlertDialog.Builder(this).setTitle("Delete delivery account?")
            .setMessage("This deletes your delivery profile and signs you out. Private download links and this account's library access will be disabled. Keep any purchased files and licenses you have saved. Required transaction and license records may be retained for accounting, rights and disputes.")
            .setPositiveButton("Delete account", (dialog, which) -> {
                status("Deleting delivery account…"); io.execute(() -> {
                    try { delivery.deleteAccount(buyer); ui(() -> { if (account != null && account.id.equals(buyer.id)) { account = null; library = new JSONArray(); checkoutIntents.clear(); render(); status("Delivery account deleted. Required transaction records may be retained."); } }); }
                    catch (Exception error) { ui(() -> status("Account deletion was not confirmed. Try again or contact Raise Up.")); }
                });
            }).setNegativeButton("Cancel", null).show();
    }
    private void signIn() {
        if (!purchasesOpen()) { status("Delivery accounts and purchases are being prepared. No payment is taken."); return; }
        LinearLayout fields = column(); fields.setPadding(dp(20), 0, dp(20), 0);
        EditText email = new EditText(this); email.setHint("Your delivery email"); email.setSingleLine(); email.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS); fields.addView(email);
        EditText name = new EditText(this); name.setHint("Your legal name for the license"); name.setSingleLine(); fields.addView(name);
        fields.addView(text("We will send a verification code to this address. Your name and verified email identify the buyer on the license.", 14, MUTED));
        AlertDialog dialog = new AlertDialog.Builder(this).setTitle("Verify delivery email").setView(fields).setPositiveButton("Send code", null).setNegativeButton("Cancel", null).create();
        dialog.setOnShowListener(ignored -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(view -> {
            String address = email.getText().toString().trim(), legalName = name.getText().toString().trim();
            if (!android.util.Patterns.EMAIL_ADDRESS.matcher(address).matches() || legalName.length() < 2 || legalName.length() > 200 || legalName.matches(".*[\\p{Cntrl}].*")) { status("Enter a valid email and legal name."); return; }
            dialog.dismiss(); status("Sending verification code…"); io.execute(() -> {
                try { String challenge = delivery.startEmail(address, legalName); ui(() -> verifyCode(challenge)); }
                catch (Exception error) { ui(() -> status("Verification code could not be sent. Please try again later.")); }
            });
        })); dialog.show();
    }
    private void verifyCode(String challenge) {
        EditText code = new EditText(this); code.setHint("Code from your email"); code.setSingleLine(); code.setInputType(InputType.TYPE_CLASS_NUMBER);
        new AlertDialog.Builder(this).setTitle("Enter verification code").setView(code).setPositiveButton("Verify", (dialog, which) -> {
            String value = code.getText().toString().trim(); status("Verifying email…"); io.execute(() -> {
                try { VerifiedDeliveryClient.Account verified = delivery.verifyEmail(challenge, value); ui(() -> { account = verified; render(); status("Delivery email verified."); billing.restore(); restoreLibrary(); }); }
                catch (Exception error) { ui(() -> status("The code could not be verified. Start again to request a new code.")); }
            });
        }).setNegativeButton("Cancel", null).show();
    }
    private void beginPurchase(CatalogProduct product) {
        if (account == null || !account.valid()) { render(); signIn(); return; }
        if (!canPurchase(product)) { status("This purchase is unavailable right now. No payment is taken."); return; }
        VerifiedDeliveryClient.Account buyer = account;
        billing.preparePurchase(product, (details, offer) -> {
            if (account == null || !account.id.equals(buyer.id) || !canPurchase(product)) { status("Please review your purchase again."); return; }
            String terms = product.type.equals("beat") ? catalog.termsText : catalog.packTermsText;
            ScrollView scroll = new ScrollView(this); TextView copy = text(product.title + "\nGoogle Play price: " + offer.getFormattedPrice() + "\n\n" + terms + "\n\nDelivery email: " + buyer.email, 16, Color.WHITE); copy.setPadding(dp(20), 0, dp(20), dp(20)); scroll.addView(copy);
            new AlertDialog.Builder(this).setTitle("Review your license").setView(scroll).setPositiveButton("Agree and continue", (dialog, which) -> {
                if (account == null || !account.id.equals(buyer.id) || !canPurchase(product)) { status("Please review your purchase again."); return; }
                status("Checking product availability…"); io.execute(() -> {
                    try {
                        JSONObject intent = delivery.createPurchaseIntent(product.playId, product.agreementVersion, buyer);
                        if (!intent.optString("status").equals("ready") || !product.playId.equals(intent.optString("productId")) || !product.agreementVersion.equals(intent.optString("agreementVersion")) || !buyer.obfuscatedId().equals(intent.optString("obfuscatedAccountId"))) throw new IllegalStateException("Checkout not ready");
                        String id = intent.getString("checkoutIntentId");
                        if (!id.matches("[A-Za-z0-9_-]{8,200}")) throw new IllegalStateException("Invalid checkout intent");
                        String profileId = intent.getString("obfuscatedProfileId");
                        if (!ProductPolicy.sha256("raiseup-play-intent-v1:" + id).equals(profileId)) throw new IllegalStateException("Invalid checkout binding");
                        ui(() -> { if (account == null || !account.id.equals(buyer.id) || !canPurchase(product)) { status("Purchase unavailable. Please review it again."); return; }
                            checkoutIntents.put(product.playId, id); billing.launch(details, offer, buyer.obfuscatedId(), profileId); });
                    } catch (Exception error) { ui(() -> status("This product cannot be delivered right now. No payment was opened.")); }
                });
            }).setNegativeButton("Cancel", null).show();
        });
    }
    @Override public void purchase(Purchase purchase) {
        PurchasePolicy.Decision decision = PurchasePolicy.receipt(purchase.getPurchaseState(), purchase.getProducts().size(), purchase.getQuantity(), purchase.getPurchaseToken());
        boolean pending = decision == PurchasePolicy.Decision.WAIT_FOR_PAYMENT;
        if (!pending && decision != PurchasePolicy.Decision.VERIFY_WITH_SERVER) { status("This purchase needs support before delivery."); return; }
        String productId = purchase.getProducts().get(0); CatalogProduct product = findProduct(productId);
        if (product == null || account == null || !account.valid() || !serverReady || !delivery.configured()) { status("A Google Play purchase was found. Delivery verification is unavailable; no files have been unlocked. Contact Raise Up if payment completed."); return; }
        String token = purchase.getPurchaseToken(); if (!verifyingTokens.add(token)) return;
        VerifiedDeliveryClient.Account buyer = account; String intent = checkoutIntents.get(productId);
        status(pending ? "Payment is pending in Google Play. Registering it for delivery after payment completes…" : "Verifying your Google Play payment…");
        io.execute(() -> {
            try {
                JSONObject result = delivery.verifyPurchase(token, productId, product.agreementVersion, intent, buyer);
                if (!result.optBoolean("verified", false) && "pending".equals(result.optString("status")) && productId.equals(result.optString("productId"))) {
                    ui(() -> { verifyingTokens.remove(token); if (account != null && account.id.equals(buyer.id) && account.valid())
                        status("Payment is pending. Your matching files and license will be emailed after Google Play confirms payment."); });
                    return;
                }
                if (!PurchasePolicy.verifiedResponse(result.optBoolean("verified", false), productId, product.agreementVersion, result.optString("productId"), result.optString("agreementVersion"), result.optString("orderId"))) throw new IllegalStateException("Payment not verified");
                String deliveryState = result.optString("deliveryStatus");
                ui(() -> { verifyingTokens.remove(token); if (account == null || !account.id.equals(buyer.id) || !account.valid()) return;
                    status(PurchasePolicy.emailSent(true, deliveryState) ? "Verified purchase. Your matching product and license download links were emailed." : "Verified purchase. Your download email is being prepared; delivery has not been confirmed yet."); restoreLibrary(); });
            } catch (Exception error) { ui(() -> { verifyingTokens.remove(token); status("Payment verification or delivery is incomplete. Restore purchases to retry, or contact Raise Up. Files remain locked."); }); }
        });
        // The server verifies, persists delivery and acknowledges the purchase.
        // This app never acknowledges, consumes or grants files from a callback alone.
    }
    private CatalogProduct findProduct(String playId) { if (catalog != null) for (CatalogProduct product : catalog.products) if (product.playId.equals(playId)) return product; return null; }
    private void restoreLibrary() {
        if (account == null || !serverReady || !delivery.configured()) { if (section.equals("library")) status("License delivery is being prepared. Restore cannot issue downloads yet."); return; }
        VerifiedDeliveryClient.Account buyer = account; io.execute(() -> {
            try { JSONObject response = delivery.library(buyer); JSONArray orders = response.getJSONArray("orders"); ui(() -> { if (account != null && account.id.equals(buyer.id)) { library = orders; render(); } }); }
            catch (Exception error) { ui(() -> status("The license library could not refresh. Please try again.")); }
        });
    }
    @Override public void changed() { render(); }
    @Override public void status(String message) { if (status != null) status.setText(message); }
    private void ui(Runnable action) { runOnUiThread(() -> { if (!destroyed && !isFinishing()) action.run(); }); }
    @Override protected void onResume() { super.onResume(); if (billing != null && billing.isReady()) billing.restore(); }
    @Override protected void onPause() { if (player != null) player.stop(); super.onPause(); }
    @Override protected void onDestroy() { destroyed = true; if (player != null) player.stop(); if (billing != null) billing.close(); io.shutdownNow(); super.onDestroy(); }
}
