# مهارات زد

المستودع الرسمي لحزم مهارات التجارة الإلكترونية في [مهارات زد](https://skills.zid.sa/). يضم حاليًا **212 حزمة Agent Skills عربية** من إعداد عبدالرحمن الناشري، ومستضافة ضمن منظمة [zidsa](https://github.com/zidsa).

كل مهارة حزمة مستقلة وليست ملف `SKILL.md` فقط. تحتوي الحزمة على تعليمات التشغيل، وقالب المخرجات، والمراجع، والأمثلة، وأدوات التحقق اللازمة لها.

## استعراض المهارات

```bash
npx skills add https://github.com/zidsa/maharat-skills --list
```

## تثبيت مهارة واحدة

```bash
npx skills add https://github.com/zidsa/maharat-skills --skill merchant-lead-01
```

استبدل `merchant-lead-01` باسم أي مهارة موجودة داخل مجلد `skills`.

## بنية الحزمة

```text
skills/<skill-name>/
├── SKILL.md
├── LICENSE.txt
├── agents/
├── assets/
├── examples/
├── references/
└── scripts/
```

قد تختلف الملفات المرافقة بحسب احتياج المهارة، لكن يبقى `SKILL.md` هو نقطة البداية.

## التحقق من المخرجات

إذا كانت الحزمة تحتوي على أداة تحقق، شغّلها بعد حفظ النتيجة بصيغة Markdown:

```bash
node skills/<skill-name>/scripts/validate-output.mjs result.md
```

## الروابط الرسمية

- الموقع: [skills.zid.sa](https://skills.zid.sa/)
- مستودع الموقع: [zidsa/zid-skills](https://github.com/zidsa/zid-skills)
- مستودع المهارات: [zidsa/maharat-skills](https://github.com/zidsa/maharat-skills)

## المساهمة

افتح طلب دمج يضيف مجلد المهارة كاملًا داخل `skills/`. لا ترسل `SKILL.md` منفردًا إذا كانت المهارة تحتاج مراجع أو أمثلة أو أدوات تحقق.

## الحقوق

حقوق المحتوى محفوظة لعبدالرحمن الناشري. راجع ملف `LICENSE` في جذر المستودع وملف `LICENSE.txt` داخل كل حزمة.
