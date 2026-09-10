# Section: hero (البانر الرئيسي)

## Purpose & when to use
The above-the-fold statement. One hero per page maximum; `is_primary_hero` marks it for LCP priority (image gets `fetchpriority=high`, others lazy-load).

## Schema fields (live inventory)
| Field | Type | Notes |
|---|---|---|
| `is_primary_hero` | checkbox | default: True |
| `style_variant` | select | default: default |
| `background_image` | image | ارفع صورة بحجم 1500 × 700 بكسل |
| `background_image_mobile` | image | ارفع صورة بحجم 414 × 700 بكسل |
| `background_position` | select | default: center |
| `overlay_opacity` | range | default: 20 |
| `badge_text` | text | default: وصل حديثاً 🔥 |
| `heading` | text | default: عالم المانجا والأنمي في مكان واحد |
| `description` | textarea | default: مجسمات، ستاندات، بوسترات وقطع مختارة لهواة الأنمي — كولكشنات محدودة تنزل أول بأول |
| `button_text` | text | default: تسوق الآن |
| `button_url` | url |  |
| `min_height_mobile` | range | default: 700 |
| `min_height_desktop` | range | default: 700 |

## Template anatomy & data flow
Full-bleed section with `<picture>` (mobile/desktop sources via `image_url`), a `bg-primary` overlay at `overlay_opacity/100`, and a content column (badge → h1/h2 → description → CTA button). `style_variant` switches layout composition; `background_position` maps to object-position; min-heights are merchant ranges.

## JS behavior
None — pure server render. Fast by design.

## Identity styling hooks
Title text-shadow for legibility on imagery; CTA inherits global skewed `.btn` styling; badge inherits `.badge` tape shape. For dark themes verify overlay color still contrasts (overlay uses PRIMARY color — a red primary at high opacity tints everything red; keep default opacity ≤15 or restyle overlay to `--background`).

## Pitfalls & graceful degradation
1) Overlay uses primary color, not black — high `overlay_opacity` + colorful primary = tinted mess. 2) No image → section still renders text on flat background: ensure that state looks intentional. 3) `heading` renders as h2 — the global h1::after mark doesn't apply here; plate style comes from the h2 rule (excluded/included by design choice).

## Sector adaptation
Anime/streetwear: bold short heading + drop language ('كولكشن جديد وصل'). Luxury (perfume/jewelry): longer evocative copy, opacity ≤10, no badge. Value stores: badge with the current offer.

## Image/media specs
Desktop 1500×700 · Mobile 414×700.

## QA checklist
- [ ] Text readable over the UPLOADED image (not just placeholder)
- [ ] Overlay opacity sane on brand palette
- [ ] CTA link set (defaults to '#')
- [ ] Mobile min-height doesn't crop the heading
