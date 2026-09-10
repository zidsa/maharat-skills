# سجل المصادر والأدلة

مصدر المنهج يختلف عن دليل الاختبار. احفظ المصادر في `source_register` والأدلة الناتجة في `evidence_register`.

مصادر منصة زد ذات الصلة:

- الطلبات وحالاتها: https://docs.zid.sa/orders-1934403f0
- أحداث الطلب والدفع: https://docs.zid.sa/webhooks
- أنماط تكامل الدفع: https://docs.zid.sa/overview-1340608m0

أنواع الأدلة: `storefront_capture`, `order_record`, `payment_record`, `inventory_record`, `shipping_quote`, `shipment_record`, `notification_record`, `refund_record`, `webhook_log`.

لقطة الواجهة تثبت ما ظهر للمستخدم فقط. `order_record` يثبت إنشاء الطلب، و`payment_record` يثبت حالة الدفع، ولا يجوز استخدام أحدهما بدل الآخر.
