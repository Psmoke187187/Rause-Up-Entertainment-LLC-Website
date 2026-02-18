# Stripe integration — Raise Up Entertainment

This document shows two simple approaches to selling packs with Stripe.

Option A — Quick (Payment Links)
- Create a Product + Price in the Stripe Dashboard.
- Create a Payment Link for that Price (Dashboard → Payment Links).
- Copy the generated URL and paste it into the `data-stripe-url` attribute on the corresponding `.buyBtn` in `packs.html`.

Example (in `packs.html`):

```html
<button class="btn btn--primary buyBtn" data-stripe-url="https://buy.stripe.com/example_link">Buy & Download</button>
```

When your buyer completes payment they will be redirected to Stripe's success URL. Use the Payment Links `After successful payment` setting to redirect back to a thank-you page on your site where you can provide the download link.

Option B — Server-driven Checkout (recommended for secure fulfillment)
- Create Products/Prices in Stripe.
- Implement a small server endpoint that creates a Checkout Session via Stripe's server SDK and returns the session URL.
- The front-end `buyBtn` should POST the product id to that endpoint, receive the Checkout URL, then redirect the customer.
- On successful payment, use a webhook to verify the payment and then trigger delivery (generate a one-time download link, email the buyer, or mark an order fulfilled).

Minimal example server (Node/Express):

```js
// POST /create-checkout
const stripe = require('stripe')(process.env.STRIPE_SECRET);
app.post('/create-checkout', async (req, res) => {
  const { priceId } = req.body;
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: 'https://your-site.com/thank-you?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://your-site.com/packs.html',
  });
  res.json({ url: session.url });
});
```

Front-end (example): trigger the endpoint and redirect:

```js
fetch('/create-checkout', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ priceId: 'price_XXXXX' }) })
  .then(r => r.json()).then(j => window.location = j.url);
```

Security notes
- Never put your secret API keys in client-side code.
- Use webhooks to verify successful payments before granting permanent access to downloads.
- Consider creating expiring, single-use download URLs rather than exposing ZIPs directly in the repository.

If you want, I can:
- Add sample front-end JS to `packs.html` that calls `/create-checkout` when `.buyBtn` is clicked.
- Add a lightweight server example (Express or simple Cloud Function) and a script to generate expiring pre-signed links.
