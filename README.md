# Raise Up Entertainment LLC Beat Store

Professional BeatStars-style front end for Raise Up Entertainment LLC.

## Features
- Playable beat preview
- Sticky audio player
- Stripe checkout buttons
- Basic, Premium, and Exclusive license tiers
- Mobile-friendly music-brand design
- Sound packs and licensing pages
- Success page for purchase flow

## Stripe
Project K payment links are wired into `scripts/store.js`.

## Fulfillment
Stripe Payment Links can send receipts/invoices. Full automated download emails require a server/backend. See `api/stripe-webhook.example.js` for the Node/Vercel webhook template.
