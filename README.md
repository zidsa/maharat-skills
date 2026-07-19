# مهارات زد للتجارة

مستودع عام يضم **203 حزم Agent Skills عربية** للتجارة الإلكترونية، من إعداد عبدالرحمن الناشري.

كل مهارة حزمة مستقلة وليست ملف `SKILL.md` فقط. تحتوي الحزمة على عقد تشغيل للوكيل، قالب مخرجات، مراجع للمدخلات والسلامة، مثال استخدام، وأداة تحقق قابلة للتشغيل.

## استعراض المهارات

```bash
npx skills add abdulrahmanx97/zid-maharat-skills --list
```

## تثبيت مهارة واحدة

```bash
npx skills add abdulrahmanx97/zid-maharat-skills --skill merchant-lead-01
```

يمكن استبدال `merchant-lead-01` باسم أي مهارة موجودة داخل مجلد `skills`.

## بنية الحزمة

```text
skills/<skill-name>/
├── SKILL.md
├── LICENSE.txt
├── agents/
│   └── execution-contract.md
├── assets/
│   └── output-template.md
├── examples/
│   └── example-request.md
├── references/
│   ├── input-checklist.md
│   └── safety-checklist.md
└── scripts/
    └── validate-output.mjs
```

## التحقق من المخرجات

بعد تشغيل المهارة وحفظ النتيجة بصيغة Markdown:

```bash
node scripts/validate-output.mjs result.md
```

## الموقع

[تصفح مكتبة مهارات زد](https://zid-maharat-preview.gptalnashri.chatgpt.site/skills)

## الحقوق

حقوق المحتوى محفوظة لعبدالرحمن الناشري. راجع ملف `LICENSE` في جذر المستودع وملف `LICENSE.txt` داخل كل حزمة.
