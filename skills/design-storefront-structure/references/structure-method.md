# منهج بنية المتجر

ابدأ بالمهام: ماذا يريد العميل أن يجد أو يقارن أو يعرف؟ ثم اربط كل مهمة بصفحة أو عنصر تنقل واحد. سجل المنتج مصدر مستقل؛ هذه المهارة لا تعيد إنشاء SKU أو السعر أو المخزون.

## قواعد عملية

- سجل المنتج مصدر واحد، والتصنيفات طرق وصول إليه.
- عمق التنقل قرار سياقي؛ خفّضه عندما يمكن الوصول للمحتوى باسم واضح دون طبقة وسيطة.
- المرشح مفيد فقط إذا كانت قيمه مكتملة ومتسقة في سجل المنتجات.
- صفحة المنتج تجيب: ما هو؟ لمن؟ ماذا يتضمن؟ كم يكلف؟ متى يصل؟ ما القيود؟ ماذا يحدث عند الاسترجاع؟ لكن كتابة النص النهائي مهمة مستقلة.
- اكتب سيناريو القبول قبل البناء، ثم نفذه على البناء باستخدام `audit-mobile-rtl-accessibility`.

## بوابة المدخلات

- إذا غابت اللغة أو الاتجاه أو وصف العميل السلوكي أو المناسبة الشرائية أو وعد المتجر أو سياسات الشحن/الاسترجاع أو سجل المنتج، تكون النتيجة `draft` والقرار `needs_data`.
- `ready_for_build` يحتاج سجل منتج حالته `ready_for_storefront` ومسارًا قابلًا للتتبع.
- المنتج أحادي الإطلاق لا يحتاج تصنيف واجهة مصطنعًا؛ استخدم `primary_category: null` و`primary_category_reason: single_product_launch`.

## مخطط ملف التحقق

```json
{
  "schema_version": 2,
  "market": "السعودية",
  "language": "ar",
  "direction": "rtl",
  "customer": "عميل يبحث عن المنتج بالمهمة التي يريد إنجازها",
  "shopping_occasion": "شراء مقصود بعد مقارنة البدائل",
  "store_promise": "وعد معتمد",
  "shipping_policy": "store/policies/shipping#sa",
  "return_policy": "store/policies/returns#default",
  "design_status": "ready_for_build",
  "decision": "ready_for_build",
  "missing_inputs": [],
  "product_record": {"status":"ready_for_storefront","artifact_ref":"outputs/product-record/product.json#record"},
  "products": [{"id":"p-1","included_in_launch":true,"primary_category":null,"primary_category_reason":"single_product_launch"}],
  "categories": [],
  "pages": [
    {"id":"home","purpose":"شرح الوعد وتوجيه العميل","entry_points":["direct"],"primary_action":"فتح المنتج"},
    {"id":"product","purpose":"عرض قرار الشراء","entry_points":["home"],"primary_action":"إضافة للسلة"},
    {"id":"cart","purpose":"مراجعة الطلب","entry_points":["product"],"primary_action":"بدء الدفع"},
    {"id":"shipping_return","purpose":"شرح الشحن والاسترجاع","entry_points":["product","footer"],"primary_action":"العودة للمنتج"}
  ],
  "navigation":[
    {"label":"المنتج","target":"product","reason":"منتج إطلاق واحد"},
    {"label":"الشحن والاسترجاع","target":"shipping_return","reason":"معلومة لازمة قبل الشراء"}
  ],
  "acceptance_scenarios":[
    {"id":"find-product","start":"home","action":"ابحث عن منتج الإطلاق وافتحه","expected_observable":"الوصول إلى product من إجراء واضح"},
    {"id":"compare-products","status":"not_applicable","reason":"منتج واحد ضمن الإطلاق"},
    {"id":"find-shipping-and-return","start":"product","action":"ابحث عن الشحن والاسترجاع","expected_observable":"الوصول إلى السياسة قبل بدء الدفع"}
  ]
}
```

قيم الحالة: `draft`, `ready_for_build`, `needs_reorganization`. ويقابلها: `needs_data`, `ready_for_build`, `reorganize`.

سيناريو القبول إما مخطط كامل (`start`, `action`, `expected_observable`) أو `not_applicable` مع `reason`. مهمتا العثور على المنتج والسياسات تنطبقان دائمًا.
