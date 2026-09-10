# طلب تشغيل مكتمل

شغّل مهارة `summer-campaign-builder` بهذه المتغيرات:

## بيانات الحملة

- اسم المتجر: موج
- السوق: السعودية
- رابط المتجر العام: https://example.com
- المنتج أو الكولكشن: كولكشن البحر
- مدة الحملة: 7 أيام
- رابط الطلب أو صفحة العرض: https://example.com/summer

## الأهداف المختارة

- اجذب عملاء جدد وعرّفهم بالمتجر والعرض بسرعة.

## العروض الفعلية فقط

- خصم 15٪ على كولكشن البحر.
- توصيل مجاني لمدة 7 أيام.

## المخرجات المطلوبة فقط

- إنستقرام: أصل Feed ثابت 1080×1350.
- واتساب: رسالة تسويقية قصيرة.

## تعليمات التنفيذ

افتح الرابط العام إن أمكن، ولا تضف هدفًا أو عرضًا أو قناة غير محددة. افصل النصوص النهائية عن الملاحظات ولا تنشر أو ترسل شيئًا.

<!-- summer-campaign-manifest:v1 -->
```json
{
  "schema_version": "summer-campaign-v1",
  "campaign": {
    "store_name": "موج",
    "market": "السعودية",
    "store_url": "https://example.com",
    "product_or_collection": "كولكشن البحر",
    "duration": "7 أيام",
    "order_url": "https://example.com/summer"
  },
  "goals": ["acquire"],
  "offers": [
    { "type": "discount", "value": "15", "scope": "كولكشن البحر" },
    { "type": "shipping", "value": "7 أيام", "scope": "" }
  ],
  "channels": ["instagram", "whatsapp"]
}
```
