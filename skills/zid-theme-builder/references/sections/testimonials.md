# Section: testimonials (آراء العملاء)

## Purpose & when to use
Social proof: rating (range) + quote (textarea) + name, in an embla carousel.

## Schema fields (live inventory)
| Field | Type | Notes |
|---|---|---|
| `title` | text | default: وش قالوا عملاؤنا |
| `testimonials` | list |  |
| `testimonials → rating` | range | default: 5 |
| `testimonials → text` | textarea |  |
| `testimonials → name` | text |  |

## Template anatomy & data flow
Embla slides; each slide a card. Content is MANUALLY entered by merchant (not synced with product reviews).

## JS behavior
Embla.

## Identity styling hooks
Slides become cut-corner quote panels with the ❝ mark via `.section-testimonials` rules; dots inherit global styling.

## Pitfalls & graceful degradation
1) Manual quotes ≠ product reviews — tell merchants to paste REAL reviews (with permission) for credibility; invented quotes are a trust (and ethics) fail. 2) Very long quotes break card heights — advise ≤200 chars.

## Sector adaptation
High-consideration sectors (supplements, skincare, jewelry) put this ABOVE the fold-2 line; casual sectors keep it lower.

## Image/media specs
Text only.

## QA checklist
- [ ] 3–6 real quotes
- [ ] Names or handles present
- [ ] Ratings honest (not all 5.0)
