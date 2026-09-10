# Growth-theme architecture (Vitrin)

Verified against zidsa/growth-theme (Tailwind v4, Vite 7, Jinja2, RTL-first).

## Folder structure

```
├── layout.jinja                  # Base HTML wrapper — ALL templates extend this
├── layout.schema.json            # Global merchant settings (colors, fonts, radius, product-card layout)
├── layout.json                   # Layout defaults/config
├── header.jinja / header.schema.json
├── footer.jinja / footer.schema.json
├── templates/                    # 14 page templates
├── sections/                     # 11 homepage sections: <name>.jinja + <name>.schema.json + <name>.png (editor preview)
├── components/
│   ├── ui/                       # breadcrumb, disclosure, quantity-input, phone-input
│   ├── products/                 # card, gallery, variants, reviews (+ filters/, headless/)
│   ├── cart/                     # coupon, gift, loyalty, summary
│   ├── categories/, header/, shipping-payment/, shared/
├── assets/
│   ├── tailwindcss.css           # CSS SOURCE (theme config + imports) — edit this
│   ├── styles.css                # COMPILED output — never edit, gitignored
│   ├── css/                      # components.css, product-options.css, product-filters.css,
│   │                             # price-slider.css (noUiSlider), lightbox.css (PhotoSwipe), blog.css
│   ├── js/
│   │   ├── main.js               # entry → assets/dist/theme.js (global: VitrinTheme)
│   │   ├── cart/                 # entry → assets/dist/cart-controller.js (global: CartController)
│   │   ├── product/, features/, lib/, utils/, data/
│   └── dist/                     # Vite output — gitignored, never edit
├── locale/ar/LC_MESSAGES/messages.po   # gettext Arabic translations
├── docs/                         # in-repo component/headless docs — read when touching components
├── Makefile                      # make build → build/growth-<date>.zip respecting .gitignore excludes
├── vite.config.js                # ENTRY env var selects bundle (main | cart)
└── package.json                  # npm run dev | build | build:dev | format
```

## Sections (11)
hero · carousel · products · categories · gallery · video · benefits · partners · testimonials · logo-social · countdown

## Templates (14)
home · product · products · cart · category · categories · page · blogs · blog · faqs · reviews · questions · shipping_payment · 404_not_found

## The settings → CSS pipeline (core rebranding mechanism)

1. `layout.schema.json` defines merchant-editable settings, e.g. `theme_primary` (type `color`), `font_family`, `theme_radius`.
2. `layout.jinja` reads them into `:root` CSS variables with fallbacks:
```jinja
:root {
  --font-family: {{ (settings.font_family | default('Roboto')).replace('+', ' ') }}, sans-serif;
  --background: {{ settings.theme_background | default('#FFFFFF') }};
  --foreground: {{ settings.theme_foreground | default('#0B0A09') }};
  --primary: {{ settings.theme_primary | default('#0B0A09') }};
  --primary-foreground: {{ settings.theme_primary_foreground | default('#FFFFFF') }};
  --secondary: {{ settings.theme_secondary | default('#F6F5F4') }};
  --muted: {{ settings.theme_muted | default('#545352') }};
  --accent: {{ settings.theme_accent | default('#A89C90') }};
  --border: {{ settings.theme_border | default('#B5B5B5') }};
  --input: {{ settings.theme_input | default('#545352') }};
  --ring: {{ settings.theme_ring | default('#0B0A09') }};
  --radius: {{ settings.theme_radius | default(4) }}px;
}
```
3. `assets/tailwindcss.css` maps them into Tailwind v4 utilities via `@theme inline`:
```css
@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-accent: var(--accent);
  /* ... */
  --font-sans: var(--font-family);
  --radius-md: var(--radius);
}
```
So `bg-primary`, `text-accent`, `rounded-md` all resolve to merchant settings. **To rebrand, change defaults in BOTH layout.schema.json and layout.jinja** — templates need no color edits.

Fixed system colors (destructive/success/warning) and derived tokens (`--muted-foreground`, `--border-light`) are hardcoded in `:root` of tailwindcss.css — safe to restyle for a brand.

Fonts load from Google Fonts using the `font_family` setting (URL-encoded name with `+`).

## Layout rules

```jinja
<head>
  {% vitrin_head %}   {# platform CSS, analytics, meta #}
</head>
<body>
  ...
  {% include "vitrin:shared/region_settings_dialog.jinja" %}
  {% vitrin_body %}   {# platform scripts: auth dialogs, Zid SDK, tracking #}
  {# loyalty script must load AFTER vitrin_body (depends on injected globals) #}
</body>
```

Page templates:
```jinja
{% extends "layout.jinja" %}
{% block content %} ... {% endblock %}
{% block footer_scripts %}
  <script src="{{ 'assets/dist/cart-controller.js' | asset_url }}"></script>
{% endblock %}
```

## Build pipeline (order matters)

```
npm run build:
  1. assets/tailwindcss.css → @tailwindcss/cli → assets/styles.css (minified)
  2. ENTRY=main vite build → assets/dist/theme.js          (empties dist/ first)
  3. ENTRY=cart vite build → assets/dist/cart-controller.js
```
`npm run dev` = parallel watch. `npm run build:dev` = sourcemaps, no minification.
Main bundle must build before cart (`emptyOutDir: entry === "main"`).

## Global context variables (all templates)
- `settings.*` — merchant theme settings (layout.schema.json)
- `section.settings.*` — per-section settings (inside a section template)
- `store` — name, logo, currency, `store.settings.products.low_stock_enabled`, `store.settings.checkout.is_loyalty_enabled`...
- `session` — includes `session.template` (current page id like `product_details`, `cart_page`)
- `request` — HTTP request context

## Non-obvious behaviors
- Undefined variables now raise visible errors in the dev preview — always `| default(...)` optional values; use `safeget` for nested optionals.
- Window globals are set by layout.jinja for JS (e.g. `window.storeLowStockEnabled`) — follow this pattern to pass Jinja data to JS.
- No secrets/.env in the repo — auth lives in vitrin-cli global session (`~/.vitrin/config.json`).
