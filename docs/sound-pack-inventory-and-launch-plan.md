# Raise Up Entertainment LLC — Sound-Pack Inventory and Storefront Migration

Audit date: November 12, 2026. Prepared from the current Raise Up Entertainment Google Drive and connected GitHub/Stripe listing metadata.

## What these counts mean

- **Source audio-file count:** Files with .wav, .mp3, .aif, .aiff, .flac, or .ogg extensions within each corresponding Google Drive product folder and its enumerated subfolders. Counts exclude MIDI, FL Studio projects, sampler programs, images, archives, and other non-audio files. The 30 packs contain **9,058 source audio-file entries in total**. This is not a guarantee of distinct waveforms or 9,058 non-overlapping sounds; a sound can be repeated in different products.
- **Not yet verified:** The exact contents of a deliverable ZIP, audio decoding, silence/corrupt files, sonic duplicate removal, and rights to sell/relicense the files. No customer download count has been certified.
- **Preview count is separate:** The website has 20 playable previews for five packs as of this review. Other packs still have fewer previews.
- **Live checkout:** The existing website lists $6.99 per pack; spot-checked Stripe Payment Links also charge $6.99. Do not display a new individual pack price as active until the corresponding Stripe link and delivery files are ready.

## Existing 30 product folders

| Pack | Source audio files | Proposed tier from count alone | Rights cleared? | Customer ZIP verified? |
|---|---:|---|---|---|
| Snares Kit 1 (`pack-snares-kit-1`) | 93 | Standard — $6.99 | Not confirmed | No |
| Techno Sound Pack (`pack-techno`) | 110 | Pro — $9.99 | Not confirmed | No |
| Drum and Bass Sound Pack (`pack-drum-bass`) | 85 | Standard — $6.99 | Not confirmed | No |
| MPC60 Drum Collection (`pack-mpc60`) | 533 | Ultimate — $14.99+ | Not confirmed | No |
| MPC3000 Synth Drums (`pack-mpc3000-synth`) | 776 | Ultimate — $14.99+ | Not confirmed | No |
| MPC3000 Percussion (`pack-mpc3000-percussion`) | 250 | Ultimate — $14.99+ | Not confirmed | No |
| MPC3000 Natural Drums (`pack-mpc3000-natural`) | 472 | Ultimate — $14.99+ | Not confirmed | No |
| MPC2000XL Dry Drums (`pack-mpc2000xl-dry`) | 67 | Standard — $6.99 | Not confirmed | No |
| Mini Moog Instrument Samples (`pack-mini-moog`) | 115 | Pro — $9.99 | Not confirmed | No |
| ARP Odyssey Instrument Samples (`pack-arp-odyssey`) | 90 | Standard — $6.99 | Not confirmed | No |
| Wurlitzer Electric Piano Samples (`pack-wurlitzer`) | 51 | Standard — $6.99 | Not confirmed | No |
| Electric Piano Samples (`pack-electric-piano`) | 71 | Standard — $6.99 | Not confirmed | No |
| Delicate Guitar Samples (`pack-delicate-guitar`) | 92 | Standard — $6.99 | Not confirmed | No |
| Grand Piano Off Mic Samples (`pack-grand-piano`) | 146 | Pro — $9.99 | Not confirmed | No |
| Electric Bass Samples (`pack-electric-bass`) | 103 | Pro — $9.99 | Not confirmed | No |
| TM88 (Shows the Screen) Drumkit (`pack-tm88`) | 522 | Ultimate — $14.99+ | Not confirmed | No |
| UK Drill Drum Kit (`pack-uk-drill`) | 104 | Pro — $9.99 | Not confirmed | No |
| The Lunch77 Metro Boomin Drumkit (`pack-metro-boomin`) | 2,184 | Ultimate — $14.99+ | Not confirmed | No |
| The Lunch77 F1lthy Drumkit (`pack-f1lthy`) | 338 | Ultimate — $14.99+ | Not confirmed | No |
| Nick Mira (Shows the Screen) Drumkit (`pack-nick-mira-drums`) | 1,003 | Ultimate — $14.99+ | Not confirmed | No |
| Ultimate NY Drill Kit (`pack-ny-drill`) | 261 | Ultimate — $14.99+ | Not confirmed | No |
| The Mira Touch Kit Vol. 1 (`pack-mira-touch-vol1`) | 181 | Pro — $9.99 | Not confirmed | No |
| Kenny Beats (Shows the Screen) Drumkit (`pack-kenny-beats`) | 609 | Ultimate — $14.99+ | Not confirmed | No |
| Nick Mira Bakesale Melody Pack (`pack-bakesale`) | 51 | Standard — $6.99 | Not confirmed | No |
| MIRATOUCH Big Bad Bundle (`pack-big-bad`) | 77 | Standard — $6.99 | Not confirmed | No |
| Kidnxtdoor Neutron (`pack-neutron`) | 100 | Pro — $9.99 | Not confirmed | No |
| Keyscape and Omnisphere Sample Collection (`pack-keyboard-synth`) | 418 | Ultimate — $14.99+ | Not confirmed | No |
| All Shiloh Samples (`pack-shiloh`) | 20 | Starter — $3.99 | Not confirmed | No |
| BUENO Sample Pack (Demo) (`pack-bueno-demo`) | 20 | Starter — $3.99 | Not confirmed | No |
| David Samples Vol. 1 (`pack-david-vol1`) | 116 | Pro — $9.99 | Not confirmed | No |

**Tier totals from source counts:** Starter 2, Standard 9, Pro 8, Ultimate 11. These are *planning tiers only*, not new active prices or proof of commercially redistributable material.

## Proposed storefront offers

- Starter: 20–49 *licensed, playable, unique, deliverable* audio sounds for $3.99; limited promotion $2.99.
- Standard: 50–99 sounds for $6.99 (target about 60 sounds per pack).
- Pro: 100–199 sounds for $9.99.
- Ultimate: 200+ sounds for $14.99 or higher according to curation and value.
- Bundle inquiry: 3 Standard packs for proposed $17.99; 5 Standard packs for proposed $27.99. Existing site offers request by email only. Do not collect payment for a bundle until ZIP contents, rights, delivery, Stripe price/link, and any tax requirements are configured.

## New uploads found

1. **LOOPS DRUMS SAMPLES**: Contains copied/nested drum kits, loop folders, Third-party branded sample libraries, and ZIP archives. Do not resell them before confirming author rights. Sample-count inventory and duplicate check of its full sub-tree are not complete.
2. **The Lunch77 Boominati Drumkit-011**: Root has one inner drum kit folder with category folders. At audit time, most categories were empty, one clap WAV was found, and the remaining nested bonus folders checked were empty. It is incomplete and is *not* an active store product.

## Licensing and delivery gates

- **Stop before reselling third-party libraries.** Worldwide Studios's publicly stated sound license prohibits resale/redistribution of individual sounds or compiling them into competing sample packs without explicit permission: https://enterworld.one/pages/license. Some current Raise Up listings use Lunch77 names; obtain express redistribution authorization, or replace them with newly created/original/licensed-for-resale audio. Owning or downloading a kit is not proof of sublicensing rights.
- Review other branded kits and sampled instrument libraries for the same risk; record the specific resale agreement per product. Artist and producer references should not imply endorsements.
- Generate each downloadable ZIP from an approved set of audio files, deduplicate by audio hash/inspection and verify that the exact file count equals the product page count. Test the download using a buyer email in a safe workflow.
- Confirm whether Stripe Tax/sales tax applies before creating or changing live payment links. Create new tier prices and new bundle links only when matching ZIPs and delivery are ready, then switch site buttons and read back from Stripe.

## Repository work completed

- Added source-count audit as `scripts/pack-inventory.js` (source counts only; no delivery claims).
- Added pricing tier presentation to `packs.html`, with explicit coming-soon/not-active messaging.
- Added bundle request selector as `scripts/pack-bundles.js`, emailing selected packs for review without taking payment.
- Preserved existing Stripe checkout links and pricing until verified products and new links are available.

## Remaining launch checklist

- [ ] Rights confirmations for every kit, especially Lunch77/other branded or sampled instruments
- [ ] Validate audio decode, distinctness, clipping/silence and sample quality
- [ ] Assemble and test actual paid customer ZIPs with immutable file manifests
- [ ] Agree Stripe Tax handling; create/verify new tier and bundle Payment Links
- [ ] Expand 20 playable previews to remaining 25 packs as appropriate
- [ ] Activate matching per-pack prices, bundle links, digital delivery and end-to-end test purchases
- [ ] Visual/functional test on the public mobile and desktop site
