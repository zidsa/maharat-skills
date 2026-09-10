# Competitive design research — learn from the leaders BEFORE designing

After profiling the store (store-analysis.md) and picking a sector identity (sector-identities.md), study 2–3 leading stores in the SAME sector. The goal: extract proven patterns, not copy designs. This step is mandatory for "professional-grade" output.

## How to research

0. If the user provides example stores, fetch and dissect THOSE FIRST — they define the user's mental model of "professional". Extract their exact section order and slot types before looking at global leaders.

1. Web-search: "best [sector] online stores", "[sector] ecommerce leaders", plus 1–2 known names if any.
2. For each leader, read the homepage (web_fetch) and note the patterns below.
3. Produce a short findings table, then map each finding to an implementable theme feature.

## What to extract from each leader

| Dimension | Questions |
|---|---|
| Navigation model | By product type, or by brand/franchise/occasion? (fandom stores navigate by SERIES; gift stores by OCCASION) |
| Above-the-fold promise | What's the first message? (shipping threshold, new drop, sale) |
| Promo mechanics | Announcement bar? Countdown? Pre-orders? Limited editions? Bundle deals? |
| Trust signals | Free-shipping threshold, authenticity/licensing claims, reviews placement |
| Card anatomy | What's ON the product card? (badges, second image on hover, quick add, ratings) |
| Section rhythm | Order of homepage sections; how many products before first CTA |
| Copy voice | Playful? Premium-terse? Community "we" language? |

## Reference leaders per sector (starting points, verify current state)

- Anime/collectibles: Crunchyroll Store, Atsuko, Tokyo Otaku Mode, Hot Topic
- Streetwear: Kith, END., Courir
- Perfume/oud (regional): Arabian Oud, Ajmal, Nice One
- Beauty/skincare: Sephora, Glossier, Golden Scent
- Electronics/gaming: Razer, Jarir, Newegg
- Fashion (regional): Namshi, Ounass, SHEIN (volume patterns)
- Food/coffee: Blue Bottle, %Arabica retail, local roasters
- Jewelry: Mejuri, L'azurde

## Proven conversion patterns → theme features (implement what fits)

1. **Announcement bar** (universal among leaders): settings-driven strip above header — shipping promise / current drop. Enabled by default with sector-appropriate copy.
2. **Free-shipping progress in cart**: growth-theme SHIPS this (`components/cart/shipping-progress.jinja`) driven by the platform's free-shipping rule — style it to the identity and tell the merchant to enable the rule in dashboard settings.
3. **Franchise/occasion navigation**: title the categories section by the sector's mental model ("تسوق بأنميك المفضل" not "التصنيفات"; "تسوقي بالمناسبة" for gifts).
4. **Drops/urgency**: countdown section for releases; rely on platform low-stock badges (`store.settings.products.low_stock_enabled`).
5. **New-releases emphasis**: leaders lead with "new & pre-orders" — the hydrated "أحدث المنتجات" section covers this; keep it FIRST after hero.
6. **Exclusivity storytelling**: hero copy sells the collection story, not the store generically.
7. **Playful on-brand microcopy**: empty states, 404, announcement — leaders use voice everywhere.

## Rule

Findings must translate into settings-driven, merchant-editable features — never hardcoded campaign content. And NEVER copy a leader's artwork, mascots, or copyrighted assets; extract the PATTERN, redesign the expression.
