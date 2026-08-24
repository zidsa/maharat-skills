# مخطط `brand-kit.json`

استخدم المخطط نفسه في وضعي `assets_ready` و`prompts_only`. في الوضع الأخير تكون `assets` كائنًا فارغًا وقيم الفحص البصري `false`.

```json
{
  "schema_version": 2,
  "status": "assets_ready",
  "store": {
    "name_ar": "اسم المتجر"
  },
  "source_register": [
    {
      "id": "merchant-brief",
      "type": "merchant_input",
      "detail": "الاسم وما يبيعه المتجر والتفضيل الاختياري"
    }
  ],
  "directions": [
    {"id": "A", "summary": "وصف مختصر", "score": 18},
    {"id": "B", "summary": "وصف مختصر", "score": 15},
    {"id": "C", "summary": "وصف مختصر", "score": 13}
  ],
  "selected_direction": "A",
  "visual_anchor": "صف هندسة الرمز ونسبه وسمك خطه وزواياه وألوانه الثابتة بنص واحد من 80 حرفًا على الأقل، ثم انسخه حرفيًا في البرومبتات الثلاثة.",
  "palette": {
    "primary": "#RRGGBB_PRIMARY",
    "on_primary": "#RRGGBB_ON_PRIMARY",
    "secondary": "#RRGGBB_SECONDARY",
    "on_secondary": "#RRGGBB_ON_SECONDARY",
    "background": "#RRGGBB_BACKGROUND",
    "on_background": "#RRGGBB_ON_BACKGROUND"
  },
  "assets": {
    "brand_board_png": {"file": "brand-board.png", "width": 1536, "height": 1024},
    "logo_png": {"file": "logo-ar.png", "width": 1024, "height": 256},
    "icon_png": {"file": "store-icon.png", "width": 32, "height": 32}
  },
  "fallback_prompts": {
    "brand_board_png": "[انسخ visual_anchor حرفيًا هنا] ثم اكتب البرومبت المستقل الكامل للوحة...",
    "logo_png": "[انسخ visual_anchor حرفيًا هنا] ثم اكتب البرومبت الكامل القابل لإعادة إنتاج صورة الشعار...",
    "icon_png": "[انسخ visual_anchor حرفيًا هنا] ثم اكتب البرومبت الكامل القابل لإعادة إنتاج صورة الأيقونة..."
  },
  "qa": {
    "outputs_are_separate_verified": true,
    "palette_reported_as_text": true,
    "qa_report_reported_as_text": true,
    "brand_board_dimensions_verified": true,
    "visual_consistency_verified": true,
    "arabic_spelling_verified": true,
    "logo_transparent_background_verified": true,
    "icon_transparent_background_verified": true,
    "icon_at_32px_verified": true,
    "originality_reviewed": true
  }
}
```

## قواعد

- قيم `RRGGBB_*` أعلاه خانات شرح للمخطط؛ استبدلها بقيم HEX من موجز المتجر، ولا تستخدم لوحة افتراضية.
- يجب أن يكون لكل اتجاه فكرة مختلفة، وأن يشير `selected_direction` إلى واحد منها.
- يجب أن تصف `visual_anchor` الرمز والألوان والخط في 80 حرفًا على الأقل، وأن يظهر النص نفسه حرفيًا في برومبتات الصور الثلاثة.
- توجد برومبتات الإنتاج الثلاثة دائمًا، حتى مع وجود الصور، لتكون الحزمة قابلة للإعادة.
- `brand-board.png` للعرض ولا يشترط أن يكون شفافًا. `logo-ar.png` و`store-icon.png` يشترطان alpha وبكسلات شفافة فعلية.
- `assets_ready` يتطلب قيم QA كلها بقيمة `true` وملفات PNG الثلاثة موجودة فعليًا ومستقلة.
- لا يمكن للفاحص الآلي إثبات محتوى الصورة؛ `outputs_are_separate_verified` يسجل مراجعة بصرية تأكدت أن ملفي الشعار والأيقونة ليسا لوحتين مركبتين ولم يُقصا من لوحة الهوية.
