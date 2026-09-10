#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const file=process.argv[2];
if(!file){console.error("الاستخدام: node scripts/evaluate-launch-gates.mjs <gates.json> [artifact-root]");process.exit(2)}
// Data references are rooted in the evidence bundle, never the installation parent.
// Validator paths are fixed package assets, not executable paths supplied by the input.
const x=JSON.parse(fs.readFileSync(file,"utf8")),errors=[];
const artifactRoot=fs.realpathSync(path.resolve(process.argv[3] || path.dirname(path.resolve(file))));
const skillRoot=fs.realpathSync(fileURLToPath(new URL("../",import.meta.url)));
const allowedTop=new Set(["schema_version","status","evaluation","artifact_register","gates","purchase_event_reconciliation","rollback_plan","noncritical_improvements","blockers"]);
for(const key of Object.keys(x))if(!allowedTop.has(key))errors.push(`حقل علوي غير معروف: ${key}`);
if(x.schema_version!==1)errors.push("schema_version يجب أن يساوي 1");
if(!["decision_ready","blocked"].includes(x.status))errors.push("status غير صالح");

const stripInvisible=value=>String(value??"").normalize("NFKC").replace(/[\p{Cf}\u2060\uFEFF]/gu,"");
const nonBlank=value=>typeof value==="string"&&stripInvisible(value).trim().length>0;
const visibleText=value=>nonBlank(value)&&value===value.trim()&&!/[\p{Cc}\p{Cf}]/u.test(value);
const asArray=(value,label)=>{if(!Array.isArray(value)){errors.push(`${label} يجب أن تكون قائمة`);return[]}return value};
const validDate=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value||""))return false;const d=new Date(`${value}T00:00:00Z`);return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===value};
const validTimestamp=value=>{const m=typeof value==="string"&&value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/);return !!m&&validDate(m[1])&&Number(m[2])<24&&Number(m[3])<60&&Number(m[4])<60&&Number.isFinite(Date.parse(value))};
const validHttps=value=>{if(typeof value!=="string"||value!==value.trim()||/[\p{Cc}\p{Cf}]/u.test(value))return false;try{const u=new URL(value);return u.protocol==="https:"&&!!u.hostname&&!u.username&&!u.password}catch{return false}};
const parseRef=value=>{if(typeof value!=="string"||value!==value.trim()||/[\p{Cc}\p{Cf}]/u.test(value))return null;if(validHttps(value))return{remote:true};let decoded=value;for(let i=0;i<3;i++){try{const next=decodeURIComponent(decoded);if(next===decoded)break;decoded=next}catch{return null}}if(/^[a-z][a-z0-9+.-]*:/iu.test(decoded))return null;if((decoded.match(/#/g)||[]).length!==1)return null;const [base,fragment]=decoded.split("#");if(!base||!fragment||base!==base.trim()||fragment!==fragment.trim()||base.startsWith("/")||base.includes("\\")||base.split("/").some(part=>!part||part==="."||part===".."))return null;return{base,fragment}};
const resolveFragment=(data,fragment)=>{let current=data;for(const key of fragment.split(/[./]/).filter(Boolean)){if(current===null||typeof current!=="object"||!Object.prototype.hasOwnProperty.call(current,key))return{found:false};current=current[key]}return{found:true,value:current}};
const readLocal=value=>{const ref=parseRef(value);if(!ref||ref.remote)return null;const resolved=path.resolve(artifactRoot,ref.base);if(!resolved.startsWith(`${artifactRoot}${path.sep}`)||!fs.existsSync(resolved)||!fs.statSync(resolved).isFile())return null;const real=fs.realpathSync(resolved);if(!real.startsWith(`${artifactRoot}${path.sep}`))return null;try{const raw=fs.readFileSync(real),data=JSON.parse(raw.toString("utf8")),fragment=resolveFragment(data,ref.fragment);return fragment.found?{resolved:real,data,value:fragment.value,fragment:ref.fragment,sha256:createHash("sha256").update(raw).digest("hex")}:null}catch{return null}};
const baseRef=value=>parseRef(value)?.base||null;
const timestampOffset=value=>typeof value==="string"?(value.endsWith("Z")?"+00:00":value.match(/([+-]\d{2}:\d{2})$/)?.[1]||null):null;

const evaluation=x.evaluation||{},evaluated=Date.parse(evaluation.evaluated_at||""),launch=Date.parse(evaluation.launch_start||"");
const marketOffsets=new Map([["SA","+03:00"],["AE","+04:00"],["BH","+03:00"]]);
if(!validHttps(evaluation.store_url)||!marketOffsets.has(evaluation.market)||!visibleText(evaluation.build_version)||!["staging","sandbox","production_preview"].includes(evaluation.environment)||!validTimestamp(evaluation.evaluated_at)||!validTimestamp(evaluation.launch_start)||launch<=evaluated||timestampOffset(evaluation.launch_start)!==marketOffsets.get(evaluation.market)||!visibleText(evaluation.decision_owner))errors.push("بيانات التقييم غير صالحة");

const requiredArtifacts=new Map([["compliance_audit","compliance-approved"],["trust_center","trust-center-published"],["order_journey_test","order-journey-verified"],["launch_campaign","launch-campaign-ready"],["launch_measurement","launch-measurement-verified"]]);
const expectedValidators=new Map([["compliance_audit","scripts/validators/validate-compliance-audit.mjs"],["trust_center","scripts/validators/validate-trust-center.mjs"],["order_journey_test","scripts/validators/validate-order-journey-test.mjs"],["launch_campaign","scripts/validators/validate-launch-campaign.mjs"],["launch_measurement","scripts/validators/validate-launch-measurement.mjs"]]);
const expectedRoles=new Map([["compliance_audit","legal_or_compliance_reviewer"],["trust_center","content_owner"],["order_journey_test","operations_owner"],["launch_campaign","campaign_owner"],["launch_measurement","analytics_owner"]]);
const readyStatuses=new Map([["compliance_audit",new Set(["ready_for_specialist_review"])],["trust_center",new Set(["review_ready"])],["order_journey_test",new Set(["verified"])],["launch_campaign",new Set(["ready"])],["launch_measurement",new Set(["verified"])] ]);
const allowedEvidenceRoots=new Map([
  ["compliance_audit",new Set(["requirements","gaps","manual_review"])],
  ["trust_center",new Set(["placements","verified_facts"])],
  ["order_journey_test",new Set(["scenarios","evidence_register"])],
  ["launch_campaign",new Set(["schedule","assets","channels"])],
  ["launch_measurement",new Set(["validation_cases","purchase_reconciliation","metrics"])],
]);
const artifactList=asArray(x.artifact_register,"artifact_register"),artifacts=new Map(),types=new Map();
for(const artifact of artifactList){
  const generated=Date.parse(artifact.generated_at||""),executed=Date.parse(artifact.validator?.executed_at||""),approved=Date.parse(artifact.approval?.approved_at||"");
  const artifactLocal=readLocal(artifact.reference),reportLocal=readLocal(artifact.validator?.report_ref),approvalLocal=readLocal(artifact.approval?.reference),expectedScript=expectedValidators.get(artifact.type);
  if(!visibleText(artifact.id)||artifacts.has(artifact.id)||!requiredArtifacts.has(artifact.type)||types.has(artifact.type)||!artifactLocal||!visibleText(artifact.version)||!visibleText(artifact.build_version)||artifact.build_version!==evaluation.build_version||!validTimestamp(artifact.generated_at)||generated>evaluated||!["ready","blocked","review_required"].includes(artifact.readiness)||artifact.validator?.script_ref!==expectedScript||!reportLocal||!["passed","failed"].includes(artifact.validator?.status)||!Number.isInteger(artifact.validator?.exit_code)||!validTimestamp(artifact.validator?.executed_at)||executed<=generated||executed>evaluated||!["approved","pending"].includes(artifact.approval?.status)||artifact.approval?.approver_role!==expectedRoles.get(artifact.type)||!approvalLocal||!validTimestamp(artifact.approval?.approved_at)||approved<=executed||approved>evaluated)errors.push(`ملف مكرر أو ناقص أو من بناء مختلف أو بلا تقرير أو موافقة محلية قابلة للتحقق: ${artifact.id||"بدون معرف"}`);
  const report=reportLocal?.value,approval=approvalLocal?.value;
  if(artifact.validator?.status==="passed"&&artifact.validator?.exit_code!==0)errors.push(`${artifact.id}: تقرير المدقق passed لكن exit_code ليس صفرًا`);
  if(artifact.validator?.status==="failed"&&artifact.validator?.exit_code===0)errors.push(`${artifact.id}: تقرير المدقق failed لكن exit_code صفر`);
  const reportBound=!!report&&report.valid===(artifact.validator?.status==="passed")&&report.exit_code===artifact.validator?.exit_code&&report.artifact_id===artifact.id&&report.artifact_type===artifact.type&&report.artifact_reference===artifact.reference&&report.build_version===artifact.build_version&&report.artifact_sha256===artifactLocal?.sha256&&report.executed_at===artifact.validator?.executed_at;
  if(!reportBound)errors.push(`${artifact.id}: محتوى تقرير المدقق غير مربوط بالملف أو البصمة أو التنفيذ المسجل`);
  const approvalBound=!!approval&&approval.status===artifact.approval?.status&&approval.approver_role===expectedRoles.get(artifact.type)&&approval.artifact_id===artifact.id&&approval.artifact_type===artifact.type&&approval.artifact_reference===artifact.reference&&approval.build_version===artifact.build_version&&approval.artifact_sha256===artifactLocal?.sha256&&approval.validator_report_ref===artifact.validator?.report_ref&&approval.validator_executed_at===artifact.validator?.executed_at&&approval.approved_at===artifact.approval?.approved_at;
  if(!approvalBound)errors.push(`${artifact.id}: محتوى الموافقة غير مربوط بالملف أو تقرير المدقق أو التوقيت المسجل`);
  const scriptPath=expectedScript&&path.resolve(skillRoot,expectedScript),run=scriptPath&&fs.existsSync(scriptPath)?spawnSync(process.execPath,[scriptPath,artifactLocal?.resolved,artifactRoot],{encoding:"utf8"}):null;
  if(!run||run.error||run.status!==artifact.validator?.exit_code)errors.push(`${artifact.id}: إعادة تشغيل المدقق لا تطابق exit_code المسجل`);
  const actualBuild=artifactLocal?.data?.build?.version;if(actualBuild&&actualBuild!==artifact.build_version)errors.push(`${artifact.id}: إصدار البناء داخل الملف لا يطابق السجل`);
  if(artifact.type==="compliance_audit"&&artifactLocal?.data?.jurisdiction?.country_code!==evaluation.market)errors.push(`${artifact.id}: سوق ملف الامتثال لا يطابق سوق قرار الإطلاق`);
  if(artifact.type==="launch_campaign"){
    const campaign=artifactLocal?.data?.campaign||{},starts=Date.parse(campaign.start_at||""),ends=Date.parse(campaign.end_at||"");
    if(campaign.market!==evaluation.market)errors.push(`${artifact.id}: سوق الحملة لا يطابق سوق قرار الإطلاق`);
    if(!Number.isFinite(starts)||!Number.isFinite(ends)||launch<starts||launch>ends)errors.push(`${artifact.id}: موعد الإطلاق خارج نافذة الحملة الفعلية`);
  }
  const sourceReady=!!readyStatuses.get(artifact.type)?.has(artifactLocal?.data?.status),validatorReady=artifact.validator?.status==="passed"&&artifact.validator?.exit_code===0&&reportBound&&!!run&&!run.error&&run.status===0,approvalReady=artifact.approval?.status==="approved"&&approvalBound;
  if(artifact.readiness==="ready"&&!(sourceReady&&validatorReady&&approvalReady))errors.push(`${artifact.id}: readiness=ready لا تطابق الملف والمدقق والموافقة الفعلية`);
  if(artifact.readiness==="review_required"&&!(sourceReady&&validatorReady&&artifact.approval?.status==="pending"&&approvalBound))errors.push(`${artifact.id}: review_required لا تطابق ملفًا صالحًا ينتظر الموافقة`);
  if(artifact.readiness==="blocked"&&sourceReady&&validatorReady)errors.push(`${artifact.id}: blocked لا يطابق حالة الملف والمدقق الفعلية`);
  artifacts.set(artifact.id,{...artifact,_local:artifactLocal,_rerunPassed:!!run&&!run.error&&run.status===0,_reportBound:reportBound,_approvalBound:approvalBound});types.set(artifact.type,artifact.id);
}
for(const type of requiredArtifacts.keys())if(!types.has(type))errors.push(`ملف مطلوب مفقود: ${type}`);

const requiredGates=new Map([...requiredArtifacts].map(([type,gate])=>[gate,type])),gateIds=new Set(),gateById=new Map(),gateList=asArray(x.gates,"gates");
for(const gate of gateList){
  const artifact=artifacts.get(gate.artifact_ref);
  if(!visibleText(gate.id)||gateIds.has(gate.id)||!requiredGates.has(gate.id)||gate.critical!==true||!["passed","failed","not_tested","stale"].includes(gate.status)||!visibleText(gate.artifact_ref)||!artifact||artifact.type!==requiredGates.get(gate.id))errors.push(`بوابة مكررة أو ناقصة أو مرتبطة بملف خاطئ: ${gate.id||"بدون معرف"}`);
  if(gate.status==="passed"){
    const evidenceLocal=readLocal(gate.evidence_ref);
    const evidenceRoot=parseRef(gate.evidence_ref)?.fragment?.split(/[./]/).filter(Boolean)[0];
    if(!evidenceLocal||baseRef(gate.evidence_ref)!==baseRef(artifact?.reference)||!allowedEvidenceRoots.get(artifact?.type)?.has(evidenceRoot)||artifact?.readiness!=="ready"||artifact?.validator?.status!=="passed"||artifact?.validator?.exit_code!==0||artifact?.approval?.status!=="approved"||artifact?._rerunPassed!==true||artifact?._reportBound!==true||artifact?._approvalBound!==true)errors.push(`${gate.id}: passed بلا ملف جاهز ومدقق وموافق عليه ودليل دلالي من الملف نفسه`);
  }else{
    if(!visibleText(gate.reason))errors.push(`${gate.id}: الحالة تحتاج سببًا ظاهرًا`);
    const artifactActuallyReady=artifact?.readiness==="ready"&&artifact?.validator?.status==="passed"&&artifact?.validator?.exit_code===0&&artifact?.approval?.status==="approved"&&artifact?._rerunPassed===true&&artifact?._reportBound===true&&artifact?._approvalBound===true;
    if(gate.status==="failed"&&artifactActuallyReady)errors.push(`${gate.id}: لا يجوز تسجيل failed بينما الملف والمدقق والموافقة كلها ناجحة`);
  }
  gateIds.add(gate.id);gateById.set(gate.id,gate);
}
for(const id of requiredGates.keys())if(!gateIds.has(id))errors.push(`بوابة مطلوبة مفقودة: ${id}`);

const measurementPassed=gateById.get("launch-measurement-verified")?.status==="passed",reconciliation=x.purchase_event_reconciliation;
if(measurementPassed){
  const rec=reconciliation||{};
  for(const key of ["transaction_id","event_transaction_id","currency","value_basis","measurement_artifact_ref"])if(!visibleText(rec[key]))errors.push(`purchase_event_reconciliation.${key} مطلوب ويجب أن يكون نصًا ظاهرًا`);
  for(const key of ["expected_value","actual_value","tolerance"])if(!Number.isFinite(rec[key])||rec[key]<0)errors.push(`purchase_event_reconciliation.${key} رقم غير سالب مطلوب`);
  if(rec.transaction_id!==rec.event_transaction_id)errors.push("معرف حدث الشراء لا يطابق معرف الطلب");
  if(!/^[A-Z]{3}$/.test(rec.currency||""))errors.push("عملة مطابقة الشراء غير صالحة");
  if(rec.items_match!==true)errors.push("عناصر مطابقة الشراء يجب أن تكون متطابقة صراحة");
  if(Number.isFinite(rec.expected_value)&&Number.isFinite(rec.actual_value)&&Number.isFinite(rec.tolerance)&&Math.abs(rec.expected_value-rec.actual_value)>rec.tolerance)errors.push("قيمة حدث الشراء خارج السماحية");
  const artifact=artifacts.get(rec.measurement_artifact_ref),actual=artifact?._local?.data?.purchase_reconciliation;
  if(!artifact||artifact.type!=="launch_measurement")errors.push("مرجع ملف القياس غير صالح");
  else if(!actual||actual.transaction_id!==rec.transaction_id||actual.event_transaction_id!==rec.event_transaction_id||actual.currency!==rec.currency||actual.expected_value!==rec.expected_value||actual.actual_value!==rec.actual_value||actual.value_basis!==rec.value_basis||actual.tolerance!==rec.tolerance||actual.items_match!==true)errors.push("مطابقة الشراء لا تطابق ملف القياس الفعلي أو عناصر الطلب غير متطابقة");
}

for(const key of ["trigger","decision_owner","action","communication_channel","recovery_evidence"])if(!visibleText(x.rollback_plan?.[key]))errors.push(`rollback_plan.${key} مطلوب`);
const blockerValid=b=>visibleText(b)||(b&&typeof b==="object"&&!Array.isArray(b)&&visibleText(b.code)&&visibleText(b.owner)&&visibleText(b.action));
if(!Array.isArray(x.blockers)||(x.blockers||[]).some(b=>!blockerValid(b)))errors.push("blockers يجب أن تكون قائمة أسباب واضحة");
const blockerKeys=(x.blockers||[]).map(b=>typeof b==="string"?stripInvisible(b).trim().toLowerCase():stripInvisible(b?.code).trim().toLowerCase());
if(new Set(blockerKeys).size!==blockerKeys.length)errors.push("blockers تحتوي مانعًا مكررًا");
if(!Array.isArray(x.noncritical_improvements))errors.push("noncritical_improvements يجب أن تكون قائمة");
const improvementKeys=[];
for(const improvement of x.noncritical_improvements||[]){
  const due=Date.parse(improvement?.due_at||""),text=JSON.stringify(improvement||{});
  if(!improvement||typeof improvement!=="object"||Array.isArray(improvement)||!visibleText(improvement.summary)||!visibleText(improvement.owner)||!(validDate(improvement.due_at)||validTimestamp(improvement.due_at))||!Number.isFinite(due)||due<evaluated)errors.push("كل تحسين غير حرج يحتاج summary وowner وdue_at صالحًا");
  if(visibleText(improvement?.summary))improvementKeys.push(stripInvisible(improvement.summary).trim().toLowerCase());
  if(/(critical|حرج|دفع|payment|checkout|امتثال|compliance|أمان|security|طلب\s+مكرر|purchase\s+(?:duplicate|duplication)|تكرار\s+(?:حدث\s+)?الشراء)/i.test(text))errors.push("لا يجوز إخفاء عيب حرج داخل noncritical_improvements");
}
if(new Set(improvementKeys).size!==improvementKeys.length)errors.push("noncritical_improvements تحتوي تحسينًا مكررًا");
const failed=[...requiredGates.keys()].filter(id=>gateById.get(id)?.status!=="passed"),decision=errors.length||failed.length||(x.blockers||[]).length?"postpone":"launch";
if(x.status==="decision_ready"&&decision!=="launch")errors.push("decision_ready يتطلب نجاح كل البوابات وعدم وجود موانع");
if(x.status==="blocked"&&!(x.blockers||[]).length&&!failed.length)errors.push("blocked يحتاج مانعًا أو بوابة غير ناجحة");
console.log(JSON.stringify({valid:!errors.length,errors,decision,critical_blockers:failed,artifact_count:artifacts.size},null,2));
if(errors.length)process.exit(1);
