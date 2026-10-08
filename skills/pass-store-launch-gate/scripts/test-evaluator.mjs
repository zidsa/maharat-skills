#!/usr/bin/env node
// Runs from any directory: node scripts/test-evaluator.mjs

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { evaluateReadiness } from "./evaluate-readiness.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.dirname(scriptDir);
const evaluator = path.join(scriptDir, "evaluate-readiness.mjs");
const example = JSON.parse(fs.readFileSync(path.join(skillDir, "examples/example-readiness.json"), "utf8"));
const clone = () => structuredClone(example);
const check = (data, id) => data.checks.find((item) => item.id === id);
const pass = (detail = "دليل مفحوص من صفحة المتجر", source = "public_url") => ({
  status: "passed",
  evidence: { source, detail, checked_at: "2026-09-27T21:00:00+03:00" },
});

const cases = [
  { name: "shipped example is a conditional launch", mutate: () => {}, valid: true, decision: "conditional_launch" },
  {
    name: "everything passed is a launch",
    mutate: (data) => {
      Object.assign(check(data, "products.options_complete"), pass(), { fix: undefined, note: undefined });
      Object.assign(check(data, "shipping.fulfilment_tried"), pass("أنشئت بوليصة تجريبية للطلب", "zid_dashboard"), { fix: undefined, note: undefined });
      data.decision = "launch";
    },
    valid: true,
    decision: "launch",
  },
  {
    name: "untested critical check postpones",
    mutate: (data) => { Object.assign(check(data, "payment.test_order_paid"), { status: "not_tested", evidence: undefined }); data.decision = "postpone"; delete data.rollback_plan; },
    valid: true,
    decision: "postpone",
  },
  {
    name: "a critical blocker cannot be stated as conditional",
    mutate: (data) => { Object.assign(check(data, "policies.returns_published"), { status: "failed", evidence: undefined }); },
    valid: false,
    includes: "لا يطابق القرار المحسوب",
  },
  {
    name: "test order check needs a real test order",
    mutate: (data) => { check(data, "payment.test_order_paid").evidence.source = "merchant"; },
    valid: false,
    includes: "طلب تجريبي حقيقي",
  },
  {
    name: "evidence older than 14 days is rejected",
    mutate: (data) => { check(data, "products.catalog_ready").evidence.checked_at = "2026-09-01T10:00:00+03:00"; },
    valid: false,
    includes: "أقدم من 14 يومًا",
  },
  {
    name: "evidence after the decision is rejected",
    mutate: (data) => { check(data, "products.stock_set").evidence.checked_at = "2026-09-29T10:00:00+03:00"; },
    valid: false,
    includes: "بعد وقت القرار",
  },
  {
    name: "a passed check needs evidence",
    mutate: (data) => { delete check(data, "policies.contact_working").evidence; },
    valid: false,
    includes: "evidence.source",
  },
  {
    name: "every listed check is required",
    mutate: (data) => { data.checks = data.checks.filter((item) => item.id !== "storefront.mobile_checkout"); },
    valid: false,
    includes: "storefront.mobile_checkout مفقود",
  },
  {
    name: "unknown and duplicate checks are rejected",
    mutate: (data) => { data.checks.push({ id: "store.looks_nice", status: "passed" }, structuredClone(check(data, "products.stock_set"))); },
    valid: false,
    includes: "معرّف غير معروف",
  },
  {
    name: "VAT check cannot be skipped by a registered store",
    mutate: (data) => { Object.assign(check(data, "policies.vat_display"), { status: "not_applicable", evidence: undefined }); },
    valid: false,
    includes: "لا يكون not_applicable",
  },
  {
    name: "VAT check is not applicable to an unregistered store",
    mutate: (data) => { data.vat_registered = false; },
    valid: false,
    includes: "شرطه غير متحقق",
  },
  {
    name: "a paid campaign makes the pixel critical",
    mutate: (data) => { data.paid_campaign_at_launch = true; Object.assign(check(data, "measurement.ads_pixel"), { status: "not_tested" }); data.decision = "postpone"; },
    valid: true,
    decision: "postpone",
  },
  {
    name: "a non-critical gap needs an owner",
    mutate: (data) => { delete check(data, "products.options_complete").fix.owner; },
    valid: false,
    includes: "fix يحتاج summary وowner",
  },
  {
    name: "a fix cannot be due before the decision",
    mutate: (data) => { check(data, "shipping.fulfilment_tried").fix.due_at = "2026-09-27T10:00:00+03:00"; },
    valid: false,
    includes: "بعد وقت القرار",
  },
  {
    name: "opening needs a rollback plan",
    mutate: (data) => { delete data.rollback_plan; },
    valid: false,
    includes: "rollback_plan.trigger",
  },
  {
    name: "times need an offset",
    mutate: (data) => { data.decision_at = "2026-09-28 10:00"; },
    valid: false,
    includes: "decision_at",
  },
  {
    name: "store url must be https",
    mutate: (data) => { data.store.url = "oud-alreef.zid.store"; },
    valid: false,
    includes: "store.url",
  },
];

let failures = 0;
for (const testCase of cases) {
  const data = clone();
  testCase.mutate(data);
  const result = evaluateReadiness(JSON.parse(JSON.stringify(data)));
  const ok = result.valid === testCase.valid
    && (!testCase.decision || result.computed_decision === testCase.decision)
    && (!testCase.includes || result.errors.some((error) => error.includes(testCase.includes)));
  if (!ok) { failures += 1; console.error(`FAIL ${testCase.name}\n${JSON.stringify(result, null, 2)}`); } else console.log(`PASS ${testCase.name}`);
}

for (const root of [[], null, "text"]) {
  const result = evaluateReadiness(root);
  if (result.valid) { failures += 1; console.error(`FAIL malformed root ${JSON.stringify(root)}`); } else console.log(`PASS malformed root ${JSON.stringify(root)}`);
}

// The command line rejects the unfilled Markdown template and accepts the shipped example.
const template = spawnSync(process.execPath, [evaluator, path.join(skillDir, "assets/output-template.md")], { encoding: "utf8" });
if (template.status !== 2) { failures += 1; console.error("FAIL unfilled template is not JSON and must be rejected"); } else console.log("PASS unfilled template rejected");
const shipped = spawnSync(process.execPath, [evaluator, path.join(skillDir, "examples/example-readiness.json")], { encoding: "utf8" });
if (shipped.status !== 0 || !shipped.stdout.includes('"computed_decision": "conditional_launch"')) { failures += 1; console.error(`FAIL shipped example via CLI\n${shipped.stdout}${shipped.stderr}`); } else console.log("PASS shipped example via CLI");

const total = cases.length + 5;
if (failures) { console.error(`FAIL ${failures}/${total}`); process.exit(1); }
console.log(`PASS ${total}/${total}`);
