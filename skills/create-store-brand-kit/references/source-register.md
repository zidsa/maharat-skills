# سجل المصادر

تاريخ التحقق: 2026-08-24.

- [Zid Docs: Upload Logo Image](https://docs.zid.sa/upload-logo-image-35820591e0) — وجود رفع شعار المتجر بحسب اللغة.
- [Zid Docs: Upload Icon Image](https://docs.zid.sa/upload-icon-image-35821465e0) — وجود رفع أيقونة المتجر.
- [OpenAI Help: Images in ChatGPT](https://help.openai.com/en/articles/11084440) — يوضح دعم توليد وتحرير الصور وطلب خلفية شفافة؛ يبقى فحص الملف الناتج ضروريًا.
- [Anthropic: What are Artifacts?](https://support.anthropic.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them) — يوضح Artifacts كطريقة لعرض وتسليم محتوى قابل للتنزيل، ولذلك يكون SVG الآمن استثناءً صالحًا في Claude فقط عندما يتعذر تسليم PNG لغياب التوليد أو الحفظ/الإرفاق.

## عقد هذه المهمة

- PNG هو التسليم العادي: كتالوج 1536x1024، ثم شعار 1024x256 وأيقونة 32x32 مع alpha فعلي وحد 1,950,000 للشعار والأيقونة.
- SVG ليس بديلاً عامًا: يتطلب Claude مع تعذر إتمام PNG لغياب توليد الصور أو حفظ/إرفاق PNG، وعلم الفاحص `--claude-fallback`.
- Primary وSecondary HEX هما اللونان الرسميان الوحيدان المعروضان للتاجر.

المقاسات والحد المحافظ عقد تسليم لهذه المهمة، لا ادعاء بأنها موثقة في صفحات Zid أعلاه.
