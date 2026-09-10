# منهج نظام العلامة

## التسلسل الصحيح

1. **التموضع:** لمن، وفي أي فئة، ومقابل أي بديل، وبأي دليل.
2. **الوعد:** جملة واحدة لا تتجاوز الادعاءات المعتمدة.
3. **هرم الرسائل:** أساسية، دعم، إثبات، دعوة.
4. **النبرة:** سلوك لغوي قابل للملاحظة، لا صفات فضفاضة.
5. **النظام المرئي:** أدوار ألوان وخطوط وصور ومكونات تخدم القراءة والتمييز.
6. **التطبيق:** أمثلة على أسطح حقيقية مع نفس الادعاءات.

## مخطط التحقق

```json
{
  "schema_version": 2,
  "market": "السعودية",
  "language": "ar",
  "direction": "rtl",
  "status": "review_ready",
  "source_register": [
    {"id":"src-positioning","type":"internal_artifact","url_or_path":"outputs/positioning/map.json#positioning","observed_at":"2026-08-02","scope":"التموضع المعتمد"}
  ],
  "brand_owner": {"name":"علامة المتجر","relationship":"merchant_owned","authorization_ref":"src-brand-assets"},
  "positioning": {
    "segment":"متاجر صغيرة تبيع منتجات عناية موثقة",
    "category":"متجر عناية مباشرة للمستهلك",
    "alternative":"الشراء من سوق عام",
    "source_refs":["src-positioning"]
  },
  "approved_claims": [
    {"id":"claim-1","text":"تظهر المكونات ومصدرها لكل منتج","evidence_refs":["src-catalog"]}
  ],
  "brand_promise": {"text":"اعرف ما تشتريه قبل أن تطلبه","claim_refs":["claim-1"]},
  "message_hierarchy": [
    {"id":"msg-1","role":"primary","text":"اعرف ما تشتريه قبل أن تطلبه","claim_refs":["claim-1"]},
    {"id":"msg-2","role":"proof","text":"المكونات ومصادرها ظاهرة في صفحة المنتج","claim_refs":["claim-1"]},
    {"id":"msg-3","role":"cta","text":"استعرض المنتجات","claim_refs":[]}
  ],
  "voice_traits": [
    {"trait":"مباشرة","do":"ابدأ بالمعلومة التي يحتاجها العميل","dont":"لا تستخدم مقدمات إنشائية","approved_example":"المكونات ومصدرها في صفحة المنتج","avoid_example":"تجربة استثنائية لا مثيل لها"}
  ],
  "visual_system": {
    "mode":"existing",
    "identity_owner":"علامة المتجر",
    "decision_basis_refs":["src-brand-assets"],
    "colors":[
      {"role":"text-primary","value":"#243B53","source_ref":"src-brand-assets"},
      {"role":"surface-primary","value":"#FFFFFF","source_ref":"src-brand-assets"}
    ],
    "contrast_checks":[
      {"foreground":"#243B53","background":"#FFFFFF","context":"normal_text"}
    ],
    "typography":{"heading":"اسم الخط المعتمد","body":"اسم الخط المعتمد","source_ref":"src-brand-assets"},
    "imagery_rules":["اعرض المنتج الحقيقي دون تغيير لونه أو كتاباته"],
    "component_principles":["زر أساسي واحد واضح في كل كتلة"]
  },
  "applications":[
    {"surface":"home","copy":"اعرف ما تشتريه قبل أن تطلبه","claim_refs":["claim-1"],"voice_traits":["مباشرة"]},
    {"surface":"product","copy":"المكونات ومصدرها ظاهرة هنا","claim_refs":["claim-1"],"voice_traits":["مباشرة"]},
    {"surface":"customer_service","copy":"سأوضح لك المكوّن ومصدره","claim_refs":["claim-1"],"voice_traits":["مباشرة"]}
  ],
  "unknowns": []
}
```

القيم المسموحة:

- `status`: `draft`, `review_ready`
- `visual_system.mode`: `existing`, `proposed`
- أدوار الرسائل: `primary`, `supporting`, `proof`, `cta`
- سياق التباين: `normal_text`, `large_text`, `ui`
- `brand_owner.relationship`: `merchant_owned`, `licensed`, `platform_owned`

كل نظام مرئي يصرّح باسم مالك الهوية ومرجع التفويض. لوحة زد الأساسية (`#1F0433` مع `#AE72FF`) لا تُنسب إلى متجر مستقل؛ استخدامها يحتاج أن يكون مالك الهوية «زد» ومصدر التفويض مسجلًا.

## بوابات القرار

- `draft`: يسمح بمجهولات وبنظام مرئي مقترح، ويمنع وصفه كهوية نهائية.
- `review_ready`: يحتاج تموضعًا ومصادر وادعاءات مكتملة، 3–5 سمات نبرة، أسطح التطبيق الثلاثة، وأزواج تباين ناجحة.
- النص العادي يحتاج نسبة تباين محسوبة 4.5:1 على الأقل، والنص الكبير ومكونات الواجهة 3:1 على الأقل.
