#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const fixtureRoot=fileURLToPath(new URL("../examples",import.meta.url));
const base=JSON.parse(fs.readFileSync(new URL("../examples/example-gates.json",import.meta.url),"utf8"));
const clone=()=>structuredClone(base),validator=fileURLToPath(new URL("./evaluate-launch-gates.mjs",import.meta.url));
const art=(x,type)=>x.artifact_register.find(a=>a.type===type),gate=(x,id)=>x.gates.find(g=>g.id===id);
const postpone=(x,id="launch-campaign-ready")=>{x.status="blocked";const g=gate(x,id);g.status="stale";g.reason="يحتاج إعادة تحقق";return x};
const cases=[
  ["valid launch",true,x=>x],
  ["bad schema",false,x=>{x.schema_version=2;return x}],
  ["unknown top",false,x=>{x.score=100;return x}],
  ["bad market",false,x=>{x.evaluation.market="Saudi";return x}],
  ["production forbidden",false,x=>{x.evaluation.environment="production";return x}],
  ["impossible evaluated at",false,x=>{x.evaluation.evaluated_at="2026-09-31T12:00:00Z";return x}],
  ["date only launch",false,x=>{x.evaluation.launch_start="2026-09-01";return x}],
  ["locale evaluated at",false,x=>{x.evaluation.evaluated_at="08/27/2026 12:00";return x}],
  ["launch before evaluation",false,x=>{x.evaluation.launch_start="2026-08-20T00:00:00Z";return x}],
  ["blank decision owner",false,x=>{x.evaluation.decision_owner="   ";return x}],
  ["missing artifact",false,x=>{x.artifact_register=x.artifact_register.filter(a=>a.type!=="trust_center");return x}],
  ["duplicate artifact type",false,x=>{const a=structuredClone(x.artifact_register[0]);a.id="another";x.artifact_register.push(a);return x}],
  ["bad artifact ref",false,x=>{x.artifact_register[0].reference="file.json";return x}],
  ["remote artifact rejected",false,x=>{x.artifact_register[0].reference="https://store.example/report.json#result";return x}],
  ["artifact wrong build",false,x=>{x.artifact_register[0].build_version="release-41";return x}],
  ["blank artifact version",false,x=>{x.artifact_register[0].version="   ";return x}],
  ["future artifact",false,x=>{x.artifact_register[0].generated_at="2026-08-28T00:00:00Z";return x}],
  ["date only generated at",false,x=>{x.artifact_register[0].generated_at="2026-08-26";return x}],
  ["wrong validator script",false,x=>{x.artifact_register[0].validator.script_ref="/usr/bin/false";return x}],
  ["missing validator report",false,x=>{x.artifact_register[0].validator.report_ref="";return x}],
  ["remote validator report rejected",false,x=>{x.artifact_register[0].validator.report_ref="https://store.example/report.json#result";return x}],
  ["nonexistent validator report",false,x=>{x.artifact_register[0].validator.report_ref="validator-reports/missing.json#result";return x}],
  ["localized validator report",true,x=>{const a=art(x,"launch_measurement");a.validator.report_ref="validator-reports/تقرير-قياس.json#result";a.approval.reference="approvals/measurement-localized-report.json#approval";return x}],
  ["nested validator report",true,x=>{const a=art(x,"launch_campaign");a.validator.report_ref="validator-reports/nested.json#wrapper/result";a.approval.reference="approvals/nested-report.json#approval";return x}],
  ["nested approval",true,x=>{art(x,"launch_campaign").approval.reference="approvals/nested.json#wrapper/approval";return x}],
  ["passed nonzero exit",false,x=>{x.artifact_register[0].validator.exit_code=1;return x}],
  ["outer report mismatch",false,x=>{x.artifact_register[0].validator.status="failed";x.artifact_register[0].validator.exit_code=1;return x}],
  ["validator time equals artifact",false,x=>{x.artifact_register[0].validator.executed_at=x.artifact_register[0].generated_at;return x}],
  ["approval time equals artifact",false,x=>{x.artifact_register[0].approval.approved_at=x.artifact_register[0].generated_at;return x}],
  ["compliance wrong reviewer",false,x=>{art(x,"compliance_audit").approval.approver_role="merchant";return x}],
  ["campaign intern reviewer",false,x=>{art(x,"launch_campaign").approval.approver_role="intern";return x}],
  ["bad approval ref",false,x=>{x.artifact_register[0].approval.reference="approval";return x}],
  ["remote approval rejected",false,x=>{x.artifact_register[0].approval.reference="https://store.example/approval.json#approval";return x}],
  ["approval before artifact",false,x=>{x.artifact_register[0].approval.approved_at="2026-08-25T00:00:00Z";return x}],
  ["approval in future",false,x=>{x.artifact_register[0].approval.approved_at="2026-08-28T00:00:00Z";return x}],
  ["missing gate",false,x=>{x.gates=x.gates.filter(g=>g.id!=="launch-campaign-ready");return x}],
  ["duplicate gate",false,x=>{x.gates.push(structuredClone(x.gates[0]));return x}],
  ["gate wrong artifact",false,x=>{gate(x,"launch-campaign-ready").artifact_ref="art-order";return x}],
  ["gate evidence from other artifact",false,x=>{gate(x,"compliance-approved").evidence_ref="artifacts/test-order-payment-shipping/example-order-test.json#scenarios";return x}],
  ["gate nonexistent anchor",false,x=>{gate(x,"compliance-approved").evidence_ref="artifacts/audit-commerce-compliance/example-audit.json#does_not_exist";return x}],
  ["gate numeric zero fragment",true,x=>{gate(x,"launch-campaign-ready").evidence_ref="artifacts/plan-store-launch-campaign/example-launch-campaign.json#channels.1.budget.amount";return x}],
  ["gate malformed double fragment",false,x=>{gate(x,"launch-measurement-verified").evidence_ref="artifacts/define-launch-measurement/example-launch-measurement.json#validation_cases#bogus";return x}],
  ["gate noncritical",false,x=>{x.gates[0].critical=false;return x}],
  ["passed no evidence",false,x=>{x.gates[0].evidence_ref="";return x}],
  ["passed artifact blocked",false,x=>{art(x,"trust_center").readiness="blocked";return x}],
  ["register ready but actual blocked",false,x=>{const a=art(x,"launch_measurement");a.reference="artifacts/define-launch-measurement/example-launch-measurement-blocked.json#validation_cases";return x}],
  ["passed validator failed",false,x=>{art(x,"order_journey_test").validator.status="failed";art(x,"order_journey_test").validator.exit_code=1;return x}],
  ["passed approval pending",false,x=>{art(x,"launch_campaign").approval.status="pending";return x}],
  ["failed gate no reason",false,x=>{gate(x,"launch-measurement-verified").status="failed";return x}],
  ["failed gate blank reason",false,x=>{const g=gate(x,"launch-measurement-verified");g.status="stale";g.reason="   ";return x}],
  ["purchase transaction mismatch",false,x=>{x.purchase_event_reconciliation.event_transaction_id="OTHER-42";return x}],
  ["purchase currency mismatch",false,x=>{x.purchase_event_reconciliation.currency="USD";return x}],
  ["purchase value mismatch",false,x=>{x.purchase_event_reconciliation.actual_value=100;return x}],
  ["purchase wrong artifact",false,x=>{x.purchase_event_reconciliation.measurement_artifact_ref="art-order";return x}],
  ["purchase value basis mismatch",false,x=>{x.purchase_event_reconciliation.value_basis="الإجمالي قبل الشحن";return x}],
  ["purchase tolerance mismatch",false,x=>{x.purchase_event_reconciliation.tolerance=999;return x}],
  ["bad rollback",false,x=>{x.rollback_plan.trigger="";return x}],
  ["critical issue hidden as improvement",false,x=>{x.noncritical_improvements=["خلل حرج في الدفع عند checkout"];return x}],
  ["ready with blocker",false,x=>{x.blockers=["مانع"];return x}],
  ["blank blocker",false,x=>{x.status="blocked";x.blockers=["   "];return x}],
  ["blocked no blocker or failed gate",false,x=>{x.status="blocked";return x}],
  ["blocked by external decision",true,x=>{x.status="blocked";x.blockers=["قرار المالك معلق"];return x}],
  ["valid measurement postponement without reconciliation",true,x=>{x.status="blocked";delete x.purchase_event_reconciliation;const a=art(x,"launch_measurement");a.reference="artifacts/define-launch-measurement/example-launch-measurement-blocked.json#validation_cases";a.readiness="blocked";a.validator.report_ref="validator-reports/measurement-blocked.json#result";a.approval.status="pending";a.approval.reference="approvals/measurement-pending.json#approval";const g=gate(x,"launch-measurement-verified");g.status="failed";g.reason="حدث الشراء لم يسجل";return x}],
  ["unsupported ISO-like market",false,x=>{x.evaluation.market="ZZ";return x}],
  ["artifact markets must match evaluation",false,x=>{x.evaluation.market="AE";return x}],
  ["launch outside campaign window",false,x=>{x.evaluation.launch_start="2026-09-09T09:00:00+03:00";return x}],
  ["valid owned improvement",true,x=>{x.noncritical_improvements=[{summary:"تحسين نص زر ثانوي",owner:"مالك المحتوى",due_at:"2026-09-05"}];return x}],
  ["improvement missing owner",false,x=>{x.noncritical_improvements=[{summary:"تحسين نص زر",due_at:"2026-09-05"}];return x}],
  ["duplicate purchase hidden as improvement",false,x=>{x.noncritical_improvements=[{summary:"تكرار حدث الشراء للطلب نفسه",owner:"التحليلات",due_at:"2026-09-05"}];return x}],
  ["schema version is not gate evidence",false,x=>{gate(x,"launch-campaign-ready").evidence_ref="artifacts/plan-store-launch-campaign/example-launch-campaign.json#schema_version";return x}],
  ["pending outer approval cannot point to approved document",false,x=>{x.status="blocked";delete x.purchase_event_reconciliation;const a=art(x,"launch_measurement");a.reference="artifacts/define-launch-measurement/example-launch-measurement-blocked.json#validation_cases";a.readiness="blocked";a.approval.status="pending";const g=gate(x,"launch-measurement-verified");g.status="failed";g.reason="حدث الشراء لم يسجل";return x}],
  ["failed gate cannot hide healthy artifact",false,x=>{x.status="blocked";const g=gate(x,"launch-campaign-ready");g.status="failed";g.reason="فشل يدوي";return x}],
  ["invisible store url",false,x=>{x.evaluation.store_url+="\u200B";return x}],
  ["invisible evaluation build",false,x=>{x.evaluation.build_version+="\u200B";return x}],
  ["invisible decision owner",false,x=>{x.evaluation.decision_owner="\u200B";return x}],
  ["wrong Saudi launch offset",false,x=>{x.evaluation.launch_start="2026-09-01T09:00:00+04:00";return x}],
  ["numeric artifact id",false,x=>{const a=art(x,"compliance_audit");a.id=7;gate(x,"compliance-approved").artifact_ref=7;return x}],
  ["invisible artifact id",false,x=>{const a=art(x,"compliance_audit");a.id="art-compliance\u200B";gate(x,"compliance-approved").artifact_ref=a.id;return x}],
  ["invisible artifact version",false,x=>{art(x,"compliance_audit").version="\u200B";return x}],
  ["javascript artifact reference",false,x=>{art(x,"compliance_audit").reference="javascript:alert(1)#requirements";return x}],
  ["encoded traversal artifact reference",false,x=>{art(x,"compliance_audit").reference="skills%2F..%2Fsecret.json#requirements";return x}],
  ["cross wired validator reports",false,x=>{const a=art(x,"compliance_audit"),b=art(x,"trust_center");[a.validator.report_ref,b.validator.report_ref]=[b.validator.report_ref,a.validator.report_ref];return x}],
  ["changed validator execution time",false,x=>{art(x,"compliance_audit").validator.executed_at="2026-08-27T08:01:00Z";return x}],
  ["approval equal to validator time",false,x=>{art(x,"compliance_audit").approval.approved_at="2026-08-27T08:00:00Z";return x}],
  ["cross wired approval documents",false,x=>{const a=art(x,"compliance_audit"),b=art(x,"trust_center");[a.approval.reference,b.approval.reference]=[b.approval.reference,a.approval.reference];return x}],
  ["ready with pending approval",false,x=>{art(x,"launch_campaign").approval.status="pending";return x}],
  ["review required despite approved",false,x=>{art(x,"launch_campaign").readiness="review_required";return x}],
  ["blocked despite healthy source",false,x=>{art(x,"launch_campaign").readiness="blocked";postpone(x);return x}],
  ["invisible gate id",false,x=>{gate(x,"launch-campaign-ready").id="launch-campaign-ready\u200B";return x}],
  ["numeric gate artifact ref",false,x=>{gate(x,"launch-campaign-ready").artifact_ref=7;return x}],
  ["javascript gate evidence",false,x=>{gate(x,"launch-campaign-ready").evidence_ref="javascript:alert(1)#schedule";return x}],
  ["invisible stale reason",false,x=>{postpone(x);gate(x,"launch-campaign-ready").reason="\u200B";return x}],
  ["invisible reconciliation id",false,x=>{x.purchase_event_reconciliation.transaction_id="\u200B";return x}],
  ["missing reconciliation items match",false,x=>{delete x.purchase_event_reconciliation.items_match;return x}],
  ["string reconciliation items match",false,x=>{x.purchase_event_reconciliation.items_match="true";return x}],
  ["invisible rollback action",false,x=>{x.rollback_plan.action="\u200B";return x}],
  ["duplicate blockers",false,x=>{x.status="blocked";x.blockers=["قرار المالك معلق","قرار المالك معلق"];return x}],
  ["invisible blocker object action",false,x=>{x.status="blocked";x.blockers=[{code:"owner-decision",owner:"مدير الإطلاق",action:"\u200B"}];return x}],
  ["invisible improvement summary",false,x=>{x.noncritical_improvements=[{summary:"\u200B",owner:"المحتوى",due_at:"2026-09-05"}];return x}],
  ["duplicate improvements",false,x=>{const i={summary:"تحسين نص ثانوي",owner:"المحتوى",due_at:"2026-09-05"};x.noncritical_improvements=[i,{...i}];return x}],
  ["numeric improvement owner",false,x=>{x.noncritical_improvements=[{summary:"تحسين نص ثانوي",owner:7,due_at:"2026-09-05"}];return x}],
  ["tab validator report reference",false,x=>{art(x,"compliance_audit").validator.report_ref="validator-reports/compliance.json\t#result";return x}],
  ["encoded traversal approval reference",false,x=>{art(x,"compliance_audit").approval.reference="skills%2F..%2Fapproval.json#approval";return x}],
  ["artifact register object",false,x=>{x.artifact_register={};return x}],
  ["gates object",false,x=>{x.gates={};return x}],
];

let failed=0;
for(const [name,expected,mutate] of cases){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"launch-gate-")),input=path.join(dir,"in.json");
  fs.writeFileSync(input,JSON.stringify(mutate(clone()),null,2));
  const result=spawnSync(process.execPath,[validator,input,fixtureRoot],{encoding:"utf8"}),actual=result.status===0;
  fs.rmSync(dir,{recursive:true,force:true});
  if(actual!==expected){failed++;console.error(`FAIL ${name}\n${result.stdout}${result.stderr}`)}else console.log(`PASS ${name}`);
}
if(failed)process.exit(1);
console.log(`PASS ${cases.length}/${cases.length}`);
await import("./test-portable-package.mjs");
