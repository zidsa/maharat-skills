# Visual decision layer — an image is a design decision, not a slot to fill

The counting/priority/desktop-mobile rules and the exact merchant-facing wording live in `merchant-prompts.md`. This file is the THINKING that runs BEFORE any prompt is written. Never emit an image request without first answering the decision block below.

## The forbidden defaults
- ❌ request an image for every category automatically
- ❌ request Desktop/Mobile for every image (or every category) automatically
- ❌ show all categories on the homepage / turn it into a category catalog
- ❌ dump 12–13 designs on the merchant at once
- ❌ repeat one prompt across categories with only the name changed
- ❌ request images the theme can't actually use

## Decision block (write it internally, then surface the rationale)
1. What is the homepage's goal? What must the visitor see first?
2. Which 4–6 categories matter most, and WHY (score below)?
3. What needs NO new image now (weak/sub/seasonal categories, slots the store's own photos already fill)?
4. Where do we reuse existing product photos / a collage instead of asking?
5. Which slots genuinely need a new image?
6. Does each slot have a real mobile field / a different composition? (check schema/template — don't assume)
7. What is the logical FIRST batch (≤5–7 images)?

## Category scoring (pick the top, never random)
Score each category by: product count · sales/orders via MCP · main-nav presence · quality of its product photos · identity fit · main vs sub-category · does the visitor need it fast. Then:
- 3–6 categories in store → may show all
- 7–12 → top 4–6 on home, rest on categories page
- >12 → top 6 on home, rest on categories page
- strong product photos → collage from them, don't request new
- weak/sub/seasonal → no dedicated image now

## Desktop / Mobile — by design, not reflex
Two files ONLY when composition truly differs (horizontal vs vertical) AND a real field exists: hero, wide slider, big background banner, media sections. One file when the slot is a responsive square/card (category tile, product image) or the theme reuses the same asset both ways. If unsure whether a mobile field exists → inspect the schema/template first. Paired slots = ONE combined prompt that outputs both (merchant-prompts.md).

## First-batch discipline
≤5–7 images that change the theme's face NOW (hero desktop + mobile-if-real, 1–2 promo banners, top 4–6 category tiles if missing, cart/checkout art only if the page is visually built on it). Everything else — remaining categories, lifestyle, 404, no-results, video — waits for batch 2 after the first returns. Never exhaust the merchant.

## Mandatory rationale before prompts
State the design decision or don't show prompts: "اخترت X صور فقط الآن لأن… الهيرو يحتاج نسختين لأن المقاس مختلف… التصنيفات المربعة صورة واحدة لأنها تشتغل على الجوال والكمبيوتر… أعرض أهم N تصنيفات والباقي في صفحة التصنيفات." Always include: "ما بطلب صور لكل شيء — بطلب فقط الصور التي تغيّر شكل الثيم فعلاً؛ الهدف تنجز بسرعة والثيم يطلع احترافي بدون زحمة."

## The theme never waits
If a slot's real art isn't ready, ship an on-identity placeholder and keep building — the theme works NOW and upgrades when the merchant returns files. A homepage that depends on `template_components` alone (empty on activation) is a FAIL (page-coverage.md Home-Must-Not-Be-Empty).

---

# Category Intelligence Layer — understand the category BEFORE its prompt

A category is NOT a name to decorate. A category = products + audience + intent + a visual angle + what makes it different from its siblings. **No category prompt may be written from the category NAME alone.** Forbidden: "صورة جميلة لتصنيف العطور" · "بنر لتصنيف الملابس" · "anime category banner" · "صورة تصنيف فخمة" — and forbidden to reuse one prompt across categories with only the name swapped.

## Category Brief (mandatory before each category prompt)
For every category that earned a prompt (per the scoring above), build a brief: name · URL if verified · **type** (below) · main/sub/seasonal/service · product count · standout product names · available product photos (and their quality) · sales/importance from MCP if available · expected audience · customer intent (browse / quick-buy / compare / gift / customize) · selling value · its accent color WITHIN the store identity · its mood · its own **visual motif** · what distinguishes it from sibling categories · rights/sensitivity constraints · real product photos vs generic scene? · where the image appears (home / categories page / category page) · one file or D/M (check the theme, don't assume).

**Golden rule:** no Brief → no prompt. If the brief can't be filled, don't wing it — use the category's product photos, or say plainly: "ما عندي معلومات كافية عن هذا التصنيف — بستخدم placeholder بهوية المتجر مؤقتاً أو أحتاج صور منتجاته."

## Category types — each dictates the prompt's angle
1. **Product Family** (عود، قهوة مختصة، بوسترات أنمي) → the family, materials, overall form.
2. **Use Case** (هدايا، سفر، مكتب) → the usage scenario.
3. **Audience** (رجالي، أطفال، لاعبين) → the audience's taste, without stereotyping.
4. **Collection / Season** (رمضان، شتاء، اليوم الوطني) → the season/campaign.
5. **Brand / Franchise / World** (ون بيس، مارفل، كيبوب) → **merchant's REAL product photos only**, composited (frames/collage) — NEVER generate characters/logos from scratch; no photos → inspired generic mood, no copying.
6. **Service** (صمّم منتجك، تغليف هدايا) → the process, tools, creativity, empty "your design here" space.
7. **Sale / Bundle** (عروض، حزم) → energy, motion, visual clarity — still no text in the image.
8. **Information / Trust** (الشحن، الضمان) → calm, clear, reassuring — not promotional.

## The category prompt formula
`Category Prompt = store identity + the category's real meaning + its real products/photos + why it's featured + its OWN visual motif + its OWN accent color + composition for its placement + rights constraints + no-text/no-logos/no-watermark + ecommerce quality`.

Worked contrast (what "different angles" means):
- **عطور:** العود = خشب ودخان ناعم وذهب وفخامة داكنة · الزهور = بتلات وإضاءة ناعمة وألوان فاتحة · المسك = بياض وقماش وهدوء. ممنوع للجميع: "صورة عطر فاخرة".
- **قهوة:** بن مختص = حبوب وميزان وضوء صباحي · كبسولات = مطبخ عصري وسرعة · أدوات = سطح خشبي وإحساس barista. ممنوع: "صورة قهوة فخمة".
- **ملابس:** عبايات = قماش وحركة وقصّات · ستريت وير = مدينة وطاقة وزوايا · أطفال = مرح وألوان لطيفة. ممنوع: "صورة ملابس جميلة".
- **أنمي:** ون بيس = مغامرة وبحر ليلي وبوسترات المتجر الحقيقية · ناروتو = برتقالي ناري ودوامة هافتون بدون رسم شخصيات · قاتل الشياطين = موجات يابانية وتركواز/أحمر · تصميمك الخاص = استوديو وإطار فارغ. ممنوع: "مربع تصنيف أنمي بخلفية سوداء" لكلهم.

## Real product photos — how to use them
Category has real photos → the prompt says "استخدم صور المنتجات الحقيقية التالية ولا ترسمها من جديد" and composites them (framed posters / collage / shelf display / lifestyle scene / bundle layout / clean grid — per sector). Rights-sensitive categories (anime/brands/films) → merchant's product photos ONLY; build the scene AROUND the product (frame, wall, table, packaging); never "ارسم ناروتو". No photos at all → generic sector scene, never invented specific products.

## Merchant-facing category block (extends the standard block)
Add a "فهمي للتصنيف" section: نوع التصنيف · المنتجات/الفكرة · الزاوية البصرية · اللون/المزاج المناسب — plus سبب اختياره. The merchant should SEE that each category was understood, not templated.

## Category prompt quality gate — check before showing ANY category prompt
1. Built from the name only? → FAIL. 2. Not grounded in the category's products? → revise. 3. No category-specific motif? → revise. 4. Indistinguishable from sibling prompts? → revise. 5. Missing size/save-as/usage? → FAIL. 6. Breaks store identity? → FAIL. 7. Violates rights rules? → FAIL. 8. Image requested without a reason? → drop it. 9. D/M requested without a real need? → fix. 10. Batch too big for the merchant? → split.
Any failure → fix BEFORE the merchant sees it.

**Acceptance:** every category image must trace back to a clear Category Brief — its reason, its understanding, its products or visual angle, and how it differs from the rest. This applies to EVERY store, not just the current one.

---

# Analyze-before-wire — never place a returned image blind

Two guarantees, both mandatory:

1. **In the prompt (tool-side):** every generation prompt that references images opens with "افتح الصور وحلّل محتواها أولاً ثم ركّبها" (merchant-prompts.md item 10) — the AI tool must understand the reference before compositing.

2. **On return (my-side) — VERIFY each file before wiring it into the theme.** When the merchant sends generated/uploaded images, do NOT copy them blind into slots. For each file: **Read/inspect the image**, then confirm ALL of:
   - **content matches the intended slot/category** — a One Piece tile is not wired under Naruto; a hero scene is not dropped into a category square; the "empty frame" design goes to the custom-design service tile, etc. Map by what the image ACTUALLY shows, not just by its filename.
   - **aspect/orientation fits** the slot (hero = wide with the correct empty text side; mobile = vertical; category = square).
   - **identity holds** (dark bg, right palette, no baked text, no third-party logos/characters).
   Only then resize to the exact slot dimensions and place it. If a returned image is mislabeled or wrong for its slot, tell the merchant and re-map — never silently wire a wrong image. This is a hard gate before repackaging: a beautiful image in the wrong place is still a defect.
