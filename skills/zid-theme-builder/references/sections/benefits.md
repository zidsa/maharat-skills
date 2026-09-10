# Section: benefits (خصائص المتجر)

## Purpose & when to use
Trust row: 2–4 features (icon image + title + description). The store's promises in 5 seconds.

## Schema fields (live inventory)
| Field | Type | Notes |
|---|---|---|
| `store_features` | list |  |
| `store_features → image` | image | ارفع صورة بحجم 200 × 200 بكسل |
| `store_features → image_mobile` | image | ارفع صورة بحجم 200 × 200 بكسل |
| `store_features → title` | text | default: ليش تتسوق معنا؟ |
| `store_features → description` | text |  |

## Template anatomy & data flow
`store_features` list → responsive 2/4 grid, centered items.

## JS behavior
None.

## Identity styling hooks
Icon chips (bordered, tilted, hover-straighten) via `.section-benefits img/svg` rules.

## Pitfalls & graceful degradation
1) Feature icons are merchant-uploaded IMAGES — supply a starter icon set in assets or the row looks inconsistent. 2) More than 4 items breaks the rhythm.

## Sector adaptation
Universal, but copy is sectoral: anime → 'منتجات أصلية مرخصة'; food → 'تحضير يومي طازج'; supplements → 'حاصل على تصريح'.

## Image/media specs
Icons: square PNG/SVG ≥96×96, transparent bg.

## QA checklist
- [ ] Exactly 3–4 items
- [ ] Icons visually consistent
- [ ] One line title + one short description each
