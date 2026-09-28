<div dir="rtl">

# 🎨 صمّم ثيم متجرك — مهارة بناء ثيمات زد

مهارة من زد تحوّل المساعد إلى **مصمم ثيمات لمنصة زد (Vitrin)**: يحلل متجرك، يدرس مجالك، يصمم هوية كاملة (ألوان، خطوط، أشكال)، يبني كل الصفحات **بصور حقيقية غير فاضية**، ويسلّمك ملف ZIP جاهزًا للرفع.

> اكتب للمساعد: **"صمم لي ثيم لمتجري في زد"**.

---

## التثبيت

من المصدر الرسمي فقط:

```bash
npx skills add https://github.com/zidsa/maharat-skills --skill zid-theme-builder
```

أو افتح صفحة المهارة في https://skills.zid.sa/skills/zid-theme-builder، وأدخل رابط متجرك وصورك، ثم انسخ الطلب المخصص إلى Claude أو ChatGPT أو Manus.

---

## 💬 طلب جاهز تنسخه

```
ثبّت مهارة zid-theme-builder من https://github.com/zidsa/maharat-skills واتبع تعليماتها لتبني لي ثيم زد كامل.

رابط متجري: https://ضع-رابط-متجرك-هنا.zid.store

اللي أبيه:
1. افهم متجري أول — منتجاتي وتصنيفاتي وألواني — قبل ما تصمم أي شي.
2. ابنِ لي ثيم كامل: كل الصفحات بنفس الهوية، والصفحة الرئيسية مليانة من أول تفعيل.
3. الصور: استخدم صور منتجاتي إذا فيه. الناقص أعطني برومتاته هنا بالمحادثة أسوّيها وأرجعها لك.
4. في النهاية أعطني: ملف ZIP جاهز للرفع + اسم الثيم ووصفه + خطوات الرفع على زد.
5. لا ترفع ولا تفعّل أي شيء على متجري بدون موافقتي الصريحة.
```

المساعد سيقرأ المهارة، يحلل متجرك، يقترح عليك هوية، يبني الثيم كاملاً، ويسلّمك ملف ZIP ترفعه من: لوحة التحكم ← سوق الثيمات ← الثيمات المخصصة.

> يعمل السكيل أيضاً على **ChatGPT وGemini** — الصق `SKILL.md` كتعليمات وأرفق ملفات `references/` كمعرفة. التفاصيل في `references/platform-adapter.md`.

---

## 🧠 وش يسوي السكيل؟

| المرحلة | التفاصيل |
|---|---|
| **يفهم متجرك** | يقرأ متجرك الحي + بيانات MCP (المنتجات، التصنيفات، الأكثر مبيعاً) قبل ما يلمس كود |
| **يدرس السوق** | يبحث عن المتاجر الرائدة في قطاعك ويستخرج أنماطها المثبتة (بدون نسخ) |
| **يصمم الهوية** | مصفوفة 16 قطاع سعودي: لوحة ألوان + خط عربي + **لغة أشكال** كاملة (مو مجرد تلوين) |
| **يعبّي الصور** | نظام صور إلزامي — يسحب صور متجرك، أو يطلب صورك بأسماء محددة، أو يعطيك برومتات جاهزة لتوليدها؛ **لا يسلّم ثيم بصور فاضية** |
| **يبني كل شي** | كل الـ 14 صفحة + رئيسية غنية (سلايدر بانرات، منتجات حية، أسئلة شائعة، واتساب) + شاشة تحميل بالشعار |
| **يسلّم جاهز** | `scripts/package_theme.sh` يتحقق ويحزم ZIP نظيف مضمون القبول — ويرفع تلقائياً لو `vitrin-cli` مسجّل دخول |

## 📋 المتطلبات

- **Claude Code** (الأفضل) أو claude.ai مع تفعيل Code Execution
- Node.js 18+ (لبناء الثيم ولـ `vitrin-cli`)
- متجر زد على **الباقة الاحترافية+** (أو خدمة الثيم المخصص) لتفعيل الثيم

## 🗂️ بنية السكيل

```
zid-theme-builder/
├── SKILL.md                    # القواعد الذهبية + الـ workflow الكامل
├── README.md
├── references/                 # مراجع متخصصة (تُقرأ عند الحاجة)
│   ├── store-analysis.md       #   فهم المتجر قبل التصميم (+ ربط ZAM MCP)
│   ├── design-research.md      #   دراسة قادة القطاع
│   ├── sector-identities.md    #   هويات 16 قطاع سعودي
│   ├── images.md               #   نظام الصور الإلزامي (لا صور فاضية)
│   ├── prompt-packs.md         #   برومتات توليد الصور والفيديو
│   ├── platform-adapter.md     #   التوافق: Claude / ChatGPT / Gemini
│   ├── page-coverage.md        #   تغطية كل صفحة + لغة الأشكال
│   ├── delivery-package.md     #   ملفات التسليم + خطوات الرفع على زد
│   ├── architecture.md         #   بنية growth-theme
│   ├── merchant-prompts.md     #   طلب الصور من التاجر بالمحادثة (بدون ملفات تقنية)
│   ├── visual-decision-layer.md#   الصورة قرار تصميمي (أهم ٤-٦ تصنيفات، دفعة صغيرة)
│   ├── theme-editor-matrix.md  #   كل ما يعدله التاجر من المحرر
│   ├── zid-root-zip-rules.md   #   قواعد ZIP الصارمة لزد
│   ├── sections/               #   12 ملف إتقان لكل قسم
│   └── schemas.md · jinja-extensions.md · customization-recipes.md · cli-and-deploy.md
└── scripts/
    ├── package_theme.sh        # تحقق + تدقيق + تغليف (Unix)
    ├── zip_theme.py            # تغليف بفاصل / صحيح (Windows/كل المنصات)
    ├── validate_zid_zip.py     # فحص ZIP ضد قواعد زد
    └── audit_full_store.py     # فحص اكتمال الثيم E2E
```

## 🔒 النطاق والأمان

- رابط MCP الخاص بكل متجر (ZAM) يحمل بيانات اعتماد سرية. أضفه بنفسك في إعدادات الموصلات في المساعد، ولا تلصقه في المحادثة ولا تحفظه في ملفات المهارة. إذا انكشف، جدّده من تطبيق ZAM فورًا.
- المهارة لا ترفع الثيم ولا تفعّله على متجرك إلا بعد موافقتك الصريحة، والتفعيل يحتاج موافقة ثانية مستقلة.

## 🧯 حل المشاكل الشائعة

| المشكلة | السبب والحل |
|---|---|
| **Missing required templates: templates/home.jinja** | الأرشيف بفاصل خلفي `\` (PowerShell/.NET على ويندوز). غلّف بـ `python scripts/zip_theme.py <theme> <out.zip>` — يكتب `/` الصحيح. |
| **لا يسمح برفع ملفات إضافية** | ملفات زائدة (node_modules / dev configs / `.mo`). التغليف الرسمي يستثنيها؛ شغّل `validate_zid_zip.py` للتأكد. |
| **الثيم فيه مجلد أب داخل ZIP** | غُلّف المجلد نفسه بدل محتواه. استخدم `zip_theme.py` (يضع الملفات في الجذر). |
| **الصفحة الرئيسية فاضية بعد التفعيل** | `home.jinja` يعتمد على `template_components` فقط. القاعدة: fallback مصمم داخل home.jinja؛ `audit_full_store.py` يمنع تسليمها. |
| **صور مكسورة** | مرجع صورة غير موجود في `assets/images`. `audit_full_store.py` يكشفها قبل التغليف. |
| **Shopify/Salla detected** | ملفات منصة أخرى في المجلد. السكيل حصري لزد ويرفضها. |
| **التعديلات ما ظهرت بالمتجر** | زد لا يحدّث تلقائياً — ارفع الـZIP الجديد كثيم جديد وفعّله، ثم Ctrl+F5. |
| **الشعار الأسود ما يبان على الثيم الداكن** | يُبيّض عبر CSS (`filter:invert` على شعار المتجر الحقيقي) — لا تخترع شعاراً. |

## 🤝 المساهمة

Issues و PRs مرحب بها. عند التعديل: تأكد أن `python -m py_compile scripts/*.py` يمر، وأن `validate_zid_zip.py` و`audit_full_store.py` ينجحان على ثيم تجريبي قبل التسليم.

</div>

---

<div dir="ltr">

**English TL;DR:** Official Claude Skill that turns Claude into a professional Zid (Vitrin) theme builder — store analysis → competitive research → full identity design → **mandatory image pipeline (no empty images)** → all pages → validated upload-ready ZIP (or auto-deploy via `vitrin-cli`). Also runs on ChatGPT & Gemini. One-command install above. Zid-exclusive by design.

</div>
