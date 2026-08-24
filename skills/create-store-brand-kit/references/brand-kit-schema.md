# مخطط `brand-kit.json`

استخدم المخطط نفسه في وضعي `assets_ready` و`prompts_only`. في الوضع الأخير تكون `assets` كائنًا فارغًا وقيم الفحص البصري `false`.

```json
{
  "schema_version": 3,
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
  "production": {
    "pipeline": "direct_raster_png",
    "image_generation_used": true,
    "svg_used": false,
    "html_used": false,
    "inkscape_used": false,
    "vector_intermediate_used": false,
    "conversion_to_png_used": false,
    "arabic_generation_attempts": 1
  },
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
    "brand_board_png": "[انسخ visual_anchor حرفيًا هنا] مسار الإنتاج: direct_raster_png فقط؛ يمنع SVG وHTML وInkscape وأي وسيط متجهي في جميع المراحل. ثم اكتب البرومبت المستقل الكامل للوحة...",
    "logo_png": "[انسخ visual_anchor حرفيًا هنا] مسار الإنتاج: direct_raster_png فقط؛ يمنع SVG وHTML وInkscape وأي وسيط متجهي في جميع المراحل. ثم اكتب البرومبت الكامل القابل لإعادة إنتاج صورة الشعار...",
    "icon_png": "[انسخ visual_anchor حرفيًا هنا] مسار الإنتاج: direct_raster_png فقط؛ يمنع SVG وHTML وInkscape وأي وسيط متجهي في جميع المراحل. ثم اكتب البرومبت الكامل القابل لإعادة إنتاج صورة الأيقونة..."
  },
  "qa": {
    "direct_raster_pipeline_verified": true,
    "outputs_are_separate_verified": true,
    "palette_reported_as_text": true,
    "qa_report_reported_as_text": true,
    "brand_board_dimensions_verified": true,
    "visual_consistency_verified": true,
    "arabic_spelling_verified": true,
    "arabic_text_inside_logo_verified": true,
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
- `production.pipeline` يجب أن يساوي `direct_raster_png` حرفيًا. أي استخدام لـ SVG أو HTML أو Inkscape أو وسيط متجهي أو تحويل من تنسيق آخر إلى PNG يجعل الحزمة مرفوضة حتى لو كان الناتج النهائي PNG.
- في `assets_ready` يجب أن تكون `image_generation_used` بقيمة `true`، وكل أعلام الطرق المحظورة بقيمة `false`، وعدد محاولات العربية من 1 إلى 3. في `prompts_only` تكون المحاولات 0 عند عدم توفر أداة، أو من 1 إلى 3 إذا جُرّبت صور Raster ثم رُفضت؛ ويجب أن تعكس `image_generation_used` ذلك بصدق.
- يجب أن تصف `visual_anchor` الرمز والألوان والخط في 80 حرفًا على الأقل، وأن يظهر النص نفسه حرفيًا في برومبتات الصور الثلاثة.
- توجد برومبتات الإنتاج الثلاثة دائمًا، حتى مع وجود الصور، لتكون الحزمة قابلة للإعادة.
- كل برومبت إنتاج يذكر `direct_raster_png` ومنع SVG وHTML وInkscape والوسيط المتجهي صراحةً، حتى يبقى القيد معه عند نسخه منفردًا.
- `brand-board.png` للعرض ولا يشترط أن يكون شفافًا. `logo-ar.png` و`store-icon.png` يشترطان alpha وبكسلات شفافة فعلية.
- `assets_ready` يتطلب قيم QA كلها بقيمة `true`، ومنها `direct_raster_pipeline_verified`، وملفات PNG الثلاثة موجودة فعليًا ومستقلة.
- لا يمكن للفاحص الآلي إثبات محتوى الصورة؛ `outputs_are_separate_verified` يسجل مراجعة بصرية تأكدت أن ملفي الشعار والأيقونة ليسا لوحتين مركبتين ولم يُقصا من لوحة الهوية.
- لا يمكن للفاحص استعادة ملف وسيط حُذف؛ لذلك يسجل `production` طريقة التنفيذ، ويفحص مجلد الحزمة بحثًا عن ملفات `.svg` و`.svgz` و`.html` و`.htm` ويرفضها، وتبقى مراجعة سجل التنفيذ مطلوبة عند الشك.
