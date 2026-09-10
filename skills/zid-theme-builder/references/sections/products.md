# Section: products (قائمة المنتجات)

## Purpose & when to use
THE conversion section. Data comes from the platform: merchant picks a product list in the editor and the platform injects `settings.products.results` (+ `.url` for the more-link). No editor selection = section renders nothing.

## Schema fields (live inventory)
| Field | Type | Notes |
|---|---|---|
| `layout` | select | default: carousel |
| `title` | text | default: الأكثر مبيعاً 🔥 |
| `products` | products |  |
| `more_text` | text | default: عرض الكل |
| `display_more` | checkbox | default: True |

## Template anatomy & data flow
`layout` select: carousel (embla via `products-carousel.jinja`) or grid/list. Title row + optional more-link (`display_more` + `more_text`). Cards are the shared `product-card.jinja` — identity styling lives THERE, so every products section everywhere matches.

## JS behavior
Carousel layout uses embla; quick-view/wishlist/add-to-cart re-init via `content:loaded`.

## Identity styling hooks
Zero per-section work if product-card + embla globals are styled. Default title should sell ('الأكثر مبيعاً' not 'منتجات').

## Pitfalls & graceful degradation
1) The products picker is the #1 merchant confusion: empty pick = invisible section — the section-level fallback is impossible (data is platform-injected), so the HOMEPAGE must not depend on this section alone (see hydrated home sections). 2) `settings.order <= 2` marks priority images — keep products high on page for LCP benefit.

## Sector adaptation
All sectors. Carousel for browsing-mood sectors (fashion/anime), grid for spec-comparison sectors (electronics).

## Image/media specs
Product images come from the catalog; aspect controlled by layout settings group (product_card).

## QA checklist
- [ ] Product list actually selected in editor
- [ ] more_text Arabic default present
- [ ] Hover panel effects fire inside carousel too
