# Building NEW custom sections (beyond the 11)

When the store needs a section growth-theme doesn't ship (drops calendar, size guide, Instagram strip, brand story, comparison table...), build it as a first-class editor section. A section is a **triplet**:

```
sections/<name>.jinja         # template
sections/<name>.schema.json   # editor settings
sections/<name>.png           # editor preview thumbnail (~600px wide, MANDATORY or it looks broken in the picker)
```

## The 10-step recipe

1. **Name it** kebab-case, purpose-first: `drops-calendar`, not `custom1`.
2. **Schema skeleton:**
```json
{
  "template": "sections/drops-calendar.jinja",
  "name": { "ar": "تقويم الإصدارات", "en": "Drops Calendar" },
  "icon": "calendar-line",
  "settings": [ ... ]
}
```
3. **Settings design** — think like the merchant, not the developer:
   - Every text the merchant might want to change = a field with an Arabic-first default.
   - Repeatable content = ONE `list` field with sub-settings (like carousel `slides`).
   - Formats without a native type (dates!) = `text` + `info` showing the exact format AND the fallback behavior.
   - Variants = `select` (`style_variant`), never a second section.
4. **Template skeleton:**
```jinja
{% set is_lazy = settings.order > 2 %}
<section section-id="{{ sectionId }}" class="section-drops-calendar px-4 py-6 md:px-16 md:py-16">
  <div class="theme-container">
    {% if settings.title %}<h2>{{ settings.title }}</h2>{% endif %}
    {% for item in settings.items | default([]) %}
      ...
    {% endfor %}
  </div>
</section>
```
   Rules: root class `section-<name>` (styling hook), read everything via `section.settings`/`settings.*` with `| default`, images through `image_url` with mobile variants, links through merchant `url` fields or `url_for`.
5. **Lazy discipline:** `settings.order > 2` → `loading="lazy"`; first sections get `fetchpriority="high"` on the main image.
6. **Empty & invalid states:** section with zero items renders a branded empty hint or nothing gracefully — NEVER a broken layout. Invalid input hides only the dependent element (see countdown lesson in `page-coverage.md`).
7. **Identity pass:** style through `.section-<name>` in `assets/css/components.css` using tokens + the theme's shape language (plates, panels, skew). CSS-only where possible.
8. **JS (only if needed):** self-initializing module in `assets/js/features/`, imported in `main.js`, re-init on `content:loaded`, no globals leakage. Inline `<script>` inside the section is acceptable ONLY for tiny per-instance logic (like countdown) — scope it to `[section-id="{{ sectionId }}"]`.
9. **Preview PNG:** screenshot the rendered section at ~600px width on the identity background — this is the merchant's first impression in "إضافة قسم".
10. **i18n:** any hardcoded UI string goes through `{% trans %}`/`_()` + the `.po` file; merchant copy stays in settings defaults.

## High-value custom section ideas (with the sector that needs them)

| Section | For | Core settings |
|---|---|---|
| Drops calendar | anime/streetwear | list(date:text, title, image, url) — reuse tolerant date parsing |
| Instagram strip | fashion/food | list(image, url) + handle text (no API needed — curated images) |
| Size guide | fashion | richtext or list(size, measurements) |
| Ingredient spotlight | beauty/food | list(image, name, benefit) |
| Comparison table | electronics | list(feature) × products refs |
| Occasion picker | gifts/sweets | list(occasion name, image, category link) |
| Store locator strip | omni-channel | list(city, address, map url) |
| Brand story | luxury | image + richtext + signature image |

## QA for any new section

- [ ] Renders correctly with ZERO merchant configuration (defaults carry it)
- [ ] Renders correctly with ONE item and with MANY items
- [ ] Invalid/garbage input degrades element-level, never section-level
- [ ] RTL + mobile verified
- [ ] `.png` preview present and on-identity
- [ ] No hardcoded colors/URLs/copy
- [ ] Passes `scripts/package_theme.sh`
