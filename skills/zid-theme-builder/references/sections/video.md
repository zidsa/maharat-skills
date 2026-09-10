# Section: video (فيديو)

## Purpose & when to use
Motion trust: unboxings, product-in-use, brand film. Uploaded video (mp4/webm/ogg, ≤10MB) + poster image.

## Schema fields (live inventory)
| Field | Type | Notes |
|---|---|---|
| `title` | text | default: شاهد الجديد |
| `poster_image` | image | ارفع صورة بحجم 1500 × 700 بكسل |
| `video` | video | يدعم mp4, webm, ogg - الحد الأقصى 10MB |
| `autoplay` | checkbox | default: False |

## Template anatomy & data flow
`<video>` with poster (1500×700), `.video-overlay` (title + play button) that fades on play. `autoplay` checkbox — when on, browsers require MUTED autoplay.

## JS behavior
Inline play/overlay toggle.

## Identity styling hooks
Overlay tint + manga play button styled via `.video-overlay` rules.

## Pitfalls & graceful degradation
1) 10MB limit is tight — advise 720p, ≤60s, H.264, or the upload fails/stutters. 2) Autoplay with sound is blocked by browsers — if autoplay on, video must be muted. 3) Always set a poster or first paint is a black box.

## Sector adaptation
Anime: unboxing mystery drops. Beauty: application tutorial. Electronics: 30s feature demo.

## Image/media specs
Poster 1500×700; video ≤10MB.

## QA checklist
- [ ] Poster set
- [ ] Plays on mobile
- [ ] File ≤10MB
- [ ] Overlay title readable
