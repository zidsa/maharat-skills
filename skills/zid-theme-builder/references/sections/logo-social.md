# Section: logo-social (الشعار والتواصل الاجتماعي)

## Purpose & when to use
Brand block: store logo + social icons pulled from the store's configured social links. Only min-height settings exist — content is automatic.

## Schema fields (live inventory)
| Field | Type | Notes |
|---|---|---|
| `min_height_mobile` | range | default: 200 |
| `min_height_desktop` | range | default: 280 |

## Template anatomy & data flow
Centered logo + icon row; heights via two ranges.

## JS behavior
None.

## Identity styling hooks
Playful icon hover (tilt+scale+accent) via `.section-logo-social a`.

## Pitfalls & graceful degradation
Icons only appear if socials are set in store settings (لوحة التحكم) — an 'empty' section here means the MERCHANT SETTINGS are empty, not the theme. Tell them where to fill it.

## Sector adaptation
Community-heavy sectors (anime, gaming, fashion) place it high; utility sectors keep it near footer.

## Image/media specs
Uses store logo as configured.

## QA checklist
- [ ] Store social links filled in dashboard
- [ ] Logo crisp on dark/light
