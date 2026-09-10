# Theme schemas (Theme Editor settings)

Schemas follow the JSON Schema standard and drive the merchant's visual Theme Editor. Every label/name/info is bilingual `{"ar": "...", "en": "..."}`. Full official reference: https://docs.zid.sa/schema-files-1702180m0 (+ Input / Media / Form Controls / Products / Additional Settings pages and Conditional Visibility).

## Section schema shape

```json
{
  "template": "sections/hero.jinja",
  "name": { "ar": "البانر الرئيسي", "en": "Hero Banner" },
  "icon": "home-2-line",
  "settings": [ /* fields */ ]
}
```
Each section ships a `.png` next to it — the preview thumbnail shown in the editor's "add section" picker. Always provide one.

Layout/header/footer schemas group fields:
```json
{
  "name": { "ar": "إعدادات التخطيط", "en": "Layout Settings" },
  "groups": [
    { "id": "colors", "icon": "fa fa-palette",
      "name": { "ar": "الألوان", "en": "Colors" },
      "settings": [ /* fields */ ] }
  ]
}
```

## Field types (all observed in growth-theme)

| type | Renders as | Notes |
|---|---|---|
| `text` | single-line input | most common |
| `textarea` | multi-line text | |
| `richtext` | rich text editor | HTML output — render with `| safe` |
| `select` | dropdown | `options: [{value, label:{ar,en}}]` |
| `checkbox` | toggle | boolean |
| `range` | slider | `min`, `max`, `step`, numeric default |
| `color` | color picker | hex string |
| `image` | image upload | put size guidance in `info` (e.g. "1500 × 700 px") |
| `video` | video upload/URL | |
| `url` | link input | |
| `list` | repeatable group of sub-fields | e.g. slides, testimonials — iterate `section.settings.<id>` |
| `products` | product picker | merchant selects store products |
| `category` | category picker | |

## Field anatomy

```json
{
  "id": "background_image",
  "type": "image",
  "label": { "ar": "صورة الخلفية (سطح المكتب)", "en": "Background Image (Desktop)" },
  "info": { "ar": "ارفع صورة بحجم 1500 × 700 بكسل", "en": "Upload image 1500 × 700 pixels" },
  "default": "..."
}
```

Access in templates: `section.settings.background_image` (sections) or `settings.<id>` (layout/header/footer). Always guard: `{{ section.settings.title | default('') }}`.

## Conventions that matter

- Provide **sensible defaults for every field** so the theme looks complete immediately after activation (defaults are the brand identity).
- Desktop + mobile image variants as separate fields (`background_image`, `background_image_mobile`).
- Style variants via `select` (e.g. `style_variant: default | compact`) instead of separate sections.
- Product-card layout options (columns desktop/mobile, image aspect ratio) live in `layout.schema.json` groups, read in `layout.jinja` as `settings.product_card_columns_desktop` etc.
- Conditional visibility (show field B only when field A has value X) is supported — see docs page "Conditional Visibility" before inventing toggles.
- Editor icons: sections use icon names like `home-2-line`; layout groups use FontAwesome classes like `fa fa-th-large`.
