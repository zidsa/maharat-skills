# منهج صفحة المنتج

## الترتيب

1. أعلى الطية: هوية المنتج، القيمة الموثقة، السعر والتوفر، الخيارات، CTA.
2. لماذا يهم: فوائد مرتبطة بادعاءات معتمدة فقط.
3. ما الذي تحصل عليه: مواصفات ومحتويات وخيارات.
4. الاستخدام والقيود والتحذيرات.
5. الشحن والاسترجاع.
6. FAQ من دليل حقيقي فقط.
7. وسائط تساعد الفهم ولا تستبدل الحقيقة.

## مخطط التحقق

```json
{
  "schema_version": 2,
  "status": "review_ready",
  "source_register": [
    {"id":"product-record","type":"internal_artifact","url_or_path":"outputs/product-record/product.json#record","observed_at":"2026-08-02","scope":"سجل المنتج"}
  ],
  "product_record": {
    "status":"ready_for_storefront",
    "artifact_ref":"product-record",
    "product_id":"shirt-01",
    "claims":[{"id":"claim-material","fact_key":"material.composition","text":"الخامة قطن 100%","evidence_class":"product_fact","approved_copy":["الخامة قطن 100%","قطن 100% حسب ملف المواصفات"]}],
    "option_ids":["color","size"],
    "image_ids":["img-black","img-white"],
    "policy_refs":["src-shipping","src-return"]
  },
  "brand_system": {
    "status":"review_ready",
    "artifact_ref":"brand-system",
    "voice_traits":["مباشرة","موثقة"]
  },
  "above_fold": {
    "name":"قميص قطني",
    "value_line":"الخامة قطن 100%",
    "claim_refs":["claim-material"],
    "price_binding":"selected_variant.price",
    "availability_binding":"selected_variant.inventory.status",
    "option_controls":["color","size"],
    "primary_cta":"أضف للسلة"
  },
  "content_blocks": [
    {"id":"benefit-1","type":"benefit","heading":"الخامة","body":"قطن 100% حسب ملف المواصفات","statements":[{"text":"قطن 100% حسب ملف المواصفات","claim_ref":"claim-material"}]},
    {"id":"specs","type":"specifications","heading":"المواصفات","body":"خيارات المتغير المختار","bindings":["selected_variant.option_values"]},
    {"id":"policies","type":"policies","heading":"الشحن والاسترجاع","body":"السياسات المعتمدة","policy_refs":["src-shipping","src-return"],"bindings":["shipping_policy","return_policy"]}
  ],
  "media_plan": [
    {"image_id":"img-black","role":"primary_product","source_ref":"product-record","alt_text":"قميص قطني أسود من الأمام","shows_verified_product":true}
  ],
  "faq": [],
  "faq_status":"no_verified_questions",
  "trust_metrics": [],
  "seo": {"title":"قميص قطني | اسم المتجر","description":"الخامة قطن 100%","statements":[{"text":"الخامة قطن 100%","claim_ref":"claim-material"}]},
  "blockers": []
}
```

قيم الحالة: `draft`, `review_ready`.

أنواع الكتل: `benefit`, `specifications`, `usage`, `warnings`, `policies`, `trust`, `faq`, `media`.

`faq_status`: `verified_questions_included`, `no_verified_questions`.

كل كتلة واقعية تحتاج `statements` بنص مطابق لنسخة ادعاء معتمدة، أو `bindings` محددة، أو `policy_refs`. يحمل كل ادعاء `fact_key` ثابتًا من سجل المنتج؛ لا يجوز استخدام الحقيقة نفسها كفوائد متعددة بتغيير معرّف الادعاء أو صياغته، ولا تكرار نص الفائدة. كتلة `media` يجوز أن تعتمد على `media_plan`. كتلة `trust` تحتاج `trust_metric_refs` من مصدر نوعه `review_platform_export` أو `analytics_export`. سؤال FAQ يحتاج مصدر سؤال فعلي من نوع `merchant_question_log` أو `customer_support_log` أو `search_query_log` و`source_locator` فريدًا داخل المسار الفعلي للمصدر؛ ادعاء المنتج وحده ليس دليلًا على أن السؤال شائع، ولا يجعل تغيير معرّف المصدر الموضع المكرر فريدًا.
