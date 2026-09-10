#!/usr/bin/env node
import fs from "node:fs";

const file=process.argv[2];
if(!file){console.error("الاستخدام: node scripts/validate-product-record.mjs <input.json>");process.exit(2)}
const x=JSON.parse(fs.readFileSync(file,"utf8"));
const errors=[];
const allowedTop=new Set(["schema_version","market","currency","status","source_register","source_manifest","product","options","images","variants","conflicts","blockers","missing_fields"]);
for(const key of Object.keys(x))if(!allowedTop.has(key))errors.push(`حقل علوي غير معروف: ${key}`);

const refPattern=/^(https:\/\/[^\s]+|[A-Za-z0-9._-]+\/[A-Za-z0-9_./-]+#[A-Za-z0-9_.:/-]+)$/;
const sourceIds=new Set();
for(const s of x.source_register||[]){
  if(!s.id||sourceIds.has(s.id))errors.push(`مصدر مكرر أو بلا معرف: ${s.id||"بدون معرف"}`);
  sourceIds.add(s.id);
  if(!refPattern.test(s.url_or_path||""))errors.push(`${s.id}: مرجع غير صالح`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s.observed_at||"")||Number.isNaN(Date.parse(s.observed_at)))errors.push(`${s.id}: تاريخ غير صالح`);
  if(!s.scope)errors.push(`${s.id}: النطاق مفقود`);
}
if(x.schema_version!==2)errors.push("schema_version يجب أن يساوي 2");
if(!x.market||!/^[A-Z]{3}$/.test(x.currency||""))errors.push("market وعملة ISO من ثلاثة أحرف مطلوبان");
if(!["draft","ready_for_storefront"].includes(x.status))errors.push("status غير صالح");
for(const k of ["id","name","category"])if(!x.product?.[k])errors.push(`product.${k} مطلوب`);
const claimIds=new Set(),factKeys=new Set(),claimCopies=new Set();
const normalizeClaim=value=>String(value||"").replace(/[\s،,؛;:.!؟?]+/g," ").trim().toLowerCase();
for(const c of x.product?.claims||[]){
  if(!c.id||claimIds.has(c.id)||!c.text||!["product_fact","performance","regulatory","sales_rank","review_summary"].includes(c.evidence_class))errors.push("ادعاء مكرر أو ناقص أو evidence_class غير صالح");
  claimIds.add(c.id);
  if(!/^[a-z0-9]+(?:[._-][a-z0-9]+)+$/.test(c.fact_key||""))errors.push(`${c.id||"claim"}: fact_key ثابت ومحدد مطلوب`);
  else if(factKeys.has(c.fact_key))errors.push(`${c.id}: fact_key مكرر ${c.fact_key}`);
  factKeys.add(c.fact_key);
  const copyKey=normalizeClaim(c.text);if(copyKey&&claimCopies.has(copyKey))errors.push(`${c.id}: الحقيقة نفسها مكررة تحت معرف آخر`);claimCopies.add(copyKey);
  if(!(c.source_refs||[]).length)errors.push(`${c.id||"claim"}: ادعاء بلا مصدر`);
  for(const r of c.source_refs||[])if(!sourceIds.has(r))errors.push(`${c.id}: مصدر غير موجود ${r}`);
}
for(const k of ["shipping_policy_ref","return_policy_ref"]){const r=x.product?.[k];if(!r)errors.push(`product.${k} مطلوب`);else if(!sourceIds.has(r))errors.push(`product.${k} لا يشير إلى مصدر موجود`)}

const optionMap=new Map();
for(const o of x.options||[]){
  if(!o.id||optionMap.has(o.id))errors.push(`خيار مكرر أو بلا معرف: ${o.id||"بدون معرف"}`);
  if(!o.name||!Array.isArray(o.values)||!o.values.length)errors.push(`${o.id||"خيار"}: الاسم والقيم مطلوبة`);
  if(new Set(o.values).size!==(o.values||[]).length)errors.push(`${o.id}: قيم خيارات مكررة`);
  optionMap.set(o.id,new Set(o.values||[]));
}

const imageIds=new Set();
for(const i of x.images||[]){
  if(!i.id||imageIds.has(i.id))errors.push(`صورة مكررة أو بلا معرف: ${i.id||"بدون معرف"}`);
  imageIds.add(i.id);
  if(!/^https:\/\//.test(i.url||""))errors.push(`${i.id}: رابط الصورة يجب أن يكون HTTPS`);
  if(!i.alt_text||/^(image|photo|صورة|منتج)$/i.test(i.alt_text.trim()))errors.push(`${i.id}: النص البديل ناقص أو عام`);
  if(!sourceIds.has(i.source_ref))errors.push(`${i.id}: مصدر الصورة غير موجود`);
  if(!Number.isInteger(i.sort_order)||i.sort_order<1)errors.push(`${i.id}: sort_order غير صالح`);
}
const missingImageConflictIds=new Set((x.conflicts||[]).filter(c=>c.type==="missing_required_data"&&(c.affected_fields||[]).includes("images.https")).map(c=>c.id));
const missingImageDeclared=x.status==="draft"&&(x.missing_fields||[]).includes("images.https")&&(x.blockers||[]).some(b=>(b.missing_fields||[]).includes("images.https")&&(b.conflict_refs||[]).some(id=>missingImageConflictIds.has(id)));
if(!(x.images||[]).length&&!missingImageDeclared)errors.push("صورة واحدة على الأقل مطلوبة أو مانع صورة معلن في المسودة");

const manifest=new Map();
for(const e of x.source_manifest||[]){
  if(!e.source_key||manifest.has(e.source_key))errors.push(`source_manifest مكرر أو بلا source_key: ${e.source_key||"بدون معرف"}`);
  manifest.set(e.source_key,e);
  if(!e.option_values||typeof e.option_values!=="object")errors.push(`${e.source_key}: option_values المصدرية مطلوبة`);
  if(!(e.source_refs||[]).length)errors.push(`${e.source_key}: مصدر الإدخال مفقود`);
  for(const r of e.source_refs||[])if(!sourceIds.has(r))errors.push(`${e.source_key}: مرجع مصدر غير موجود ${r}`);
}
if(!manifest.size)errors.push("source_manifest مطلوب لمنع حذف متغيرات المصدر بصمت");

const conflictIds=new Set(),conflictedKeys=new Set();
for(const c of x.conflicts||[]){
  if(!c.id||conflictIds.has(c.id))errors.push(`تعارض مكرر أو بلا معرف: ${c.id||"بدون معرف"}`);
  conflictIds.add(c.id);
  if(!["duplicate_sku","duplicate_combination","invalid_option","inventory_mismatch","price_mismatch","identity_mismatch","missing_required_data","other"].includes(c.type))errors.push(`${c.id}: نوع تعارض غير صالح`);
  if(!c.description||(!(c.affected_source_keys||[]).length&&!(c.affected_fields||[]).length))errors.push(`${c.id}: الوصف وaffected_source_keys أو affected_fields مطلوبان`);
  for(const key of c.affected_source_keys||[]){if(!manifest.has(key))errors.push(`${c.id}: source_key غير موجود ${key}`);conflictedKeys.add(key)}
  if(!(c.source_refs||[]).length)errors.push(`${c.id}: مصدر التعارض مطلوب`);
  for(const r of c.source_refs||[])if(!sourceIds.has(r))errors.push(`${c.id}: مصدر تعارض غير موجود ${r}`);
}
const blockerIds=new Set();
for(const b of x.blockers||[]){
  if(!b.id||blockerIds.has(b.id))errors.push(`مانع مكرر أو بلا معرف: ${b.id||"بدون معرف"}`);
  blockerIds.add(b.id);
  if(!b.reason)errors.push(`${b.id}: reason مطلوب`);
  if(!(b.conflict_refs||[]).length&&!(b.missing_fields||[]).length)errors.push(`${b.id}: اربط المانع بتعارض أو حقل ناقص`);
  for(const id of b.conflict_refs||[])if(!conflictIds.has(id))errors.push(`${b.id}: تعارض غير موجود ${id}`);
}

const variantIds=new Set(),skus=new Set(),combos=new Set(),representedKeys=new Set();
const stable=v=>JSON.stringify(Object.fromEntries(Object.entries(v||{}).sort(([a],[b])=>a.localeCompare(b))));
for(const v of x.variants||[]){
  if(!v.id||variantIds.has(v.id))errors.push(`متغير مكرر أو بلا معرف: ${v.id||"بدون معرف"}`);variantIds.add(v.id);
  if(!v.source_key||!manifest.has(v.source_key))errors.push(`${v.id}: source_key غير موجود في source_manifest`);
  else{
    if(representedKeys.has(v.source_key))errors.push(`${v.id}: source_key ممثل أكثر من مرة`);
    representedKeys.add(v.source_key);
    if(stable(v.option_values)!==stable(manifest.get(v.source_key).option_values))errors.push(`${v.id}: option_values لا تطابق سجل المصدر`);
  }
  const sku=(v.sku||"").trim().toUpperCase();if(!sku)errors.push(`${v.id}: SKU مطلوب`);else if(skus.has(sku))errors.push(`${v.id}: SKU مكرر ${sku}`);skus.add(sku);
  const values=v.option_values||{};
  for(const id of optionMap.keys())if(!(id in values))errors.push(`${v.id}: قيمة الخيار ${id} مفقودة`);
  for(const [id,value]of Object.entries(values)){if(!optionMap.has(id))errors.push(`${v.id}: خيار غير معرف ${id}`);else if(!optionMap.get(id).has(value))errors.push(`${v.id}: قيمة غير معرفة ${id}=${value}`)}
  const combo=[...optionMap.keys()].sort().map(id=>`${id}=${values[id]}`).join("|");if(combos.has(combo))errors.push(`${v.id}: تركيبة خيارات مكررة`);combos.add(combo);
  if(!(Number.isFinite(v.price)&&v.price>0))errors.push(`${v.id}: السعر يجب أن يكون موجبًا`);
  if(v.currency!==x.currency)errors.push(`${v.id}: العملة لا تطابق عملة السجل`);
  if(v.compare_at_price!=null&&(!(Number.isFinite(v.compare_at_price))||v.compare_at_price<=v.price))errors.push(`${v.id}: compare_at_price يجب أن يكون أكبر من السعر`);
  const inv=v.inventory||{};
  if(typeof inv.tracked!=="boolean")errors.push(`${v.id}: inventory.tracked مطلوب`);
  if(inv.tracked){if(!Number.isInteger(inv.quantity)||inv.quantity<0)errors.push(`${v.id}: كمية متتبعة غير صالحة`);if(inv.quantity===0&&inv.status!=="out_of_stock")errors.push(`${v.id}: الكمية صفر يجب أن تكون out_of_stock`);if(inv.quantity>0&&!['in_stock','preorder'].includes(inv.status))errors.push(`${v.id}: كمية موجبة بحالة غير متسقة`)}
  else{if(inv.quantity!==null)errors.push(`${v.id}: غير المتتبع يجب أن يحمل quantity=null`);if(inv.status!=="not_tracked")errors.push(`${v.id}: غير المتتبع يجب أن تكون حالته not_tracked`)}
  if(!(v.image_ids||[]).length&&!missingImageDeclared)errors.push(`${v.id}: يحتاج صورة مرتبطة أو مانع صورة معلن في المسودة`);for(const id of v.image_ids||[])if(!imageIds.has(id))errors.push(`${v.id}: صورة غير موجودة ${id}`);
  if(!(v.source_refs||[]).length)errors.push(`${v.id}: المتغير بلا مصدر`);for(const r of v.source_refs||[])if(!sourceIds.has(r))errors.push(`${v.id}: مصدر غير موجود ${r}`);
}
if(!(x.variants||[]).length&&x.status==="ready_for_storefront")errors.push("متغير واحد على الأقل مطلوب للجاهزية");
for(const key of manifest.keys())if(!representedKeys.has(key)&&!conflictedKeys.has(key))errors.push(`سجل مصدر محذوف بلا تعارض معلن: ${key}`);

const missing=x.missing_fields||[];
const computedReady=errors.length===0&&manifest.size>0&&representedKeys.size===manifest.size&&!(x.conflicts||[]).length&&!(x.blockers||[]).length&&!missing.length&&(x.variants||[]).length>0;
if(x.status==="ready_for_storefront"&&!computedReady)errors.push("ready_for_storefront لا يطابق الجاهزية المحسوبة من السجل");
console.log(JSON.stringify({valid:!errors.length,errors,status:x.status,schema_valid:!errors.length,computed_ready:computedReady,variant_count:(x.variants||[]).length,source_variant_count:manifest.size},null,2));
if(errors.length)process.exit(1);
