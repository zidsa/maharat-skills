#!/usr/bin/env node
import fs from "node:fs";
const p=process.argv[2]; if(!p){console.error("الاستخدام: node scripts/build-order-exception-queue.mjs <orders.json>");process.exit(2)}
const x=JSON.parse(fs.readFileSync(p,"utf8")); const now=new Date(x.now); const errors=[]; if(Number.isNaN(+now)) errors.push("now غير صالح"); if(!Array.isArray(x.orders)) errors.push("orders مطلوبة");
const forbidden=/^(name|full_name|email|mobile|phone|address|customer)$/i;
const queue=[]; for(const o of x.orders||[]){ if(!o.id||!o.payment_status||!o.order_status){errors.push("كل طلب يحتاج id وحالتي الدفع والطلب");continue}
  for(const key of Object.keys(o)) if(forbidden.test(key)) errors.push(`${o.id}: حقل شخصي غير مسموح في ملف التحليل: ${key}`);
  if(o.payment_status==="paid"&&!o.inventory_reserved&&!["canceled","cancelled","reversed"].includes(o.order_status)) queue.push({priority:1,order_id:o.id,type:"paid_without_reserved_inventory"});
  if(o.promised_at&&!o.promised_at_source) errors.push(`${o.id}: promised_at يحتاج promised_at_source`);
  if(o.promised_at&&new Date(o.promised_at)<now&&!["delivered","canceled","cancelled","reversed"].includes(o.order_status)) queue.push({priority:2,order_id:o.id,type:"past_promised_delivery"});
  if(o.payment_status==="pending") queue.push({priority:3,order_id:o.id,type:"payment_not_confirmed"});
}
for(const q of queue) q.action_key=`${q.order_id}:${q.type}`;
queue.sort((a,b)=>a.priority-b.priority||a.order_id.localeCompare(b.order_id)); console.log(JSON.stringify({valid:!errors.length,errors,exception_queue:queue,normal_order_ids:(x.orders||[]).map(o=>o.id).filter(id=>!queue.some(q=>q.order_id===id))},null,2)); if(errors.length)process.exit(1);
