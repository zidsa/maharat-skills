# منهج سجل المنتج

## الحدود

- هذه المهارة تصمم السجل وتتحقق منه.
- `merchant-cat-13` يدقق الاستيراد أو المزامنة الفعلية بين مصدر ووجهة.
- `build-product-page` يكتب العرض النهائي من السجل المعتمد، ولا يعكس الاتجاه.

## مخطط التحقق

```json
{
  "schema_version": 2,
  "market": "السعودية",
  "currency": "SAR",
  "status": "ready_for_storefront",
  "source_register": [
    {"id":"src-spec","type":"manufacturer_document","url_or_path":"https://example.com/spec.pdf","observed_at":"2026-08-02","scope":"مواصفات المنتج"}
  ],
  "product": {
    "id":"product-1",
    "name":"قميص قطني",
    "brand":"علامة المتجر",
    "category":"ملابس",
    "claims":[{"id":"claim-1","fact_key":"material.composition","text":"قطن 100%","evidence_class":"product_fact","source_refs":["src-spec"]}],
    "shipping_policy_ref":"src-shipping",
    "return_policy_ref":"src-return"
  },
  "options":[
    {"id":"color","name":"اللون","values":["أسود","أبيض"]},
    {"id":"size","name":"المقاس","values":["S","M"]}
  ],
  "source_manifest":[
    {"source_key":"source-row-1","option_values":{"color":"أسود","size":"S"},"source_refs":["src-platform"]}
  ],
  "images":[
    {"id":"img-black","url":"https://example.com/black.jpg","alt_text":"قميص قطني أسود من الأمام","source_ref":"src-media","sort_order":1}
  ],
  "variants":[
    {
      "id":"variant-black-s",
      "source_key":"source-row-1",
      "sku":"TS-BLK-S",
      "option_values":{"color":"أسود","size":"S"},
      "price":89,
      "compare_at_price":null,
      "currency":"SAR",
      "inventory":{"tracked":true,"quantity":4,"status":"in_stock"},
      "image_ids":["img-black"],
      "source_refs":["src-platform"]
    }
  ],
  "conflicts": [],
  "blockers": [],
  "missing_fields": []
}
```

القيم المسموحة:

- `status`: `draft`, `ready_for_storefront`
- `inventory.status`: `in_stock`, `out_of_stock`, `preorder`, `not_tracked`
- `source_register.type`: وصف حر دقيق مثل `merchant_input`, `manufacturer_document`, `platform_record`, `merchant_asset`, `policy`
- `product.claims[].evidence_class`: `product_fact`, `performance`, `regulatory`, `sales_rank`, `review_summary`
- `product.claims[].fact_key`: هوية ثابتة للحقيقة نفسها مثل `material.composition`. يجب أن تكون فريدة ولا تتغير عند تغيير صياغة النص أو معرّف الادعاء؛ تمنع عرض الحقيقة نفسها كفوائد متعددة.
- `conflicts[].type`: `duplicate_sku`, `duplicate_combination`, `invalid_option`, `inventory_mismatch`, `price_mismatch`, `identity_mismatch`, `missing_required_data`, `other`

`source_manifest` هو تعداد المصدر قبل التنظيف. المسودة تقبل سجلًا غير ممثل فقط إذا ظهر `source_key` في تعارض رسمي ومانع. الجاهزية تُحسب ولا تثق بقيمة `status`: يجب تمثيل كل سجل، وألا توجد تعارضات أو موانع أو حقول ناقصة.

إذا كانت الصورة الخام غير آمنة أو غير قابلة للوصول، احذفها من `images` ولا تختلق HTTPS. تقبل المسودة غياب الصور فقط عند وجود تعارض `missing_required_data` يذكر `affected_fields: ["images.https"]` ومانع يذكر الحقل نفسه.

## بوابات القرار

`ready_for_storefront` يحتاج:

- اسم وفئة وعملة.
- ادعاء واحد موثق على الأقل إذا كان الوصف يتضمن ادعاءات.
- سياسة شحن واسترجاع بمراجع موجودة.
- صورة واحدة صالحة على الأقل.
- متغيرًا واحدًا على الأقل بSKU فريد وسعر موجب وحالة مخزون متسقة.
- كل خيار مستخدم معرف وكل تركيبة فريدة.
- لا حقول ناقصة.
- لا تعارضات أو موانع، وعدد المتغيرات الممثلة يساوي عدد سجلات المصدر.
