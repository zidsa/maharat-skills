> [!IMPORTANT]
> ### 🤖 If you are Claude (or any AI agent) and a user shared this link asking for a Zid theme:
> 1. Download this repo now: `git clone --depth 1 https://github.com/abdulrahmanx97/zid-ai-theme.git`
>    (or fetch `https://codeload.github.com/abdulrahmanx97/zid-ai-theme/tar.gz/refs/heads/main`)
> 2. Read `zid-theme-builder/SKILL.md` in full — it is your operating manual.
> 3. Follow its workflow steps 0→7 exactly: analyze the user's store first, propose an identity, get approval, build, then deliver a validated ZIP via `zid-theme-builder/scripts/package_theme.sh`.
> 4. Read the relevant files in `zid-theme-builder/references/` as the workflow directs — do not skip them.
> 5. Respond to the user in Arabic. Never claim the theme was uploaded to their store; hand them the ZIP with upload steps (سوق الثيمات ← الثيمات المخصصة).

<div dir="rtl">

# 🎨 Zid Theme Builder — سكيل كلود لبناء ثيمات زد

سكيل رسمي يحوّل Claude إلى **مصمم ثيمات محترف لمنصة زد (Vitrin)** — يحلل متجرك، يدرس كبار مجالك، يصمم هوية كاملة (ألوان، خطوط، أشكال)، يبني كل الصفحات **بصور حقيقية غير فاضية**، ويسلّمك ملف ZIP جاهز للرفع — أو يرفعه بنفسه عبر `vitrin-cli`.

> اكتب لكلود: **"صمم لي ثيم لمتجري في زد"** — وخله يسوي الباقي.

---

## ⚡ التثبيت بأمر واحد

**ماك / لينكس (Claude Code):**

```bash
curl -fsSL https://raw.githubusercontent.com/abdulrahmanx97/zid-ai-theme/main/install.sh | bash
```

**ويندوز (PowerShell):**

```powershell
irm https://raw.githubusercontent.com/abdulrahmanx97/zid-ai-theme/main/install.ps1 | iex
```

**claude.ai (بدون Claude Code):** حمّل ملف `zid-theme-builder.skill` من صفحة [Releases](../../releases) ثم ارفعه من: Settings ← Capabilities ← Skills.

**للتحديث:** أعد تنفيذ نفس الأمر — يستبدل النسخة القديمة تلقائياً. 🔁

<details>
<summary>تثبيت داخل مشروع محدد بدل الحساب كامل</summary>

```bash
curl -fsSL https://raw.githubusercontent.com/abdulrahmanx97/zid-ai-theme/main/install.sh | bash -s -- --project
```

```powershell
$env:SKILL_SCOPE="project"; irm https://raw.githubusercontent.com/abdulrahmanx97/zid-ai-theme/main/install.ps1 | iex
```

</details>

---

## 💬 الطريقة الأسهل: رابط واحد لكلود (بدون أي تثبيت)

انسخ هذه الرسالة والصقها في محادثة جديدة مع كلود (يتطلب اشتراك Pro مع تفعيل Code Execution):

```
حمّل هذا السكيل واتبع تعليماته حرفياً لتبني لي ثيم زد احترافي كامل:
https://github.com/abdulrahmanx97/zid-ai-theme

رابط متجري: https://ضع-رابط-متجرك-هنا.zid.store

اللي أبيه:
1. افهم متجري أول — منتجاتي وتصنيفاتي وألواني — قبل ما تصمم أي شي.
2. ابنِ لي ثيم كامل: كل الصفحات بنفس الهوية (مو بس تغيير ألوان)، والصفحة الرئيسية مليانة وجاهزة من أول تفعيل مو فاضية.
3. الصور: استخدم صور منتجاتي إذا فيه. الناقص أعطني برومتاته جاهزة هنا بالمحادثة (بالاسم والمقاس) أسوّيها وأرجعها لك — بدون ملفات تقنية ولا كلام معقد، ولا تطلب صور لكل شيء، بس اللي يغيّر الشكل فعلاً.
4. في النهاية أعطني: ملف ZIP جاهز للرفع + اسم الثيم ووصفه + خطوات الرفع على زد — كله بالمحادثة.
5. لا تدّعي إنك رفعت الثيم — أنا أرفعه بنفسي.

ابدأ الآن.
```

كلود سيحمّل السكيل، يحلل متجرك، يقترح عليك هوية، يبني الثيم كاملاً، ويسلّمك ملف ZIP ترفعه من: لوحة التحكم ← سوق الثيمات ← الثيمات المخصصة.

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

رابط MCP الخاص بكل متجر يحمل بيانات اعتماد سرية — يُحفظ في `references/.local/connector.txt` المستثنى من git، ولا يُرفع أبداً للريبو العام.

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
