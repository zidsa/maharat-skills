# Store analysis — understand the store BEFORE designing

Never design blind. Before proposing any theme identity, build a store profile from real data. Two sources, use both when available:

## Source 1 — Zid MCP (the ZAM connector)

The store's MCP endpoint is the **ZAM MCP server** (SSE transport). URL format:
```
https://zam-mcp-server.zid.sa/mcp/<store-token>/sse
```
The `<store-token>` is issued per store from the ZAM app in the Zid dashboard. **It is a credential** — the base64 token embeds the store's API keys, so it must NEVER be committed. This repo's `origin` remote is PUBLIC; a pushed token = leaked store credentials.

**Where the live URL lives:** keep it in the gitignored file `references/.local/connector.txt` (this path is in `.gitignore`, so it stays on your machine and never reaches the repo). To set it up:
```
mkdir -p references/.local
echo "https://zam-mcp-server.zid.sa/mcp/<your-store-token>/sse" > references/.local/connector.txt
```
Then attach the connector: `claude mcp add --transport sse zid "$(cat references/.local/connector.txt)"` (or paste the URL into the client's MCP settings UI), and verify with a cheap read call (`ListCategories`). If the token was ever committed/pushed, rotate it from the ZAM app immediately.

Search for and call read tools to profile the store:
- `zid:ListProducts` / `zid:GetProductDetails` — product names, prices, images → what the store actually sells
- `zid:ListCategories` — real category tree → navigation structure and section planning
- `zid:ListOrders` (sales/GMV) — best sellers → what to feature in hero/featured sections
- `zid:ListProductReviews` — customer language and tone → copywriting voice
- `zid:ListStoreLocations` (then `GetStoreLocation(locationId)` if detail needed) — locale context
- `zid:GetBundleOffers` / `zid:ListCoupons` — active promos → whether countdown/offer sections matter

**Image harvest (feeds Step 2.5 / `references/images.md`) — do it in the same pass:**
- `ListProducts` → `results[].images[].image.thumbnail` (370×370) — coverage map: which products have photos, which have zero.
- `GetProductImages(productId)` → `thumbnail`/`small`(500²)/`medium`(770²)/`large`(1000²)/`full_size` URLs — banner-compositing sources for hero products.
- `ListCategories` → check `image` / `image_full_size` per category. Null images here are the #1 cause of an empty-looking storefront — record every null for the category tile kit.

Ignore obvious demo/test data (e.g. leftover template categories inconsistent with the real products).

## Source 2 — Storefront URL fetch

Fetch the live store URL (e.g. `https://<store>.zid.store/`). Extract:
- Store name and tagline
- Real category names in navigation
- Product naming patterns and price range (budget vs premium → design gravity)
- Existing logo colors (if any brand equity exists, respect it)

## Build the store profile

Produce this before touching code:

```
Store: <name>
Sector: <one of references/sector-identities.md, or nearest match>
Sub-vibe: <e.g. anime collectibles, luxury oud, streetwear>
Price tier: budget | mid | premium  → affects whitespace, typography weight, imagery style
Hero candidates: <best sellers / newest collection>
Section plan: <which of the 11 growth-theme sections to enable, in what order>
Existing brand colors: <from logo/current site, hex if detectable>
Image audit: <products with photos N/M · categories with null images · usable banner sources>
```

## Deriving the palette

1. If the merchant has real brand colors → keep them as primary, derive the rest.
2. Else → start from the sector identity in `references/sector-identities.md`, then adjust for the sub-vibe (e.g. "electronics" base + "gaming" sub-vibe = darker, neon accent).
3. Validate contrast: primary text on background ≥ WCAG AA (4.5:1). Dark themes need special care with muted/border colors.
4. Map the final palette onto growth-theme tokens: background, foreground, primary, primary_foreground, secondary, muted, accent, border, input, ring.

## Section plan heuristics

- Few products (<20): skip carousel, focus hero + products + benefits + testimonials.
- Offer-driven stores (active coupons/bundles): countdown + hero with promo badge.
- Visual products (fashion, decor, collectibles): gallery + large product imagery, fewer text sections.
- Trust-sensitive sectors (perfume, supplements, kids): testimonials + benefits (شحن سريع، ضمان، دفع آمن) high on the page.
