# Merchant-Friendly Visual Prompt Builder — chat-only image/video requests

Whenever the theme needs images or videos from the merchant (images.md Paths B/C), EVERYTHING the merchant sees lives **inside the chat**, in simple non-technical Arabic, copy-paste ready. The file formats in `prompt-packs.md` (ASSET_REQUIREMENTS/VISUAL_PROMPTS/VIDEO_PROMPTS/asset_manifest) are INTERNAL build artifacts only — never surface them.

**Banned words in merchant-facing output:** asset_manifest · JSON · manifest · markdown/ملف .md · VISUAL_PROMPTS · scripts/سكربت · paths/مسار · folder/مجلد · schema · "راجع المرفقات" · "افتح ملف". Never say "سأضعها في ملف" — say it in the chat.

The merchant only needs 7 answers: كم صورة؟ وش اسم كل وحدة؟ وش مقاسها؟ وين تنحط؟ وش البرومت اللي ألصقه في Gemini/ChatGPT؟ ضرورية أو اختيارية؟ وبعدين أرجع أرفعها هنا بنفس الأسماء.

## Design-first — an image is a DESIGN DECISION, not a slot to fill

Think as a store designer + UX strategist, never as an image-slot filler. Before ANY image request, plan the interface: what's the homepage's goal? what must the visitor see first? which images actually serve selling? what can be filled from the store's existing media (product photos, collages, first-product-image per category) or an on-identity placeholder for now? Forbidden opener: "أحتاج صورة لكل تصنيف". Correct opener: "بناءً على المتجر، الواجهة تحتاج هذه الصور فقط الآن."

**Homepage category cap:** 3–6 categories in the store → show all · 7–12 → top 4–6 only · >12 → top 6 only. The rest live on the categories page (tabs/slider/"عرض كل التصنيفات" if needed) — NEVER a 12-tile category wall on home.

**Category scoring (pick the top, never random):** product count · main-nav presence · sales/orders via MCP · quality of its product photos · identity fit · main vs sub-category · does the visitor need it fast? Weak/sub/seasonal categories get NO dedicated image now; categories with strong product photos get a collage instead of a new request.

**First batch ≤ 5–7 images, always** (unless a strong stated reason): the ones that change the theme's face NOW — hero (desktop + mobile if a real field exists), 1–2 promo banners, top 4–6 category tiles. Everything else waits for batch 2 AFTER the merchant returns batch 1. Never exhaust the merchant.

**Priority levels:** المستوى الأول ضروري الآن (hero, main promo, top categories, styled cart/checkout art if designed) → الثاني يحسّن (lifestyle, second banner, details, empty states) → الثالث لاحقاً (باقي التصنيفات, 404, no-results, seasonal, videos). Don't request level 2–3 before level 1 is done.

**Mandatory rationale BEFORE the prompts** — state the design decision or don't show prompts: "اخترت X صور فقط للدفعة الأولى لأن … الهيرو يحتاج نسختين لأن المقاس مختلف … التصنيفات المربعة صورة واحدة لأنها تشتغل على الجوال والكمبيوتر … بعرض أهم N تصنيفات فقط والباقي في صفحة التصنيفات." And always include the sentence: **"ما بطلب صور لكل شيء. بطلب فقط الصور التي تغيّر شكل الثيم فعلاً — الهدف أن تنجز بسرعة والثيم يطلع احترافي بدون زحمة."**

**Video restraint:** optional by default; simple store → don't ask at all; youthful/anime/fashion/luxury store → suggest ONE hero-video (8–12s, muted loop, no text). Three videos only for a big brand or an explicit premium request.

## Mandatory order of the merchant reply

### 1) Identity summary FIRST (never write a prompt before it)
Extract in Step 0 (store-analysis.md): sector, product type, target customer, price tier, real store colors + theme palette (hex), font/style, mood (فخم/شبابي/لطيف/طبي/تقني/مانجا...), the photography style that fits (product photography / lifestyle / 3D / editorial / cinematic / clean studio), where text space must be reserved (RTL: usually the RIGHT), and IP warnings. Then open with:

```
فهمت هوية متجرك:
متجرك في قطاع: ...
الألوان التي سأبني عليها الصور: ...
ستايل الصور: ...
مهم: لا تكتب أي نص داخل الصور، لأن الثيم سيضيف النصوص فوقها.
```

### 2) Counts — scale to the theme, never one-size
| Theme size | الحد الأدنى | احترافي |
|---|---|---|
| بسيط | 5–8 | 8–12 |
| متوسط | 8–12 | 12–18 |
| كبير / E2E كامل | 12–18 | 18–24 |
| براند ضخم/موسمي (فقط بمبرر حقيقي) | — | 24–32 |

Then tell the merchant: "الحد الأدنى المقبول: X صور · النسخة الاحترافية: Y صور (+فيديو اختياري) · بنبدأ بدفعة أولى من X صور أساسية، وبعد ما ترفعها نكمل الباقي." First batch stays ≤5–7 (design-first rule above).

### 3) Image blocks — essential first, EXACTLY this shape
Group as: **الصور الأساسية (ضرورية)** — hero desktop/mobile, slider/بنرين, main category tiles, empty-cart, secure-checkout → **صور تحسينية (يفضل)** — lifestyle, offers, details → **اختيارية** — 404, no-results, footer, seasonal.

```
🖼️ ١. البنر الرئيسي
المقاس: 1500 × 700
احفظها باسم: hero-desktop.jpg
الاستخدام: أعلى الصفحة الرئيسية
الأولوية: ضرورية
ملاحظة مهمة: خلّ يمين الصورة غامق وفاضي لأن الثيم سيكتب النص فوقها.

البرومت العربي:
"..."
للنتيجة الأدق — English prompt:
"..."
تجنب:
"بدون كتابة، بدون شعارات، بدون علامة مائية، بدون شخصيات أو ماركات محمية، بدون تشويه، بدون جودة منخفضة."
```

### 4) Closing line — always, verbatim
```
خلصت؟ ارفع الصور هنا بنفس الأسماء، وأنا أركبها في الثيم وأطلع لك ZIP جاهز.
```

## Desktop/Mobile variants — only when the design truly differs

Ask for TWO files ONLY when the ratio/composition genuinely changes between desktop and mobile (wide horizontal vs tall vertical) AND the theme/editor actually has a separate field. If the editor has twin same-size fields (gallery 650², benefits 200²), request ONE image and reuse it in both fields — never make the merchant produce two identical squares. If unsure whether a mobile field exists, CHECK THE THEME FIRST, then ask.

| Slot | Desktop | Mobile | Request |
|---|---|---|---|
| Hero / البنر الرئيسي | 1500×700 | 414×700 (different composition) | ✅ two files |
| Carousel slides | 1500×700 | 414×700 | ✅ two files |
| Countdown | 1500×480 | 414×480 | ✅ two files |
| Gallery items | 650×650 | same field size | one file, reused |
| Benefits icons | 200×200 | same field size | one file, reused |
| Wide promos (home custom slots) | 1200×460 | CSS-responsive | one file |
| Category tiles (platform image / tile kit) | square 900×900 | same square serves both | one file |

Merchant phrasing — always state WHICH and WHY: "هذا المكان يحتاج نسخة سطح مكتب ونسخة جوال لأن المقاس مختلف" / "هذا المكان يحتاج صورة واحدة فقط، وتشتغل على الجوال والكمبيوتر." Naming: theme's exact filename when it exists (hero-desktop.jpg / hero-mobile.jpg), else `<slot>-desktop.jpg` / `<slot>-mobile.jpg`. Order: **البانرات ← التصنيفات ← صور إضافية**.

**Paired slots = ONE combined prompt, not two blocks.** When a slot needs desktop + mobile, write a SINGLE prompt that explicitly orders TWO images in one go — same identity, same source photos, same scene family, but each with its own composition: «أبي منك صورتين بنفس الأجواء: الأولى أفقية WxH لسطح المكتب (المساحة الفاضية يمين) والثانية عمودية WxH للجوال (المساحة الفاضية فوق)» — and list BOTH save-as names in the block header. One paste → two files → a matching pair. Bonus tip to include when the merchant already made one version: "أرفق نسختك الجاهزة بنفس المحادثة وقل له: طلّع نسخة الجوال من هذه الصورة بنفس الأجواء."

## Prompt anatomy — every single prompt must contain
1. **Type** (بنر/سلايدر/تصنيف/lifestyle/سلة/دفع/404) · 2. **exact size** · 3. **usage** · 4. **the store's identity**: real hex colors, sector, mood, lighting, background · 5. **composition + text space** (which side stays empty — RTL default: right) · 6. quality words (high-end ecommerce, premium, sharp, cinematic, clean composition) · 7. the avoid-list · 8. **theme compatibility** (dark theme → never white backgrounds; فاخر → no color clutter; شبابي → energy/motion; طبي → clean/calm; عطور → soft luxury light; أنمي/مانجا → halftone + speed lines + panels, never known characters) · 9. **grounding in the real store — ATTACH FILES, don't rely on URLs**: AI image tools (Gemini/ChatGPT) fetch external URLs UNRELIABLY (they'll say "ما قدرت أفتح الصورة" even for a working 200 URL). So the robust path: download the store's product images yourself and hand the merchant a folder of attach-ready files with clear names (`ون-بيس-1.jpg`…); the prompt says "أرفق الصور المرفقة وركّبها كبوسترات — لا ترسمها من جديد". Only include raw `media.zid.store` URLs as a secondary fallback, never the sole source. **NEVER invent a store page URL** (e.g. a guessed `/products/<slug>`) — it 404s and blocks the tool; verify with curl or omit the page link entirely (the attached images carry the content). For a category with no harvested image, tell the merchant "افتح القسم بمتجرك واحفظ صورتين وأرفقهم" — never guess a URL. 10. **analyze-first instruction (always):** every prompt that references images OPENS with "افتح الصور المرفقة/الروابط وحلّل محتواها أولاً (وش فيها بالضبط) ثم ركّبها كما هي — لا ترسمها من جديد". This forces the tool to understand the real merchandise before compositing, so it places the right product in the right scene.

A generic prompt like "anime poster store banner" is FORBIDDEN.

**Category prompts additionally require a Category Brief first** (visual-decision-layer.md → Category Intelligence Layer): the category's type, products, audience, intent, its OWN motif and accent — and the merchant block gains a "فهمي للتصنيف" section + "سبب اختياره". One prompt recycled across categories with the name swapped = automatic fail.

## The three paths — merchant phrasing (decision logic in images.md)
- **A (المتجر فيه صور):** "لقيت عندك صور كافية، بستخدمها في الثيم وأجهز أماكن الصور القابلة للتغيير." Only request what's genuinely missing (hero/banners).
- **B (عنده صور بجهازه):** "ارفع لي الصور التالية بنفس الأسماء، ولو عندك صور جاهزة مختلفة عادي ارفعها وأنا أركبها." + simple table: اسم الصورة · المقاس · الاستخدام · ملاحظة.
- **C (ما عنده صور):** open with the 4 steps — "١) افتح Gemini أو ChatGPT ٢) انسخ البرومت ٣) احفظ الصورة بالاسم المكتوب ٤) ارجع ارفعها لي هنا" — then the blocks.

## Video — same treatment
"الفيديو اختياري، لكنه يخلي الثيم أفخم. إذا تقدر تسويه، هذه البرومتات:" then 🎥 blocks (المقاس 1920×1080 · المدة 8–12 ثانية · احفظه باسم hero-video.mp4 · بدون صوت، loop، بدون كتابة + عربي/English/تجنب). If video generation isn't available: "عادي، نستخدم صورة ثابتة مع حركة خفيفة داخل الثيم." (Zid limit: ≤10MB, 720p H.264 — keep internal, just tell the merchant "لو طلع الملف كبير أرسله لي وأنا أضغطه".)

## Hard rules (ممنوعات)
- Never ask "وش تبغى صور؟" — state "هذه الصور التي أحتاجها لثيمك."
- No prompt without a size. No prompt without احفظها باسم. No generic/off-identity prompts. No colors that fight the theme.
- No text inside images; no copyrighted characters/logos/watermarks.
- The theme NEVER waits for images to work: ship on-identity placeholders meanwhile and tell the merchant "الثيم شغال الحين — وصورك بترفع مستواه أول ما ترجعها."
- Never request an image per category automatically · never Desktop/Mobile automatically · never show every category on the homepage · never exceed 5–7 images in the first batch without a strong reason · never repeat the same prompt across categories with only the name changed (each category gets its own scene/color accent) · never request images the theme can't use · never act as a prompt vending machine — think UX first, explain the count, start with what matters, reuse the store's own media.

## Fixed identity block — anime/manga sector (Manga Frame and similar)
Bake this into every prompt for this sector:
```
متجر سعودي متخصص في بوسترات الأنمي والمانجا والمقتنيات. ستايل داكن فخم سينمائي.
الألوان: أسود حبري #0E0E12، أحمر مانجا #E63946، أصفر ذهبي #FFC53D، ورقي دافئ #F5F1E8.
أسلوب بصري: manga panels، halftone dots، speed lines، إضاءة سينمائية، بوسترات مؤطرة، غرفة جامع.
ممنوع: شخصيات أنمي معروفة، شعارات، كتابة داخل الصورة، علامات مائية.
```
Core sizes: hero 1500×700 · hero mobile 900×1200 · slider 1500×640 · promo 1200×460 · category 900×900 · lifestyle 1200×1200 · states 1200×800 أو 900×900.

## Output contract per execution
Every theme build outputs to the merchant, in chat: (1) identity summary → (2) image count (min/pro) → (3) video count if any → (4) essential images first → (5) Arabic prompt per image → (6) English prompt per image → (7) avoid-list → (8) the closing line. Simple, as if explaining to a non-technical merchant.
