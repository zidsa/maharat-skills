# Section: gallery (معرض الصور)

## Purpose & when to use
Lifestyle/lookbook storytelling — the brand-feel section. Each item: image (+mobile), alt, optional title + up to two buttons.

## Schema fields (live inventory)
| Field | Type | Notes |
|---|---|---|
| `title` | text | default: من عالم مانجا فريم |
| `gallery` | list |  |
| `gallery → src` | image | ارفع صورة بحجم 650 × 650 بكسل |
| `gallery → src_mobile` | image | ارفع صورة بحجم 650 × 650 بكسل |
| `gallery → alt` | text |  |
| `gallery → image_title` | text |  |
| `gallery → primary_button_text` | text |  |
| `gallery → primary_button_url` | url |  |
| `gallery → secondary_button_text` | text |  |
| `gallery → secondary_button_url` | url |  |

## Template anatomy & data flow
List-driven grid of image tiles with optional overlaid title/CTAs per image.

## JS behavior
None (lightbox only on product pages).

## Identity styling hooks
Every img gets the ink-panel treatment via `.section-gallery img` (border + cut corner + hover tilt).

## Pitfalls & graceful degradation
1) `alt` is a merchant field — encourage filling it (SEO/accessibility). 2) Mixed aspect ratios look chaotic: advise consistent crops in the info text or design guidance.

## Sector adaptation
Anime: shelf/setup shots ('من عالم مانجا فريم'). Fashion: lookbook. Food: dishes in context. Furniture: room scenes — this section IS the sale for visual sectors.

## Image/media specs
Consistent aspect recommended; ≥800px wide each.

## QA checklist
- [ ] Consistent aspect ratios
- [ ] alt filled
- [ ] Buttons link somewhere real
