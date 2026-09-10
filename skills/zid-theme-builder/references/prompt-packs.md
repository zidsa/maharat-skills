# Prompt packs — image & video generation for merchants (Path C) — INTERNAL formats

> ⚠️ **Everything in this file is an INTERNAL build artifact.** The merchant NEVER sees these files or their names — all merchant-facing communication (the prompts themselves, counts, tables) is rendered in the chat per `references/merchant-prompts.md`. Use this file for the pack-sizing math, prompt anatomy, and the machine-readable records.

When the store's own media can't fill a slot (Path A) and the user has no files to upload (Path B), produce a **prompt pack**: ready-to-paste generation prompts the user runs in Gemini / ChatGPT / any image tool — or that YOU run directly when the platform supports image/video generation (see `platform-adapter.md`). The filenames are the API: whatever comes back with the exact filename drops into `assets/images/` and the theme picks it up without code changes.

## Pack sizing — how many images a store needs

Count from the Phase 0 slot inventory (images.md), scaled by the store:

| Group | Formula | Typical |
|---|---|---|
| A — Identity & home (hero ×2, slider 2–3 slides, wide promos ×2, footer/brand visual) | fixed | 6–8 |
| B — Category tiles | 1 × each real merchandising category (skip test/empty categories) | 6–12 |
| C — Lifestyle / product-mood (gallery, promo, packaging/shipping shot) | 4–7 | 5 |
| D — States & services (empty cart, no results, 404, secure checkout) | fixed | 4 |
| Videos (hero loop desktop + mobile, social reveal) | optional tier | 0–3 |

**Baseline:** ~16 images = acceptable minimum · ~28 images + 3 videos = the professional pack. State both tiers to the user and let them choose.

## The per-image template (every entry in VISUAL_PROMPTS.md)

```markdown
## <filename>.webp
Size: <W>x<H>
Usage: <slot — e.g. Homepage hero desktop>
Priority: required | recommended | optional
Arabic prompt:
"<وصف كامل بالعربي: القطاع، المشهد، الإضاءة، الحالة، لوحة الألوان بأسمائها، عناصر الهوية، مساحة فارغة للنص، بدون شعارات، بدون نص داخل الصورة>"
English prompt:
"<full English version of the same prompt>"
Negative prompt:
"no copyrighted characters, no readable text, no logos, no watermarks, no low resolution, no distorted anatomy, no real brand names"
Alt: "<وصف alt عربي قصير للسيو>"
```

## Identity injection — prompts must carry the theme's DNA

Every prompt embeds, explicitly: the palette (name the colors: "إضاءة حمراء وصفراء" not "ألوان جميلة"), the sector mood from `sector-identities.md`, the shape language (halftone dots, speed lines, panels — whatever the identity mandates), and camera/lighting direction. Generic prompts produce generic stores.

**Ground the prompt in the REAL store (user-mandated):** every prompt also includes (a) the live storefront URL with an instruction to browse it for context, and (b) 2–4 DIRECT public image URLs of the store's actual products (`https://media.zid.store/<store-uuid>/<image-id>.jpeg` — harvested in Phase A) with the instruction to composite THOSE photos into the banner (framed/arranged), not to redraw them. This makes ChatGPT/Gemini output use the merchant's real merchandise. Add one fallback line: "لو ما قدرت تفتح الروابط قل لي" so the merchant knows to paste the images manually.

## Hard rules (non-negotiable, in EVERY prompt)

1. **No copyrighted characters/IP** — "inspired" moods, silhouettes, and motifs only. This applies double to fan-merch stores: a "ون بيس" category tile is a pirate-adventure manga mood with a straw-hat *silhouette motif*, never a recognizable character. (The safest category tile is still a Path A collage of the merchant's own product photos — offer that first.)
2. **No text baked into images** — AI Arabic typography is unreliable; the theme overlays text. Prompts must say "بدون نص داخل الصورة" and reserve empty copy space (state which side — mind RTL).
3. **No fake product photography** — never depict products the store doesn't sell as if they were real listings. Lifestyle/mood shots only.
4. Exact sizes from the slot table in images.md; formats: `.webp` or `.jpg` for photos, transparent `.png` for icons.

## Video prompt packs (VIDEO_PROMPTS.md)

Same template with Duration added. Standard slots:

| File | Size | Duration | Usage |
|---|---|---|---|
| hero-loop-desktop.mp4 | 1920×1080 | 8–12s, muted seamless loop | home hero background |
| hero-loop-mobile.mp4 | 1080×1920 | 8–12s, muted loop | home hero mobile |
| product-reveal-social.mp4 | 1080×1920 | 10–15s | video section / social |

Zid constraints (video section): mp4/webm/ogg, **≤10MB** — instruct 720p H.264 compression in the prompt notes, and ALWAYS pair a `poster_image` (black-box rule, images.md). If no video materializes: CSS-motion fallback on the hero image (parallax, floating shapes, animated halftone, marquee) — never an empty video slot.

## The round-trip contract (tell the user exactly this)

1. خذ البرومتات من `VISUAL_PROMPTS.md` / `VIDEO_PROMPTS.md` والصقها في Gemini أو ChatGPT (أو أي أداة توليد).
2. احفظ كل نتيجة **بنفس اسم الملف المكتوب فوق البرومت** — الاسم هو العقد.
3. ارجع ارفع الملفات لي — أدخلها في `assets/images/`، أعيد البناء والتغليف، وأسلمك ZIP محدث.

Until then the theme ships with on-identity SVG placeholders in those slots (images.md Phase B tier 3), so it still looks finished on activation — the generated files upgrade it, they don't unblock it.

## Deliverable files this reference produces

- `ASSET_REQUIREMENTS.md` — the request table: filename · size · usage · priority · source path (A/B/C). This is also what Path B sends the user ("ارفع لي هذه الملفات بهذه الأسماء") — one clear list, never a vague "ارفع صور".
- `VISUAL_PROMPTS.md` / `VIDEO_PROMPTS.md` — full packs per the templates above (Path C only).
- `asset_manifest.json` — final record per slot: `{slot, file, source: "store-media" | "user-upload" | "generated" | "placeholder", original_url?, size}` — feeds the images.md QA-gate audit table.
