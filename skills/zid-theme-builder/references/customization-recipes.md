# Customization recipes

Battle-tested recipes for rebranding growth-theme. Principle: **defaults ARE the brand** — everything stays merchant-editable, but ships looking finished.

## Recipe 1 — Rebrand colors (e.g. dark theme)

Edit BOTH files, keeping values identical:

1. `layout.schema.json` → colors group → change each `"default"` hex.
2. `layout.jinja` → `:root` block → change each `| default('#...')` fallback.

Example (dark anime-store identity):
```
theme_background: #0E0E12   theme_foreground: #F5F1E8
theme_primary:    #E63946   theme_primary_foreground: #FFFFFF
theme_secondary:  #17171E   theme_accent: #FFC53D
theme_border:     #2A2A33   theme_muted: #9A97A3
```
For dark themes also audit `assets/tailwindcss.css` fixed tokens (`--border-light`, `--muted-foreground`) and hardcoded light-assuming utilities (`bg-white`, `text-black`, gray-* classes) across components — replace with semantic tokens (`bg-background`, `bg-secondary`, `text-foreground`, `border-border`).

## Recipe 2 — Brand font

`font_family` setting holds a Google Fonts name (URL-encoded, `+` for spaces). Change the default in schema + layout fallback, e.g. `Cairo`, `Changa`, `IBM+Plex+Sans+Arabic`. layout.jinja already builds the Google Fonts link and strips `+` for the CSS var. Verify the font has Arabic subset.

## Recipe 3 — Image strategy (hybrid)

- Every content image = schema field of type `image` with size guidance in `info`.
- Ship REAL default art in `assets/images/` and reference it as fallback — always pass `true` as `default()`'s second argument (plain `default()` only fires on undefined; cleared/never-set values arrive as `null`/`""` and would render literally):
```jinja
{% set bg = section.settings.background_image | default('assets/images/hero-1500x700.jpg' | asset_url, true) %}
```
- The shipped defaults come from the mandatory image pipeline in `references/images.md` (harvest store media via MCP → generate on-identity banners/tiles/icons) — gray placeholders are the last safety layer, never the shipped default.
- Hardcode ONLY identity constants: background patterns (halftone, textures), decorative SVGs, icons.
- Content images at runtime go through `image_url` for responsive sizing.

## Recipe 4 — New custom section

1. Create `sections/<name>.jinja` + `sections/<name>.schema.json` + `sections/<name>.png` (editor preview ~600px wide screenshot/mock).
2. Schema: `template` path, bilingual `name`, `icon`, `settings` with defaults.
3. Template reads `section.settings.*` with `| default`. Wrap strings in `{% trans %}` or move copy into settings.
4. Style with Tailwind semantic tokens only (`bg-primary`, `text-accent`) so merchant color changes propagate.
5. Repeatable content (slides, cards) = `list` type field.

## Recipe 5 — Comic/promo badges (example of identity-level styling)

Add a component class in `assets/css/components.css` inside `@layer components`:
```css
.badge-promo {
  @apply bg-accent text-background text-xs font-bold px-2 py-0.5;
  transform: rotate(-2deg);
}
```
Rebuild CSS (`npm run build`) — never edit `styles.css` directly.

## Recipe 6 — Countdown "drops" section

growth-theme ships `sections/countdown.*` — restyle rather than rebuild. Expose target date, title, CTA link (`url` type) in its schema.

## Recipe 7 — Arabic copy

All merchant-facing defaults and labels: Saudi-appropriate Arabic first (`ar` key), English second. UI strings in templates go through the `.po` file; run `msgfmt --check` after editing. Plural rules for Arabic are already configured (6 plural forms).

## QA checklist before packaging

- [ ] `npm run build` succeeds, `assets/styles.css` + `assets/dist/*` regenerated
- [ ] No hardcoded hex colors/URLs/copy introduced in templates
- [ ] Every new setting has a bilingual label + default
- [ ] `msgfmt --check` passes; no `.mo` committed
- [ ] Preview `/validate` report clean (when a dev store is available)
- [ ] RTL check: layout intact in Arabic; LTR check for English if enabled
- [ ] Mobile columns/product-card settings still respected

## Recipe 8 — The empty-homepage pitfall (CRITICAL)

`{% template_components %}` in home.jinja renders ONLY sections the merchant adds in the Theme Editor — a freshly activated theme shows an EMPTY homepage. A professional custom theme must look complete from the first second. Solution: design the homepage inside home.jinja itself, wrapped around `{% template_components %}`:

1. Custom hero band — fully settings-driven (`settings.hero_*` group in layout.schema.json) with rich Arabic defaults + a shipped SVG fallback artwork, so it renders beautifully with ZERO editor configuration.
2. Identity bands that need no platform data (marquee strip, benefits/trust row, closing CTA) — pure settings + CSS, always visible.
3. Keep `{% template_components %}` in the middle — merchant-added sections (products, categories, countdown) slot in there since they require platform data.
4. Every text in these bands = a `settings.home_*` / `settings.hero_*` field with a default. Setting key pattern is `<group_id>_<field_id>` from layout.schema.json groups.

This gives "complete on activation" + full editor customization at the same time.
