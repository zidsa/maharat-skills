# منهج إعادة الطلب

## المعادلات

- `inventory_position = on_hand + confirmed_inbound_before_need - reserved - backorders`
- `lead_time_demand = average_daily_demand × lead_time_days`
- `reorder_point = lead_time_demand + safety_stock`
- يطلق قرار المراجعة عندما `inventory_position <= reorder_point`.
- `target_stock = demand_during_review_period + lead_time_demand + safety_stock`
- `raw_order_qty = max(0, target_stock - inventory_position)`
- الكمية المقترحة تقرّب لأعلى إلى حجم العبوة وMOQ، ثم تفحص مقابل النقد والتخزين والصلاحية.

## جودة الطلب

استخدم الطلب المكتمل أو المستهلك فعليًا بحسب نوع المنتج. اعرض الفترة وعدد الأيام الصفرية والعروض غير الاعتيادية. عند نمو سريع أو موسم، اعرض أساسًا وضغطًا بدل متوسط واحد مضلل.

## قرار محجوب

احجب الكمية إذا لم تتوفر المهلة أو مصدر رصيد المخزون أو نافذة طلب كافية، لكن اعرض البيانات المطلوبة ومن يملكها.
