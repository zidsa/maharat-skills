# Section: countdown (العد التنازلي)

## Purpose & when to use
Urgency engine for drops/offers: badge + title + description + button over a background, with a live timer to `end_date`.

## Schema fields (live inventory)
| Field | Type | Notes |
|---|---|---|
| `badge_text` | text | default: لا تفوّته ⏳ |
| `title` | text | default: الإصدار الجاي ينزل خلال ⏱️ |
| `description` | textarea |  |
| `end_date` | text | اكتبه بصيغة: 2026-12-31 (سنة-شهر-يوم). لو التاريخ غير صحيح أو فاضي، يظهر القسم كبانر بدون عداد |
| `button_text` | text | default: ذكّرني عند النزول |
| `button_url` | url |  |
| `background_image` | image | ارفع صورة بحجم 1500 × 480 بكسل |
| `background_image_mobile` | image | ارفع صورة بحجم 414 × 480 بكسل |
| `overlay_opacity` | range | default: 5 |

## Template anatomy & data flow
Background picture + primary-tinted overlay + two-column content (copy | timer). Timer digits are 4 boxes updated by an inline script every second.

## JS behavior
Inline IIFE: parses `end_date`, ticks every 1s. OUR FORK adds graceful degradation (see pitfalls) — keep it when updating from upstream.

## Identity styling hooks
Digit boxes = skewed identity plates with offset shadow (`.countdown-timer > div`).

## Pitfalls & graceful degradation
⚠️ THE canonical bad-input trap: `end_date` is a FREE TEXT field (no date type exists in Vitrin schemas). Upstream hides the ENTIRE content when the date is invalid/empty/past — merchants see only the background and think the theme broke. Required behavior (our fork): invalid/empty/past hides ONLY the timer; badge/title/button remain (section = normal banner). Parse tolerantly (`/`→`-`, trim). The field info MUST show the format (2026-12-31) AND the fallback behavior.

## Sector adaptation
Anime/streetwear drops, Ramadan/White-Friday offers everywhere. Luxury uses it sparingly (scarcity ≠ discount noise).

## Image/media specs
Desktop 1500×480 · Mobile 414×480.

## QA checklist
- [ ] Date in YYYY-MM-DD and in the FUTURE
- [ ] Timer visible over image
- [ ] Invalid-date state shows banner (not blank)
- [ ] Button links to the drop
