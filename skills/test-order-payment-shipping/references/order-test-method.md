# منهج اختبار رحلة الطلب

## ربط الدليل بالتشغيل

يحمل كل دليل `test_case_refs` ويجب أن يتضمن مرجع تشغيل السيناريو الذي يستخدمه. لا تقبل سجلًا من تشغيل آخر. يثبت نجاح الطلب بنيويًا `order_created: true` مع `test_transaction_id` نفسه في الطلب والدفع والاسترداد، وتطابق قيمة الطلب وعملته، وسجل دفع `paid` بالقيمة والعملة نفسيهما، وأثر مخزون معلّمًا بـ `inventory_effect_verified: true`.

إثبات الإجمالي يحتاج لقطة واجهة منظمة وسجل طلب بالقيمة والعملة نفسيهما؛ لا يكفي أحدهما. وسجّل مصادر إعداد الدفع والشحن والإشعارات، وليس وثائق عامة فقط. عرض الشحن يثبت الخيار والتكلفة والعملة والمدة، وإشعار العميل منفصل عن إشعار التاجر.

في فشل الدفع، يلزم سجل طلب يثبت `order_created: false` و`paid: false` مع سجل دفع `failed`. ويثبت رجوع المخزون `reservation_released: true`. لا تكفي صورة شاشة بدل سجل الطلب أو الدفع.

## السيناريوهات المطلوبة

| النوع | assertions المطلوبة |
|---|---|
| `order_success` | `order_created`, `total_matches`, `inventory_effect` |
| `payment_failure` | `paid_order_not_created`, `no_persistent_inventory_reservation`, `recovery_message_visible` |
| `shipping_quote` | `delivery_option_visible`, `cost_visible`, `eta_visible` |
| `notification` | `customer_notification_received`, `merchant_notification_received` |
| `fulfillment_handoff` | `status_transition_verified`, `shipment_reference_created` |
| `cancellation_refund` | `cancellation_recorded`, `refund_or_release_verified` |

## مخطط مختصر

```json
{
  "schema_version": 1,
  "status": "verified",
  "build": {"url":"https://store.example","version":"release-42","environment":"staging","tested_at":"2026-08-02T10:00:00Z"},
  "test_data": {"synthetic":true,"contains_personal_data":false,"payment_data_mode":"provider_test_method","product_ref":"sku-test","test_transaction_id":"TEST-42","currency":"SAR","expected_total":115},
  "source_register": [],
  "evidence_register": [],
  "scenarios": [],
  "defects": [],
  "blockers": []
}
```

## حالات السيناريو

`passed`, `failed`, `blocked`, `not_tested`.

كل assertion تحمل `id`, `expected`, `actual`, `status`, و`evidence_refs`. assertion الناجحة تحتاج دليلًا من النوع المناسب. السيناريو `passed` فقط إذا نجحت كل assertions المطلوبة ولم توجد assertion فاشلة.

## توافق الدليل

- `order_created`: `order_record`
- `total_matches`: `order_record` و`storefront_capture` معًا
- `inventory_effect`: `inventory_record`
- `paid_order_not_created`: `order_record` و`payment_record`
- `no_persistent_inventory_reservation`: `inventory_record`
- `recovery_message_visible`: `storefront_capture`
- `delivery_option_visible`, `cost_visible`, `eta_visible`: `shipping_quote` أو `storefront_capture`
- الإشعارات: سجل مستقل للعميل وسجل مستقل للتاجر مع `recipient_type`
- التسليم للتنفيذ: انتقال حالة ومرجع شحنة داخل `shipment_record` أو `webhook_log`
- الإلغاء والاسترداد: `order_record` مع `refund_record` أو `payment_record` واحد يثبت المعاملة والقيمة والعملة والحالة

`verified` يتطلب نجاح السيناريوهات الستة وعدم وجود عيب مفتوح أو مانع.
