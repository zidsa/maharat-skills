# مخطط `brand-kit.json`

استخدم المخطط نفسه في وضعي `assets_ready` و`prompts_only`. في الوضع الأخير تكون `assets` كائنًا فارغًا وقيم الفحص البصري `false`.

```json
{
  "schema_version": 1,
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
  "palette": {
    "primary": "#RRGGBB_PRIMARY",
    "on_primary": "#RRGGBB_ON_PRIMARY",
    "secondary": "#RRGGBB_SECONDARY",
    "on_secondary": "#RRGGBB_ON_SECONDARY",
    "background": "#RRGGBB_BACKGROUND",
    "on_background": "#RRGGBB_ON_BACKGROUND"
  },
  "assets": {
    "logo_png": {"file": "logo-ar.png", "width": 1024, "height": 256},
    "icon_png": {"file": "store-icon.png", "width": 32, "height": 32}
  },
  "fallback_prompts": {
    "logo_png": "البرومبت الكامل القابل لإعادة إنتاج صورة الشعار...",
    "icon_png": "البرومبت الكامل القابل لإعادة إنتاج صورة الأيقونة..."
  },
  "qa": {
    "arabic_spelling_verified": true,
    "transparent_background_verified": true,
    "icon_at_32px_verified": true,
    "originality_reviewed": true
  }
}
```

## قواعد

- قيم `RRGGBB_*` أعلاه خانات شرح للمخطط؛ استبدلها بقيم HEX من موجز المتجر، ولا تستخدم لوحة افتراضية.
- يجب أن يكون لكل اتجاه فكرة مختلفة، وأن يشير `selected_direction` إلى واحد منها.
- يوجد برومبتا الإنتاج دائمًا، حتى مع وجود الصور، لتكون الحزمة قابلة للإعادة.
- `assets_ready` يتطلب قيم QA الأربع بقيمة `true` وصورتين موجودتين فعليًا.
