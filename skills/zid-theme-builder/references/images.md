# Image pipeline — no theme ships with empty images (MANDATORY)

**Delivery gate:** a theme that shows ANY gray box, empty banner slot, black video poster, or imageless category tile on first activation is NOT done. Every image slot ships with real art — harvested from the merchant's own store or generated on-identity. Placeholder SVGs (page-coverage.md kit) are the *last* fallback layer, never the deliverable.

Run this pipeline as its own step (after identity, before/with section work). Phases: **Audit (Phase 0) → Harvest (A) → Generate (B) → Wire (C)**, plus optional push-back-to-platform (D). The QA gate at the end re-runs before delivery (Step 7) — it can only fully pass once sections exist.

## Phase 0 — Image slot audit (know every hole before filling it)

The table below is the FIXED slot inventory of growth-theme + the skill's homepage anatomy. From it, build the per-project **audit table** — one row per slot: `slot → source → action (reuse / composite / generate) → shipped file → size`. That audit table is a deliverable: it goes in the delivery summary.

| Slot | Size (desktop / mobile) | Empty behavior | Fill strategy |
|---|---|---|---|
| Hero `background_image(_mobile)` | 1500×700 / 414×700 | text on flat bg | generated identity banner (may composite product shots) |
| Carousel `slides[].background_image(_mobile)` | 1500×700 / 414×700 | empty list = nothing renders | 2–3 generated promo slides, wired as template fallbacks in the home banner slider (schema list defaults only if verified in the editor) |
| Home banner slider (page-coverage.md: homepage anatomy) | 1500×700 per slide | empty slot visible | same as carousel |
| Wide promo slots ×2 (home) | 1200×500 | empty band | generated offer/collection banners |
| Countdown `background_image(_mobile)` | 1500×480 / 414×480 | flat bg behind timer | dark-toned identity banner (timer contrast!) |
| Video `poster_image` | 1500×700 | **black box first paint** | frame-style branded poster, always set |
| Gallery `gallery[].src(_mobile)` | 650×650 schema hint — ship ≥800×800 (section spec) | undocumented (assume broken/blank) | harvested product/lifestyle crops, consistent aspect |
| Benefits `store_features[].image(_mobile)` | 200×200 (icons ≥96, transparent) | inconsistent row | generated icon set in identity style (PNG/SVG, transparent) |
| Partners `store_partners[].image` | logos ≥240px wide | undocumented | real partner logos only — never invent partnerships; skip section if none |
| Categories (platform `category.image`) | square ≥320×320 | card hides img / weak gray card | per-category tile kit (see Phase C) — all categories CAN be null (verified true for the target store: every single category null; always audit) |
| Store logo / splash / header | per store | splash + header + logo-social render `store.logo` — null logo = empty img on FIRST paint | harvest `store.logo`; if null, generate an on-identity SVG wordmark → `assets/images/logo.svg`, wired as fallback in splash, header, logo-social |
| Product catalog images | platform-served | placeholder SVG | catalog already has photos; fix zero-image products via MCP (Phase D) |
| Placeholder kit (assets/images/) | banner 1500×700, banner-mobile 720×900, wide 1200×500, product, category, avatar | default gray growth art | overwrite ALL with identity versions, same filenames |
| Section previews `sections/<name>.png` | ~600px wide | broken-looking editor picker | screenshot each finished section |
| 404 / empty states | — | default gray | identity art (usually pure SVG/CSS) |

## Source decision — three paths, decided PER SLOT (قرار المصدر)

After the audit, route every unfilled slot through this decision — paths compose (a store can be A for banners and C for category art):

- **Path A — المتجر فيه صور:** harvest the store's own media (Phase A below) and composite/reuse it. Always tried first — it's real, owned, and free.
- **Path B — المستخدم عنده صور على جهازه:** ask ONCE with an exact named list, never a vague "ارفع صور" — delivered IN THE CHAT per `merchant-prompts.md` (simple table: اسم الصورة · المقاس · الاستخدام · ملاحظة; `ASSET_REQUIREMENTS.md` stays internal). Files that come back drop straight into `assets/images/`.
- **Path C — ما عنده صور أبداً:** write the generation prompts per `merchant-prompts.md` — IN THE CHAT, identity-locked (real hexes + sector + mood), exact size + save-as name per image, grounded in the live store URL + direct `media.zid.store` product-image URLs. If the current platform can generate images/video natively (ChatGPT/Gemini — see platform-adapter.md), run the prompts yourself with the exact filenames; otherwise the merchant runs them ("افتح Gemini أو ChatGPT ← انسخ البرومت ← احفظ بالاسم ← ارجع ارفعها هنا") and ship on-identity placeholders meanwhile — the theme works NOW and upgrades when the files return. (`VISUAL_PROMPTS.md` / `VIDEO_PROMPTS.md` are internal build artifacts only.)

Whatever the path, the slot ends up filled — Phase C wiring and the QA gate don't care where the pixels came from, only that nothing is empty.

**Variant enumeration rule:** when requesting from the merchant, every slot that has a mobile field in the editor = TWO separate deliverables with distinct filenames (desktop + mobile), even at identical dimensions — full table + naming in `merchant-prompts.md`. And whatever the theme ships as a desktop default MUST also ship+wire its mobile twin (e.g. hero: CSS var + media query), or the mobile first-paint contradicts the pipeline.

## Phase A — Harvest the store's own images (المصدر الأول)

The merchant's uploaded media is the best, safest art source — real products, zero copyright risk, already on Zid CDN.

Via the **zid MCP connector** (see store-analysis.md for connection):
- `ListProducts` → `results[].images[].image.thumbnail` (370×370) — quick coverage map + best-seller candidates.
- `GetProductImages(productId)` → per image: `thumbnail` 370², `small` 500², `medium` 770², `large` 1000², `full_size` (original). Use `large`/`full_size` for banner compositing.
- `ListCategories` → `image` / `image_full_size` per category. **Audit for null** — categories are frequently imageless; that's the #1 source of "الصور فاضية".
- Storefront fetch (`https://<store>.zid.store/`) → current live banners, store logo (`store.logo` — if the store has NO logo, flag it now: the splash/header need the generated wordmark fallback), any brand art already in use.

Download working copies **OUTSIDE the theme directory** — harvest originals and SVG sources must never end up in the ZIP (the packaging script excludes by blocklist, and `art/` is excluded, but keeping them out of the theme dir is the primary rule):
```bash
mkdir -p ../art/harvest && cd ../art/harvest
curl -sO "https://media.zid.store/<store-uuid>/<image-id>.jpeg"   # full_size pattern
```
Record per-product/category source URLs in the audit table. NEVER harvest from other stores or the open web (design-research.md rule: patterns yes, assets never).

## Phase B — Generate on-identity art (التوليد)

Escalation chain — probe what's available, fall down the chain, never skip the step:

1. **AI image generation** (only if an image-gen MCP/tool is connected — e.g. Canva `generate-design`, or any text-to-image tool). Best for lifestyle/mood banner backgrounds. Hard rules:
   - NEVER copyrighted characters/IP (same rule as placeholder kit — applies double to fan-merch stores).
   - NEVER fake product photography (don't depict products the store doesn't sell).
   - NEVER bake Arabic text into AI output (rendering is unreliable) — generate the background, overlay text in step 2.
2. **Programmatic compositing** (the workhorse — build banners as SVG/HTML collages):
   - Layers: identity background (palette gradient + shape language + pattern) → harvested product cutouts/crops (2–4 shots, panel-framed per the theme's card geometry) → Arabic headline + CTA chip in the brand font.
   - Rasterize with whatever exists — probe in order: `magick` (ImageMagick 7) → `rsvg-convert` → `npx sharp-cli` / node canvas → headless-browser screenshot. Always crop to exact slot dimensions:
   ```bash
   magick -density 96 ../art/src/hero.svg -quality 82 -resize 1500x700^ -gravity center -extent 1500x700 assets/images/hero-1500x700.jpg
   ```
   - **No rasterizer available? Ship the SVG itself** — `asset_url` serves SVG fine in `<img>`/CSS backgrounds. Embed harvested photos as `<image href="...">` only if rasterizing; for shipped SVG keep it vector-only (external hrefs won't load in `<img>` context) and lean on gradients/shapes/typography.
3. **Pure SVG identity art** (zero dependencies, always works): gradients, patterns, geometry, Arabic typography. Tiny, crisp, RTL-safe. This is also the right tool for: the wordmark logo fallback, benefits icon set, avatar, 404 art, empty states, and the overwritten placeholder kit.

Photo treatment rules: banners get the same shape language as the theme (clipped corners, ink borders, skew — whatever the identity mandates); respect hero overlay behavior (primary-tinted at `overlay_opacity` — keep generated banners readable under it); countdown banners must keep the timer zone calm/dark enough for digit contrast.

## Phase C — Wire art into the theme (الربط)

Principle unchanged from Recipe 3: settings stay type `image` (merchant can always replace from the editor) — but every read now falls back to SHIPPED REAL ART, not gray placeholders.

- Template fallback — **always pass `true` as default()'s second argument**: plain `default()` only fires on UNDEFINED, but cleared/never-set platform values arrive as `null`/`""` (verified: every category image in the target store is `null`, not missing) and would render the literal `None` otherwise. Do NOT rely on schema `default` for image fields (unverified in the editor) — the template fallback is the contract:
```jinja
{% set bg = section.settings.background_image | default('assets/images/hero-1500x700.jpg' | asset_url, true) %}
```
- Naming convention: `assets/images/<slot>-<W>x<H>.jpg` (photos/composites, JPEG q≈80) · `.svg` (flat identity art) · `.png` (transparent icons only).
- **home.jinja** (Recipe 8 + homepage anatomy): hero band, banner slider slides, both wide promo slots, FAQ/benefits bands — all render shipped art with ZERO editor config. The homepage must look photographed-full on first activation.
- **Category tile kit** (fixes the null-image categories at theme level): generate one tile per real category — collage of 2–3 of that category's own product photos + name plate in identity style → `assets/images/categories/<category-id>.jpg`. In the forked category-card, KEEP whatever accessor the existing growth-theme card already uses for the platform image (verify the exact field shape in the Templates Library docs — it may be an object, and content images normally go through `image_url`); only change the fallback chain, shaped like:
```jinja
{% set cat_tile = 'assets/images/categories/' ~ category.id ~ '.jpg' %}
<img src="{{ <existing platform-image accessor> | default(cat_tile | asset_url, true) }}"
     onerror="this.onerror=null;this.src='{{ 'assets/images/placeholder-image.svg' | asset_url }}'" ...>
```
  Platform image wins when the merchant later uploads one; unknown/new categories degrade via `onerror` to the branded generic placeholder (use the kit's real filenames — page-coverage.md) — never a hidden img.
- **Store logo fallback**: splash preloader, header, and logo-social all render `store.logo` — wire the generated wordmark as fallback in all three: `{{ store.logo | default('assets/images/logo.svg' | asset_url, true) }}`.
- **Placeholder kit overwrite** (page-coverage.md): same filenames, identity art — stays as the final safety net under everything above.
- **Video poster**: always shipped; **benefits**: starter icon set shipped and referenced as list defaults where the schema allows, else documented in the handover; **section preview PNGs**: screenshot the *finished* sections (~600px) so the editor picker sells the theme.

**Analyze-before-wire (hard gate):** when generated/uploaded images come back, Read/inspect EACH one and confirm its CONTENT matches the intended slot before placing it — map by what the image actually shows, not by filename (a One Piece tile must not land under Naruto; a hero scene must not go into a category square; the empty-frame design belongs to the custom-design tile). Verify aspect/orientation + identity too, then resize to exact slot dimensions and wire. A beautiful image in the wrong place is still a defect — re-map and tell the merchant rather than wiring blind. (Full rule: visual-decision-layer.md → Analyze-before-wire.)

**ZIP size budget:** photos JPEG quality ~80; single banner ≤300KB; whole shipped art set ≤5MB; never ship `full_size` originals raw — resize to slot dimensions. The packaging script excludes by BLOCKLIST (it strips only known dev files + `art/`), so keep working files out of the theme dir — anything else inside it ships.

## Phase D — Push images back to the platform (optional, with user approval)

What the zid MCP connector can and cannot do (verified against the live tool schemas, 2026-07):

- ✅ `action_AddProductImage(productId, imageUrl, altText)` — fix products with ZERO images. Needs a **public** URL: reuse an existing store media URL, or any hosting the user provides. Always list the affected products and get approval before writing.
- ❌ Category images CANNOT be set via MCP (`action_UpdateCategory` has no image parameter). Two remedies, do both:
  1. Theme-side category tile kit (Phase C) — works immediately, no merchant action.
  2. Deliver `handover/category-images/` with correctly named+sized files and the dashboard path: **المنتجات ← التصنيفات ← تعديل التصنيف ← صورة التصنيف**. Once uploaded there, the platform image automatically replaces the shipped tile.
- ❌ The store logo cannot be set via MCP either — if generated, include it in the handover with the dashboard path (الإعدادات ← بيانات المتجر ← الشعار).
- ❌ Theme Editor `image` settings cannot be pre-filled remotely — that is exactly why Phase C ships real defaults.

Never claim an upload happened when only files were generated — report precisely which lane each image took.

## QA gate — the image walk (بوابة التسليم)

Re-run this gate at Step 7, before packaging — it is a delivery precondition, not just a Step 2.5 exit check.

**With a preview/dev store (vitrin push/preview available):** with ZERO editor configuration, walk: home → products → categories → category → product → cart → 404, then add each of the 11 sections in the editor. FAIL if any of:
- gray/empty banner band, black video first-paint, hidden/blank category tile, inconsistent benefits row, unbranded placeholder anywhere;
- splash/header first paint shows a broken or empty logo;
- a shipped banner unreadable under its section overlay (hero primary tint, countdown timer zone);
- mixed aspect ratios in gallery defaults;
- ZIP rejected or bloated (>~5MB of art), or `full_size` originals shipped;
- any shipped art that is third-party IP or fake product imagery.

**No-deploy variant (claude.ai / ZIP-only path):** verify statically — (a) every audit-table slot's shipped file exists in `assets/images/` at the recorded size; (b) grep every template image read for a `| default('...' | asset_url, true)` fallback pointing at an existing file; (c) any schema list defaults reference existing assets; (d) open the generated art files locally and eyeball them. State in the delivery summary that the live editor walk still needs to run when a preview becomes available.

Record the audit table (slot → source → action → file → size) in the delivery summary so the user sees exactly how every hole was filled.
