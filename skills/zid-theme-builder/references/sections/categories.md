# Section: categories (التصنيفات)

## Purpose & when to use
Navigation-by-mental-model. Merchant picks categories (list of `category` type fields); platform injects category objects.

## Schema fields (live inventory)
| Field | Type | Notes |
|---|---|---|
| `title` | text | default: تسوق حسب التصنيف |
| `categories` | list |  |
| `categories → category` | category |  |
| `more_text` | text | default: View all |
| `display_more` | checkbox | default: False |

## Template anatomy & data flow
Title row + more-link + grid of `category-card.jinja` (image + centered name). Imageless categories fall back to the branded placeholder (added in our card fork).

## JS behavior
None.

## Identity styling hooks
Panels come from category-card. THE differentiator is the TITLE: name it by the sector's mental model — 'تسوق بأنميك المفضل' (anime), 'تسوقي بالمناسبة' (gifts), 'حسب نوع البشرة' (skincare).

## Pitfalls & graceful degradation
1) Categories without images look weak — the placeholder fallback is mandatory (upstream just hides the img on error). 2) Odd counts (5 categories in a 3-col grid) leave orphans — suggest 3/6/9.

## Sector adaptation
Franchise naming for fandom stores; occasion for gifts; concern/need for beauty & health.

## Image/media specs
Category images: square, ≥320×320.

## QA checklist
- [ ] Every picked category has an image (or placeholder shows branded)
- [ ] Count fits the grid
- [ ] Title uses sector language
