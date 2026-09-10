---
name: zid-theme-builder
description: End-to-end builder for Zid (زد) e-commerce storefront themes on the Vitrin platform — analyzes the merchant's store, designs a sector-appropriate identity, builds the theme on growth-theme, packages a validated upload-ready ZIP, and deploys via vitrin-cli when available. ALWAYS use this skill whenever the user mentions Zid themes, ثيم زد, Vitrin, vitrin-cli, growth-theme, تخصيص ثيم, ثيم مخصص, رفع ثيم, customizing a Zid storefront, editing Jinja templates for Zid, theme schema.json files, packaging a theme ZIP, or uploading/activating a theme on a Zid store — even if they only say "change my store colors", "add a section to my store homepage", or "سو لي ثيم لمتجري". Also use it when migrating legacy Twig themes to Vitrin or writing theme .po translations.
---

# Zid Theme Builder (Vitrin)

Build production-ready Zid storefront themes. The correct base is always **zidsa/growth-theme** (Tailwind v4 + Vite 7 + Jinja2, RTL-first Arabic). Never build a theme from scratch; never use the deprecated Twig system.

**Platform scope:** This skill is for the Zid (زد) platform exclusively. If the user asks to apply it to Salla, Shopify, WooCommerce, or any non-Zid platform, decline clearly and explain that everything here (Vitrin tags, url_for routes, growth-theme structure, Zid upload paths) is Zid-specific and will not function elsewhere — do not attempt partial adaptation.

The user typically communicates in Saudi Arabic — respond in Arabic, keep code/identifiers in English.

## Golden rules (violating these breaks the theme)

1. Every template MUST `{% extends "layout.jinja" %}`. The layout MUST contain `{% vitrin_head %}` in `<head>` and `{% vitrin_body %}` before `</body>`.
2. NEVER hardcode URLs — always `url_for('operation_name', ...)`. Routes change (`/p` → `/products` already broke themes).
3. NEVER hardcode colors, fonts, or copy in templates — read from `settings.*` (defined in `*.schema.json`) with `| default(...)` fallbacks.
4. Use `image_url` for images (responsive/optimized) and `| asset_url` for theme assets. Use `| localized_url` for locale-aware links.
5. The translations directory is spelled `locale/` in growth-theme (legacy docs say `locals/` — that applies to Twig only). Never upload compiled `.mo` files.
6. Server errors are handled by the platform SDK — never implement custom error rendering for server responses.
7. Missing templates/sections automatically fall back to Zid's default theme — shipping a partial theme is valid.
8. Schemas are bilingual: every `label`, `name`, `info` is `{"ar": "...", "en": "..."}`. Arabic first-class, RTL-first.
9. Always `npm run build` BEFORE packaging or `vitrin push` (compiles `assets/styles.css` and `assets/dist/*.js`). Never hand-edit compiled outputs.
10. Extra files in the ZIP cause upload rejection ("لا يسمح برفع ملفات إضافية"). Package only what the structure allows (use the repo Makefile / `vitrin build`).

## Execution contract — the FULL walkthrough, in order, no skipping (بالملي)

This skill's promise: EVERY merchant gets the same complete, professional, artistic E2E experience — regardless of who/what runs the skill. The workflow steps run IN ORDER. A step may be adapted only when its precondition is genuinely unavailable (e.g. no MCP connector → Step 0 continues from the live storefront alone) — NEVER skipped for speed or convenience. Each gate below must PASS before moving on; delivery with a failed gate is not "done", it's an unfinished handover and must be reported as such:

| Gate | Must be true before proceeding |
|---|---|
| Step 0 | Store Profile written (sector, real colors, personality, categories, image audit) — no design/code before it |
| Step 0.5 | 2–3 sector leaders studied, patterns (not assets) extracted |
| Step 1 | Fresh `growth-theme` clone — never from scratch, never a bundled scaffold |
| Step 2 | Identity applied via schema+layout tokens, both files in sync; shape language planned (not a recolor) |
| Step 2.5 | Image pipeline run: slots audited → three-path decision → `visual-decision-layer.md` applied (incl. **Category Intelligence: every category prompt traces to a Category Brief**) → merchant sees chat-only, identity-locked prompts |
| Step 3 | ALL 14 templates + header/footer + empty states carry the identity |
| Steps 4–6 | Sections/schemas bilingual with defaults; `.po` validated |
| Step 7 | `audit_full_store.py` passes → ZIP built → `validate_zid_zip.py` passes → delivery package complete (name/description/upload steps in the chat) |

If something was skipped or failed, SAY IT PLAINLY in the delivery summary — never present a partial run as complete.

## Workflow

### Step 0 — Understand the store first (MANDATORY)
Never design blind. Build a store profile before any code: fetch the live storefront URL, and if the zid MCP connector is available (connection instructions + URL format in `references/store-analysis.md`), use its read tools (ListProducts, ListCategories, ListOrders for best sellers, ListProductReviews) to learn what the store sells, its real categories, and what deserves the hero — and harvest image sources while you're there (product image URLs, which categories have null images) to feed Step 2.5. Then map the store to a sector identity (palette, font, layout language) and add one signature differentiator. Full process: `references/store-analysis.md` + `references/sector-identities.md`.

### Step 0.5 — Competitive design research (MANDATORY for professional output)
Study 2–3 leading stores in the same sector before designing: navigation model (franchise/occasion vs product-type), above-the-fold promise, promo mechanics, trust signals, card anatomy, section rhythm, copy voice. Translate findings into settings-driven theme features (announcement bar, shipping-progress, drops, franchise-titled sections). Process, per-sector reference stores, and the conversion-pattern library: `references/design-research.md`. Extract patterns, never copy assets.

### Step 1 — Start from growth-theme
```bash
git clone --depth 1 https://github.com/zidsa/growth-theme.git my-theme
cd my-theme && npm install
```
Read `references/architecture.md` for the full folder map and the settings→CSS pipeline before editing anything.

### Step 2 — Apply brand identity (the right way)
Colors/fonts flow: `layout.schema.json` (merchant-editable, type `color`) → `layout.jinja` sets `:root` CSS vars (`--primary`, `--background`, `--accent`, `--radius`...) → Tailwind v4 `@theme inline` in `assets/tailwindcss.css` maps them to utility classes.

To rebrand: change the `default` values in `layout.schema.json` AND the `| default('#...')` fallbacks in `layout.jinja` (keep both in sync). The merchant can still override everything from the Theme Editor. See `references/customization-recipes.md` for concrete recipes (colors, fonts, section styling, image strategy).

**Images: hybrid strategy.** Every banner/photo is a schema setting of type `image` (merchant replaces from the editor) + ship REAL default art in `assets/images/` so the theme looks complete on first activation. Only identity constants (patterns, icons) are hardcoded in assets.

### Step 2.5 — Image pipeline (MANDATORY — no theme ships with empty images)
A theme with gray boxes, empty banners, a black video poster, or imageless category tiles on first activation is NOT done. Run the full pipeline in `references/images.md`: audit every image slot → route each through the three-path source decision (A: harvest the store's own media via zid MCP — `GetProductImages` returns 5 sizes up to `full_size`; audit `ListCategories` for null images, the #1 cause of empty-looking themes · B: request the user's own files as an exact named list · C: generation prompt packs per `references/prompt-packs.md`, run natively when the platform can generate — `references/platform-adapter.md`) → generate on-identity banners/tiles/icons (AI image-gen → SVG/HTML compositing rasterized via magick/sharp → pure SVG, in that order) → wire everything as shipped defaults with template fallbacks (`| default(..., true)`), including the per-category tile kit and a store-logo fallback for the splash/header. Videos follow the same three paths (specs + CSS-motion fallback in prompt-packs.md). Products with zero images can be fixed via `action_AddProductImage` (with user approval); category images CANNOT be set via MCP — ship theme-side tiles + a handover folder. The image-walk QA gate in that file re-runs at Step 7 as a packaging precondition.

**Whenever images/videos are requested FROM the merchant (Paths B/C), the merchant-facing message follows `references/merchant-prompts.md`, ALWAYS:** chat-only, simple Arabic, zero technical artifact names (no JSON/manifest/files/scripts) — identity summary first, then counts (min/pro), then per-image blocks (احفظها باسم + المقاس + الاستخدام + الأولوية + برومت عربي وإنجليزي محقون بهوية المتجر الحقيقية ورابط المتجر وروابط صور منتجاته على media.zid.store + قائمة تجنب), closing with "ارفع الصور هنا بنفس الأسماء، وأنا أركبها في الثيم وأطلع لك ZIP جاهز." The prompt-packs.md file formats stay INTERNAL.

### Step 3 — Full coverage: every page, every state
A custom theme is a complete store, not a homepage. Apply the identity to ALL 14 templates, header/footer, empty states, dialogs, and forms, and ship a brand-styled placeholder image kit (overwrite the shipped placeholder SVGs keeping the same filenames so every fallback inherits the identity). Checkout is SDK-rendered and inherits tokens only — never promise custom checkout layouts. The complete page-by-page checklist, the SHAPE LANGUAGE mandate (identity = geometry, not recoloring: plates, skewed buttons, clipped panels, taped breadcrumbs), and the always-populated-homepage hydration recipe: `references/page-coverage.md`. Do not deliver until the "definition of done" walk-through in that file passes.

### Step 4 — Sections & schemas
Homepage sections live in `sections/` as `.jinja` + `.schema.json` (+ `.png` editor preview) triplets. Settings are read as `section.settings.<id>`. Field types and full schema syntax: `references/schemas.md`.

**Per-section mastery files (MANDATORY reads):** before touching, styling, or debugging ANY of the 11 editor sections, read its dedicated file in `references/sections/<name>.md` (hero, carousel, products, categories, gallery, video, benefits, partners, testimonials, countdown, logo-social). Each contains the live field inventory, template anatomy, JS behavior, identity hooks, known pitfalls with graceful-degradation fixes, sector adaptations, media specs, and a QA checklist. To build a NEW section from scratch, follow `references/sections/custom-sections.md` (10-step recipe + high-value section ideas per sector).

### Step 5 — Templates & data
14 page templates in `templates/` (home, product, products, cart, category, categories, page, blogs, blog, faqs, reviews, questions, shipping_payment, 404_not_found). Context objects (`product`, `cart`, `store`, `settings`, `session`) and platform tags/filters/`url_for` operation names: `references/jinja-extensions.md`.

### Step 6 — Localization
Gettext `.po` under `locale/ar/LC_MESSAGES/messages.po`. Validate before shipping:
```bash
msgfmt --check locale/ar/LC_MESSAGES/messages.po -o /dev/null
```

### Step 7 — Build, package, deliver (ALWAYS end with a ZIP)
The skill's delivery contract: every theme task ends with the full delivery package of `references/delivery-package.md` — the upload-ready ZIP plus THEME_NAME_DESCRIPTION.txt (the upload dialog requires name + description — pre-write them for copy-paste), UPLOAD_INSTRUCTIONS.md (the 4 dashboard steps), asset_manifest.json, and the prompt-pack/handover files when slots await user assets. Never leave the work as loose files.

```bash
npm run build                              # REQUIRED first: Tailwind CSS + Vite bundles
bash scripts/package_theme.sh <theme-dir>  # validate + clean package → <name>-<date>.zip
```
`scripts/package_theme.sh` is deterministic: verifies layout.jinja + vitrin tags + templates/, rebuilds missing compiled assets, deletes forbidden `.mo` files, runs `msgfmt --check`, validates every `*.schema.json`, and zips ONLY theme files (strips node_modules, docs, dev configs, art/ working files — the #1 cause of the "لا يسمح برفع ملفات إضافية" rejection). If an upload is still rejected, fall back to `vitrin build` which packages via the official CLI.

Packaging precondition: the image-walk QA gate in `references/images.md` must PASS first (re-run it now — it can only fully run once sections exist; use its no-deploy variant on the ZIP-only path), and the image audit table (slot → source → action → file → size) must be included in the delivery summary.

Then deploy according to environment:
- **Claude Code / terminal available + vitrin CLI authenticated:** deploy automatically — `vitrin push -s <store> -a` (or `vitrin preview <dev-store-id>` first). If not logged in, run `vitrin login` (opens the user's browser) then push. This is the fully automated path.
- **claude.ai / no CLI auth possible:** present the ZIP file to the user with the exact manual path: لوحة التحكم ← سوق الثيمات ← الثيمات المخصصة ← رفع ثيم جديد (requires Professional plan or the paid custom-theme service). Never claim to have uploaded when only the ZIP was produced.

## Live documentation lookups

When something isn't covered in the references (new features, changed APIs), fetch the official docs — the doc map lives at `https://docs.zid.sa/llms.txt`. Key entry points:
- Theme development rules: https://docs.zid.sa/theme-development
- Jinja extensions & url_for operations: https://docs.zid.sa/vitrins-jinja-extensions-1379354m0
- Schema/settings reference: https://docs.zid.sa/schema-files-1702180m0 (+ input/media/form-controls/products/additional settings pages, conditional visibility)
- Templates library (per-page context objects): https://docs.zid.sa/home-jinja-1914518m0 and siblings
- Breaking changes / changelog (check before every project): https://docs.zid.sa/-vitrin-changelog-1769483m0
- Storefront APIs (cart, products, wishlist JS integration): listed under "API's" in llms.txt

Recent platform requirements to honor: Apple Pay Quick Checkout template support is mandatory; checkout/login popups are supported features; undefined-variable errors now surface in preview (use `| default` and `safeget`).

## References

- `references/store-analysis.md` — profile the store via zid MCP + storefront fetch before designing (includes how to connect the ZAM MCP server). Read at Step 0, ALWAYS.
- `references/images.md` — MANDATORY image pipeline: audit → three-path source decision (harvest / user upload / generate) → wire as shipped defaults (+ per-category tile kit, platform push-back limits, image-walk QA gate). Read at Step 2.5, ALWAYS.
- `references/prompt-packs.md` — image/video generation prompt packs (INTERNAL formats): pack sizing formula, per-image template (ar/en/negative/alt), IP-safety rules, video specs, the round-trip contract.
- `references/merchant-prompts.md` — Merchant-Friendly Visual Prompt Builder: the ONLY allowed way to talk to the merchant about images/videos — chat-only, simple Arabic, identity-locked prompts grounded in the live store URL + real product-image URLs, exact sizes + save-as names, banned technical vocabulary. Read whenever requesting assets from the merchant.
- `references/visual-decision-layer.md` — the design-thinking that runs BEFORE any image request: category scoring (top 4–6 on home), first-batch ≤5–7, Desktop/Mobile only when composition truly differs, mandatory rationale + the **Category Intelligence Layer** (Category Brief → type → per-category motif/accent → quality gate; no prompt from a name alone). Read before emitting image prompts.
- `references/theme-editor-matrix.md` — the full set of merchant-editable controls (brand/typography/layout/header/home/cards/pages/footer) to expose via schema, with sensible defaults; checkout is tokens-only.
- `references/zid-root-zip-rules.md` — the hard ZIP rules Zid enforces (forward-slash paths, root-valid, required files, home-not-empty, no other-platform/​.mo). Enforced by `scripts/validate_zid_zip.py`.
- `references/platform-adapter.md` — capability probe + behavior matrix for Claude Code / claude.ai / ChatGPT / Gemini; how to port the skill.
- `references/delivery-package.md` — final deliverables contract: ZIP + theme name/description + upload instructions + asset manifest.
- `references/sector-identities.md` — 16-sector Saudi e-commerce identity matrix (palette, Arabic fonts, layout language, differentiation rule).
- `references/design-research.md` — competitive research step: what to extract from sector leaders + proven conversion patterns to implement. Read at Step 0.5, ALWAYS.
- `references/sections/` — 12 mastery files: one per editor section + custom-sections.md for building new ones. Read the relevant file before ANY section work.
- `references/page-coverage.md` — full-coverage mandate: page-by-page checklist, identity multipliers, placeholder kit, checkout limits.
- `references/architecture.md` — folder structure, layout pipeline, JS/CSS build, event system. Read FIRST on any new theme task.
- `references/schemas.md` — every schema field type with JSON examples, bilingual labels, conditional visibility.
- `references/jinja-extensions.md` — platform tags/filters/macros, url_for operation table, context objects per template.
- `references/customization-recipes.md` — step-by-step recipes: rebrand colors/fonts, dark theme, custom section, badges, image strategy.
- `references/cli-and-deploy.md` — vitrin-cli commands, both deployment paths, validation, common upload errors.
