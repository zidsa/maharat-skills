# Section: partners (شركاؤنا)

## Purpose & when to use
Authority by association: brand/licensor/press logos with optional links.

## Schema fields (live inventory)
| Field | Type | Notes |
|---|---|---|
| `title` | text | default: شركاؤنا |
| `store_partners` | list |  |
| `store_partners → image` | image |  |
| `store_partners → image_mobile` | image | اختياري - يستخدم صورة سطح المكتب إذا لم يتم تحديده |
| `store_partners → url` | url |  |
| `store_partners → name` | text |  |

## Template anatomy & data flow
`store_partners` list (logo image + mobile variant + url + name) rendered as a logo row.

## JS behavior
None.

## Identity styling hooks
Framed logos on paper background, grayscale→color hover via `.section-partners img`.

## Pitfalls & graceful degradation
1) Mixed logo backgrounds (white boxes vs transparent) look messy — the identity CSS forces a uniform paper chip to fix this. 2) For fan-merch stores, only list partners you genuinely have — never imply unlicensed affiliation with IP holders.

## Sector adaptation
Anime: distributors/licensors. Perfume: brand houses. Electronics: authorized-reseller badges. B2B-ish trust for all.

## Image/media specs
Logos ≥240px wide, transparent PNG/SVG preferred.

## QA checklist
- [ ] 4–8 logos
- [ ] All real relationships
- [ ] Links open partner pages
