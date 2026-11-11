# Raise Up Entertainment website

Production: https://raiseupentertainmentllc.com

The root of this repository is deployed by `.github/workflows/static.yml` to GitHub Pages on each push to `main`.

## Catalog and previews

`scripts/catalog.js` contains 20 beats, each with a distinct live $100 Stripe Payment Link. The published audio paths contain 30 decoded seconds taken from the midpoint of each private master. `docs/preview-manifest.json` records the source duration and excerpt boundaries, without publishing masters or private file links. Rebuild using:

```sh
python scripts/build_previews.py /absolute/path/to/private-masters
```

The private master folder must remain outside this repository. Cache versions in `beats.html` and the preview URLs must be updated after replacing assets.

## Analytics and owner dashboard

Owner dashboard: https://raise-up-owner-insights.gsantiago0829.chatgpt.site

The dashboard is hosted separately with owner-only ChatGPT sign-in. It is not linked from public navigation. Its page and API routes reject unauthenticated requests. Sites access controls restrict access to the owner; there is no public client password or API secret.

`scripts/analytics.js` sends consented activity to the event service. The event service exposes a write-only public activity endpoint with origin validation, bounded payloads, deduplication, rate limits, bot filtering, and validated event types. Report/control endpoints require a server secret shared only with the private dashboard. Neither a source URL nor knowledge of the dashboard URL grants report access.

The dashboard measures visitor/browser estimates, 30-minute visits, page views, active visible time, sections, individual beat listening, product order requests, clicks, sources, and anonymous journeys. It includes charts, date ranges, CSV export, a collection pause switch, and a verification-traffic filter. The data starts at installation; historical visits cannot be reconstructed.

Staff: opening `?analytics_exclude=1` on the public website excludes that browser. Restore it at `privacy.html`. Verification uses `?analytics_test=1`; those events are excluded from ordinary reports. Optional analytics remains off until consent and respects browser privacy signals.

Stripe sales are counted only from signed server payment notifications. Client clicks and visiting success.html cannot create sales. Apparel currently uses email order requests; sound packs remain coming soon. Those sections have interest tracking, not completed online-sale reporting.

## Private service source

Dashboard project: appgprj_6af3cf561a5c81918405f3ac1cc95704
Event service project: appgprj_6af3cf8e9b0881918e5fac1ba60dfbf3

Their separate Sites repositories contain source and deployment history. Runtime secrets remain in the hosting secret store. Do not add secrets to this public repository.
