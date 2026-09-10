# Section: carousel (دوّار الصور)

## Purpose & when to use
Multi-slide hero alternative for campaign rotation. Use it INSTEAD of hero when the merchant runs several concurrent campaigns — never stack carousel directly above/below a hero.

## Schema fields (live inventory)
| Field | Type | Notes |
|---|---|---|
| `style_variant` | select | default: default |
| `min_height_mobile` | range | default: 700 |
| `min_height_desktop` | range | default: 700 |
| `transition_effect` | select | default: fade |
| `autoplay_enabled` | checkbox | default: True |
| `autoplay_delay` | range | default: 4000 |
| `show_dots` | checkbox | default: True |
| `slides` | list |  |
| `slides → background_image` | image | ارفع صورة بحجم 1500 × 700 بكسل |
| `slides → background_image_mobile` | image | ارفع صورة بحجم 414 × 700 بكسل |
| `slides → background_position` | select | default: center |
| `slides → overlay_opacity` | range | default: 0 |
| `slides → text_alignment` | select | default: start |
| `slides → badge_text` | text | default: NEW COLLECTION |
| `slides → heading` | text | default: Superbloom 2025 |
| `slides → description` | textarea | default: Step into the season with flowing silhouettes and effortless elegance. |
| `slides → button_text` | text | default: Shop the Collection |
| `slides → button_url` | url |  |

## Template anatomy & data flow
Embla-based. Each slide = background image (desktop/mobile) + overlay + aligned content block (badge/heading/description/button). `transition_effect` select, `autoplay_enabled` + `autoplay_delay` (ms range), `show_dots` toggle. Slides are a `list` setting — merchant adds unlimited.

## JS behavior
Embla carousel via theme's `lib/carousel.js` (`createCarousel`). Re-inits on `content:loaded`.

## Identity styling hooks
Dots/arrows are styled GLOBALLY (`.embla__dots`, `.embla__button`) — skewed dashes + ink buttons — so this section inherits automatically, as do product carousels.

## Pitfalls & graceful degradation
1) Autoplay delay is in MILLISECONDS — merchants type 5 expecting seconds; guide with info text or sane default (5000). 2) Empty slides list renders nothing: acceptable, but pair the editor preview PNG so merchants understand. 3) Per-slide `text_alignment` — verify RTL start/end behavior after changes.

## Sector adaptation
Fashion/anime: 2–4 campaign slides, autoplay on. Luxury: autoplay OFF (let imagery breathe), dots only. Electronics: slide per product line.

## Image/media specs
Same as hero: 1500×700 / 414×700 per slide.

## QA checklist
- [ ] Autoplay delay ≥4000ms
- [ ] Dots visible over all slide images
- [ ] Each slide's button_url set
- [ ] Swipe works in RTL
