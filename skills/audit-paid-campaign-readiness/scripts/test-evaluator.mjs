#!/usr/bin/env node
// Runs from any directory: node scripts/test-evaluator.mjs

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { evaluateCampaign } from "./evaluate-campaign.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.dirname(scriptDir);
const evaluator = path.join(scriptDir, "evaluate-campaign.mjs");
const examplePath = path.join(skillDir, "examples/example-campaign.json");
const example = JSON.parse(fs.readFileSync(examplePath, "utf8"));
const clone = () => structuredClone(example);
const check = (data, id) => data.checks.find((item) => item.id === id);
const pass = (detail, source = "public_url") => ({
  status: "passed",
  note: undefined,
  fix: undefined,
  evidence: { source, detail, checked_at: "2026-09-28T10:58:00+03:00" },
});
// The example after its three critical fixes: a test purchase #20931 reached Snap and Zid, and the page shows the discount.
const fixed = (data) => {
  data.test_order_id = "20931";
  Object.assign(check(data, "landing.message_match"), pass("أعلى صفحة الطقم يظهر «خصم 15% حتى 10 أكتوبر» كما في الإعلان"));
  Object.assign(check(data, "measurement.purchase_event_verified"), pass("طلب الاختبار 20931 ظهر حدث شراء في أداة أحداث سناب بقيمة 169 ريالًا", "ads_platform"));
  Object.assign(check(data, "measurement.zid_order_visible"), pass("طلب الاختبار 20931 ظاهر في طلبات زد بقيمة 169 ريالًا ثم استُرد", "zid_dashboard"));
};

const cases = [
  { name: "shipped example is fix_first", mutate: () => {}, valid: true, decision: "fix_first" },
  {
    name: "all critical checks passed is run, with the non-critical gap still listed",
    mutate: (data) => { fixed(data); data.decision = "run"; },
    valid: true,
    decision: "run",
    fixOrder: ["landing.policies_visible"],
  },
  {
    name: "run stated while a critical check is not tested is rejected",
    mutate: (data) => { data.decision = "run"; },
    valid: false,
    includes: "لا يطابق القرار المحسوب «fix_first»",
  },
  {
    name: "run stated while every critical check failed is rejected",
    mutate: (data) => {
      for (const item of data.checks) if (item.id !== "offer.defined" && item.id !== "ad.policy_claims" && item.id !== "ad.influencer_licence" && item.status === "passed" && !["ad.creative_specs", "ops.support_ready"].includes(item.id)) {
        Object.assign(item, { status: "failed", evidence: undefined, fix: { summary: "إصلاح مطلوب قبل التشغيل", owner: "صاحب المتجر" } });
      }
      data.decision = "run";
    },
    valid: false,
    includes: "لا يطابق القرار المحسوب «fix_first»",
  },
  {
    name: "a failed kill check (unlicensed influencer) means dont_run",
    mutate: (data) => {
      fixed(data);
      Object.assign(check(data, "ad.influencer_licence"), { status: "failed", evidence: undefined, fix: { summary: "اختيار صانع محتوى مرخص أو إعلان بلا صانع محتوى", owner: "صاحب المتجر" } });
      data.decision = "dont_run";
    },
    valid: true,
    decision: "dont_run",
    fixOrder: ["ad.influencer_licence", "landing.policies_visible"],
  },
  {
    name: "zero margin per order means dont_run",
    mutate: (data) => { fixed(data); data.budget.margin_per_order_sar = 0; data.decision = "dont_run"; },
    valid: true,
    decision: "dont_run",
  },
  {
    name: "a stop CPA above the order margin is rejected",
    mutate: (data) => { data.stop_rule.max_cpa_sar = 90; },
    valid: false,
    includes: "أعلى من ربح الطلب",
  },
  {
    name: "a missing stop rule is rejected",
    mutate: (data) => { delete data.stop_rule; },
    valid: false,
    includes: "stop_rule.max_cpa_sar مطلوب",
  },
  {
    name: "a missing daily budget cap is rejected",
    mutate: (data) => { delete data.budget.daily_cap_sar; },
    valid: false,
    includes: "budget.daily_cap_sar مطلوب",
  },
  {
    name: "a passed check needs evidence",
    mutate: (data) => { delete check(data, "landing.price_matches").evidence; },
    valid: false,
    includes: "evidence.source",
  },
  {
    name: "a pixel cannot be proved by the merchant's word",
    mutate: (data) => { fixed(data); check(data, "measurement.purchase_event_verified").evidence.source = "merchant"; data.decision = "run"; },
    valid: false,
    includes: "لا يثبت بمصدر merchant",
  },
  {
    name: "a passed purchase event needs the test order id",
    mutate: (data) => { fixed(data); data.test_order_id = null; data.decision = "run"; },
    valid: false,
    includes: "test_order_id",
  },
  {
    name: "purchase event evidence must name the same test order",
    mutate: (data) => { fixed(data); check(data, "measurement.purchase_event_verified").evidence.detail = "ظهر حدث شراء في أداة أحداث سناب أمس"; data.decision = "run"; },
    valid: false,
    includes: "لا يذكر طلب الاختبار 20931",
  },
  {
    name: "evidence older than 7 days is rejected",
    mutate: (data) => { check(data, "landing.loads_right_page").evidence.checked_at = "2026-09-15T10:00:00+03:00"; },
    valid: false,
    includes: "أقدم من 7 أيام",
  },
  {
    name: "evidence after the decision is rejected",
    mutate: (data) => { check(data, "stock.covers_campaign").evidence.checked_at = "2026-09-29T09:00:00+03:00"; },
    valid: false,
    includes: "بعد وقت القرار",
  },
  {
    name: "stock below expected orders cannot pass",
    mutate: (data) => { data.campaign.stock_units = 20; },
    valid: false,
    includes: "أقل من الطلبات المتوقعة",
  },
  {
    name: "a discount offer cannot skip the discount licence check",
    mutate: (data) => { Object.assign(check(data, "offer.discount_licence"), { status: "not_applicable", evidence: undefined }); },
    valid: false,
    includes: "لا يكون not_applicable",
  },
  {
    name: "a non-discount offer marks the licence check not applicable",
    mutate: (data) => { data.campaign.offer.type = "free_shipping"; },
    valid: false,
    includes: "شرطه غير متحقق",
  },
  {
    name: "an offer that ends before the campaign starts is rejected",
    mutate: (data) => { data.campaign.offer.ends_at = "2026-09-30T23:59:00+03:00"; },
    valid: false,
    includes: "ينتهي قبل بدء الحملة",
  },
  {
    name: "Snapchat, TikTok, Meta and Google are the accepted channels",
    mutate: (data) => { data.campaign.channel = "billboard"; },
    valid: false,
    includes: "campaign.channel",
  },
  {
    name: "a non-critical gap needs an owner and a due date",
    mutate: (data) => { delete check(data, "landing.policies_visible").fix.due_at; },
    valid: false,
    includes: "fix.due_at",
  },
  {
    name: "every listed check is required",
    mutate: (data) => { data.checks = data.checks.filter((item) => item.id !== "landing.mobile_rtl"); },
    valid: false,
    includes: "landing.mobile_rtl مفقود",
  },
  {
    name: "unknown and duplicate checks are rejected",
    mutate: (data) => { data.checks.push({ id: "ad.looks_great", status: "passed" }, structuredClone(check(data, "offer.defined"))); },
    valid: false,
    includes: "معرّف غير معروف",
  },
  {
    name: "placeholder text is rejected",
    mutate: (data) => { check(data, "offer.defined").evidence.detail = "…"; },
    valid: false,
    includes: "نصًا نموذجيًا",
  },
];

let failures = 0;
for (const testCase of cases) {
  const data = clone();
  testCase.mutate(data);
  const result = evaluateCampaign(JSON.parse(JSON.stringify(data)));
  const ok = result.valid === testCase.valid
    && (!testCase.decision || result.computed_decision === testCase.decision)
    && (!testCase.fixOrder || JSON.stringify(result.fix_order) === JSON.stringify(testCase.fixOrder))
    && (!testCase.includes || result.errors.some((error) => error.includes(testCase.includes)));
  if (!ok) { failures += 1; console.error(`FAIL ${testCase.name}\n${JSON.stringify(result, null, 2)}`); } else console.log(`PASS ${testCase.name}`);
}

for (const root of [[], null, "text"]) {
  const result = evaluateCampaign(root);
  if (result.valid) { failures += 1; console.error(`FAIL malformed root ${JSON.stringify(root)}`); } else console.log(`PASS malformed root ${JSON.stringify(root)}`);
}

// Command line: the shipped example passes; the unfilled Markdown template and a stated/computed mismatch fail.
const shipped = spawnSync(process.execPath, [evaluator, examplePath], { encoding: "utf8" });
if (shipped.status !== 0 || !shipped.stdout.includes('"computed_decision": "fix_first"')) { failures += 1; console.error(`FAIL shipped example via CLI\n${shipped.stdout}${shipped.stderr}`); } else console.log("PASS shipped example via CLI");
const template = spawnSync(process.execPath, [evaluator, path.join(skillDir, "assets/output-template.md")], { encoding: "utf8" });
if (template.status !== 2) { failures += 1; console.error("FAIL unfilled template is not JSON and must be rejected"); } else console.log("PASS unfilled template rejected");
const mismatch = clone();
mismatch.decision = "run";
const piped = spawnSync(process.execPath, [evaluator, "-"], { input: JSON.stringify(mismatch), encoding: "utf8" });
if (piped.status !== 1) { failures += 1; console.error("FAIL mismatched decision via stdin must exit 1"); } else console.log("PASS mismatched decision via stdin exits 1");

const total = cases.length + 6;
if (failures) { console.error(`FAIL ${failures}/${total}`); process.exit(1); }
console.log(`PASS ${total}/${total}`);
