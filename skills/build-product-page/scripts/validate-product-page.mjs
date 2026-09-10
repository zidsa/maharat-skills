#!/usr/bin/env node
import fs from "node:fs";

const file=process.argv[2];
if(!file){console.error("الاستخدام: node scripts/validate-product-page.mjs <input.json>");process.exit(2)}
const x=JSON.parse(fs.readFileSync(file,"utf8")),errors=[];
if(x.schema_version!==2)errors.push("schema_version يجب أن يساوي 2");
if(!["draft","review_ready"].includes(x.status))errors.push("status غير صالح");

const refs=new Map();
for(const s of x.source_register||[]){
  if(!s.id||refs.has(s.id))errors.push(`مصدر مكرر أو بلا معرف: ${s.id||"بدون معرف"}`);
  refs.set(s.id,s);
  if(!s.type)errors.push(`${s.id}: type مطلوب`);
  if(!/^(https:\/\/[^\s]+|[A-Za-z0-9._-]+\/[A-Za-z0-9_./-]+#[A-Za-z0-9_.:/-]+)$/.test(s.url_or_path||""))errors.push(`${s.id}: مرجع غير صالح`);
  if(Number.isNaN(Date.parse(s.observed_at||""))||!s.scope)errors.push(`${s.id}: تاريخ أو نطاق مفقود`);
}
const pr=x.product_record||{},bs=x.brand_system||{};
if(!refs.has(pr.artifact_ref))errors.push("مرجع سجل المنتج غير موجود");
if(!refs.has(bs.artifact_ref))errors.push("مرجع نظام العلامة غير موجود");
if(!pr.product_id)errors.push("product_id مطلوب");
if(x.status==="review_ready"&&pr.status!=="ready_for_storefront")errors.push("review_ready يحتاج سجل منتج ready_for_storefront");
if(x.status==="review_ready"&&bs.status!=="review_ready")errors.push("review_ready يحتاج نظام علامة review_ready");

const normalize=value=>String(value||"").replace(/[\s،,؛;:.!؟?]+/g," ").trim().toLowerCase();
const claims=new Map(),claimFactKeys=new Set(),claimCopyOwners=new Map();
for(const c of pr.claims||[]){
  if(!c.id||claims.has(c.id)||!c.text)errors.push(`ادعاء منتج مكرر أو ناقص: ${c.id||"بدون معرف"}`);
  if(!/^[a-z0-9]+(?:[._-][a-z0-9]+)+$/.test(c.fact_key||""))errors.push(`${c.id||"claim"}: fact_key ثابت ومحدد مطلوب`);
  else if(claimFactKeys.has(c.fact_key))errors.push(`${c.id}: fact_key مكرر ${c.fact_key}`);
  claimFactKeys.add(c.fact_key);
  if(!["product_fact","performance","regulatory","sales_rank","review_summary"].includes(c.evidence_class))errors.push(`${c.id}: evidence_class غير صالح`);
  if(!Array.isArray(c.approved_copy)||!c.approved_copy.length)errors.push(`${c.id}: approved_copy مطلوبة`);
  for(const copy of [c.text,...(c.approved_copy||[])]){const key=normalize(copy),owner=claimCopyOwners.get(key);if(key&&owner&&owner!==c.id)errors.push(`${c.id}: نسخة حقيقة مكررة تحت ادعاء آخر (${owner})`);else if(key)claimCopyOwners.set(key,c.id)}
  claims.set(c.id,c);
}
const optionIds=new Set(pr.option_ids||[]),imageIds=new Set(pr.image_ids||[]),policyRefs=new Set(pr.policy_refs||[]);
const allowedClaimCopy=(text,id)=>{const c=claims.get(id);if(!c)return false;return[c.text,...(c.approved_copy||[])].map(normalize).includes(normalize(text))};
const hasApprovedText=(text,ids,classes=null)=>ids.some(id=>{const c=claims.get(id);return(!classes||classes.includes(c?.evidence_class))&&allowedClaimCopy(text,id)});

const banned=/(الأفضل|الأكثر\s+(?:مبيع|طلب)|المفض[ّ]?ل\s+لدى\s+العملاء|الأعلى\s+تقييم|رقم\s*1|مضمون(?:ة)?\s*100\s*%|بقيت?\s+\d+|لا\s+مثيل|يعالج|يشفي)/i;
const ratingPattern=/(?:\d(?:[.,]\d)?\s*(?:\/|من)\s*5|\d+\s*(?:تقييم|تقييمات|مراجعة|مراجعات))/i;
const scan=(owner,text,claimRefs=[],trustRefs=[])=>{
  if(banned.test(text||"")&&!hasApprovedText(text,claimRefs,["sales_rank","performance","regulatory"]))errors.push(`${owner}: ادعاء أو ندرة محظورة بلا نسخة معتمدة تطابق النص`);
  if(ratingPattern.test(text||"")&&!trustRefs.length)errors.push(`${owner}: تقييم أو عدد مراجعات بلا مقياس ثقة موثق`);
};

const af=x.above_fold||{};
for(const k of ["name","value_line","price_binding","availability_binding","primary_cta"])if(!af[k])errors.push(`above_fold.${k} مطلوب`);
if(af.price_binding!=="selected_variant.price")errors.push("السعر يجب أن يرتبط بالمتغير المختار");
if(af.availability_binding!=="selected_variant.inventory.status")errors.push("التوفر يجب أن يرتبط بمخزون المتغير المختار");
for(const id of af.option_controls||[])if(!optionIds.has(id))errors.push(`خيار أعلى الطية غير موجود: ${id}`);
for(const id of af.claim_refs||[])if(!claims.has(id))errors.push(`ادعاء أعلى الطية غير موجود: ${id}`);
if((af.claim_refs||[]).length&&!hasApprovedText(af.value_line,af.claim_refs))errors.push("above_fold.value_line لا تطابق نسخة ادعاء معتمدة");
scan("above_fold",`${af.name||""} ${af.value_line||""}`,af.claim_refs);

const allowedBindings=new Set(["product.name","product.category","product.brand","selected_variant.option_values","selected_variant.price","selected_variant.inventory.status","shipping_policy","return_policy"]);
const allowedTypes=new Set(["benefit","specifications","usage","warnings","policies","trust","faq","media"]),types=new Set();
const benefitFacts=new Set(),benefitBodies=new Set();
const metricIds=new Set();
for(const m of x.trust_metrics||[]){
  if(!m.id||metricIds.has(m.id)||!m.metric||m.value==null)errors.push(`مقياس ثقة مكرر أو ناقص: ${m.id||"بدون معرف"}`);
  metricIds.add(m.id);
  const source=refs.get(m.source_ref);
  if(!source||!["review_platform_export","analytics_export"].includes(source.type))errors.push(`${m.id}: يحتاج مصدر تقييمات أو تحليلات مستقل`);
  if(Number.isNaN(Date.parse(m.observed_at||"")))errors.push(`${m.id}: observed_at غير صالح`);
}
for(const b of x.content_blocks||[]){
  if(!b.id||!allowedTypes.has(b.type)||!b.heading||!b.body)errors.push(`كتلة ناقصة أو غير صالحة: ${b.id||"بدون معرف"}`);
  types.add(b.type);
  const statements=b.statements||[],bindings=b.bindings||[],trustRefs=b.trust_metric_refs||[];
  for(const st of statements){if(!st.text||!claims.has(st.claim_ref))errors.push(`${b.id}: statement ناقص أو claim_ref غير موجود`);else if(!allowedClaimCopy(st.text,st.claim_ref))errors.push(`${b.id}: نص statement لا يطابق النسخة المعتمدة للادعاء`)}
  if(statements.length&&normalize(b.body)!==normalize(statements.map(st=>st.text).join(" ")))errors.push(`${b.id}: body يجب أن يتكون فقط من statements المعتمدة`);
  for(const binding of bindings)if(!allowedBindings.has(binding))errors.push(`${b.id}: binding غير صالح ${binding}`);
  for(const id of b.policy_refs||[])if(!policyRefs.has(id))errors.push(`${b.id}: سياسة غير موجودة ${id}`);
  for(const id of trustRefs)if(!metricIds.has(id))errors.push(`${b.id}: مقياس ثقة غير موجود ${id}`);
  const evidence=statements.length+bindings.length+(b.policy_refs||[]).length+trustRefs.length;
  if(b.type!=="media"&&!evidence)errors.push(`${b.id}: كتلة واقعية بلا statement أو binding أو سياسة أو مقياس ثقة`);
  if(b.type==="trust"&&!trustRefs.length)errors.push(`${b.id}: كتلة الثقة تحتاج trust_metric_refs`);
  if(b.type==="benefit"){
    const bodyKey=normalize(b.body);if(benefitBodies.has(bodyKey))errors.push(`${b.id}: فائدة مكررة بالنص نفسه`);benefitBodies.add(bodyKey);
    for(const st of statements){const factKey=claims.get(st.claim_ref)?.fact_key;if(factKey&&benefitFacts.has(factKey))errors.push(`${b.id}: الحقيقة نفسها مستخدمة كأكثر من فائدة`);if(factKey)benefitFacts.add(factKey)}
  }
  scan(b.id,`${b.heading} ${b.body}`,statements.map(st=>st.claim_ref),trustRefs);
}
for(const t of ["specifications","policies"])if(!types.has(t))errors.push(`كتلة مطلوبة مفقودة: ${t}`);

for(const m of x.media_plan||[]){
  if(!imageIds.has(m.image_id))errors.push(`صورة غير موجودة: ${m.image_id}`);
  if(!refs.has(m.source_ref))errors.push(`${m.image_id}: مصدر غير موجود`);
  if(m.role!=="decorative"&&(!m.alt_text||/^(صورة|منتج|image)$/i.test(m.alt_text.trim())))errors.push(`${m.image_id}: نص بديل ناقص أو عام`);
  if(m.role==="decorative"&&m.alt_text!=="")errors.push(`${m.image_id}: الصورة الزخرفية تحتاج alt فارغ`);
  if(m.role!=="decorative"&&m.shows_verified_product!==true)errors.push(`${m.image_id}: صورة المنتج غير موسومة كتطابق متحقق`);
}
if(!(x.media_plan||[]).length)errors.push("خطة صورة واحدة على الأقل مطلوبة");

if(!["verified_questions_included","no_verified_questions"].includes(x.faq_status))errors.push("faq_status غير صالح");
if(x.faq_status==="no_verified_questions"&&(x.faq||[]).length)errors.push("faq_status لا يتسق مع وجود أسئلة");
if(x.faq_status==="verified_questions_included"&&!(x.faq||[]).length)errors.push("الحالة تقول إن الأسئلة مضمنة لكن القائمة فارغة");
const faqQuestions=new Set(),faqLocators=new Set();
for(const q of x.faq||[]){
  const qSource=refs.get(q.question_source_ref);
  if(!q.question||!q.answer||!qSource||!["merchant_question_log","customer_support_log","search_query_log"].includes(qSource.type))errors.push("سؤال شائع ناقص أو بلا مصدر سؤال فعلي");
  const questionKey=normalize(q.question);if(faqQuestions.has(questionKey))errors.push(`سؤال FAQ مكرر: ${q.question}`);faqQuestions.add(questionKey);
  if(!q.source_locator)errors.push(`${q.question||"FAQ"}: source_locator مطلوب`);else{const locatorKey=`${normalize(qSource?.url_or_path)}#${normalize(q.source_locator)}`;if(faqLocators.has(locatorKey))errors.push(`${q.question||"FAQ"}: موضع المصدر الفعلي مكرر`);faqLocators.add(locatorKey)}
  const qClaims=q.claim_ref?[q.claim_ref]:[];
  for(const id of qClaims)if(!claims.has(id))errors.push(`مرجع FAQ غير موجود: ${id}`);
  for(const id of q.policy_refs||[])if(!policyRefs.has(id))errors.push(`سياسة FAQ غير موجودة: ${id}`);
  if(q.claim_ref&&!allowedClaimCopy(q.answer,q.claim_ref))errors.push("إجابة FAQ لا تطابق نسخة ادعاء معتمدة");
  if(!q.claim_ref&&!(q.policy_refs||[]).length)errors.push("إجابة FAQ تحتاج ادعاءً أو سياسة موثقة");
  scan("faq",q.answer,qClaims,[]);
}

for(const k of ["title","description"])if(!x.seo?.[k])errors.push(`seo.${k} مطلوب`);
for(const st of x.seo?.statements||[]){if(!claims.has(st.claim_ref)||!allowedClaimCopy(st.text,st.claim_ref))errors.push("SEO statement غير معتمد")}
if((x.seo?.statements||[]).length&&normalize(x.seo.description)!==normalize(x.seo.statements.map(st=>st.text).join(" ")))errors.push("seo.description يجب أن يتكون فقط من statements المعتمدة عند استخدامها");
scan("seo",`${x.seo?.title||""} ${x.seo?.description||""}`,(x.seo?.statements||[]).map(st=>st.claim_ref),[]);
if(x.status==="review_ready"&&(x.blockers||[]).length)errors.push("review_ready لا يسمح بموانع");
console.log(JSON.stringify({valid:!errors.length,errors,status:x.status},null,2));
if(errors.length)process.exit(1);
