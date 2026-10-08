#!/usr/bin/env node
// Runs from any directory: node scripts/test-diagnose.mjs

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { diagnose, decompose, splitProductChange } from "./diagnose.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.dirname(scriptDir);
const calculator = path.join(scriptDir, "diagnose.mjs");
const examplePath = path.join(skillDir, "examples/example-periods.json");
const example = JSON.parse(fs.readFileSync(examplePath, "utf8"));
const clone = () => structuredClone(example);

// Replace the stated contributions with what the calculator computes for the mutated data.
function restate(data) {
  const computed = diagnose(data, { computeOnly: true });
  data.diagnosis.contributions = computed.decomposition.contributions;
  return computed;
}

// Periods without traffic data: two-factor split, traffic and conversion marked unknown.
function withoutTraffic(data) {
  data.periods.previous.sessions = null;
  data.periods.current.sessions = null;
  data.data_sources.sessions = null;
  delete data.by_source;
  data.diagnosis.main_driver = "orders";
  data.diagnosis.drilldown = [{ driver: "orders", by: "product", key: "بن سيدامو 250غ" }];
  data.diagnosis.unknown = ["traffic", "conversion", "product_views"];
  data.diagnosis.missing_data.push("الزيارات لكل فترة من تحليلات زد أو GA4.");
  data.diagnosis.evidence = ["مبيعات بن سيدامو نزلت 11,200 ريال مع 6 أيام نفاد مقابل 0."];
  data.diagnosis.cause = "نفاد بن سيدامو 250غ ستة أيام من أربعة عشر خفّض عدد الطلبات.";
  restate(data);
}

// The blocked request: one week, 8 orders against 11.
function smallSample(data) {
  data.periods.previous = { start: "2026-09-14", end: "2026-09-20", sessions: null, orders: 11, sales: 2750, returns: null };
  data.periods.current = { start: "2026-09-21", end: "2026-09-27", sessions: null, orders: 8, sales: 1960, returns: null };
  data.data_sources.sessions = null;
  data.seasonality_note = "الأسبوع الحالي فيه اليوم الوطني ويوم الراتب، والسابق لا.";
  delete data.by_source;
  delete data.by_product;
  Object.assign(data.diagnosis, {
    status: "insufficient_sample",
    main_driver: null,
    cause_type: null,
    handoff: null,
    drilldown: [],
    cause: "لا يمكن تحديد سبب: 8 طلبات مقابل 11 فرق صغير قد يكون عشوائيًا.",
    unknown: ["traffic", "conversion", "returns"],
    missing_data: ["أربعة أسابيع على الأقل من الطلبات لكل فترة.", "الزيارات من تحليلات زد أو GA4."],
    next_step: "اجمع طلبات أربعة أسابيع مقابل أربعة أسابيع قبلها ثم أعد التشخيص.",
  });
  delete data.diagnosis.contributions;
}

const cases = [
  { name: "shipped example is valid with conversion as main driver", mutate: () => {}, valid: true, check: (r) => r.decomposition.main_driver === "conversion" && r.decomposition.reconciled },
  { name: "unequal periods are rejected", mutate: (d) => { d.periods.current.end = "2026-09-15"; }, valid: false, includes: "غير متساويتين" },
  { name: "overlapping periods are rejected", mutate: (d) => { d.periods.previous = { ...d.periods.previous, start: "2026-08-19", end: "2026-09-01" }; }, valid: false, includes: "متداخلتان" },
  { name: "a current period ending after as_of is rejected", mutate: (d) => { d.as_of = "2026-09-10"; }, valid: false, includes: "لم تكتمل" },
  { name: "stated contribution that differs from the calculator is rejected", mutate: (d) => { d.diagnosis.contributions.conversion = -7000; d.diagnosis.contributions.sessions = -4138.33; }, valid: false, includes: "لا تطابق المحسوبة" },
  { name: "contributions missing a factor do not reconcile", mutate: (d) => { delete d.diagnosis.contributions.returns; }, valid: false, includes: "لا يصالح" },
  { name: "main driver must be the largest contributor", mutate: (d) => { d.diagnosis.main_driver = "aov"; d.diagnosis.drilldown[0].driver = "aov"; d.diagnosis.cause_type = "product"; }, valid: false, includes: "ليس أكبر مساهم" },
  { name: "fewer than 30 orders cannot be diagnosed", mutate: (d) => { smallSample(d); d.diagnosis.status = "diagnosed"; d.diagnosis.main_driver = "orders"; d.diagnosis.contributions = diagnose(d, { computeOnly: true }).decomposition.contributions; }, valid: false, includes: "insufficient_sample" },
  { name: "small sample stated as insufficient is valid", mutate: smallSample, valid: true, check: (r) => r.sample.small_sample && r.warnings.some((w) => w.includes("عشوائيًا")) },
  { name: "no traffic data: orders x AOV split is valid", mutate: withoutTraffic, valid: true, check: (r) => r.decomposition.main_driver === "orders" && !("sessions" in r.decomposition.contributions) },
  { name: "no traffic data: conversion cannot be the driver", mutate: (d) => { withoutTraffic(d); d.diagnosis.main_driver = "conversion"; }, valid: false, includes: "بلا بيانات زيارات" },
  { name: "no traffic data must be marked unknown", mutate: (d) => { withoutTraffic(d); d.diagnosis.unknown = ["product_views"]; }, valid: false, includes: "traffic غير متاحة" },
  { name: "missing traffic written as zero is rejected", mutate: (d) => { d.periods.current.sessions = 0; }, valid: false, includes: "ليست صفرًا" },
  { name: "sessions cannot come from Zid MCP", mutate: (d) => { d.data_sources.sessions = "zid_mcp"; }, valid: false, includes: "لا يعرض الزيارات" },
  { name: "claiming a traffic drop without traffic data is rejected", mutate: (d) => { withoutTraffic(d); d.diagnosis.evidence.push("الزيارات انخفضت بعد تحديث الخوارزمية."); }, valid: false, includes: "الزيارات غير متاحة" },
  { name: "handoff outside the published list is rejected", mutate: (d) => { d.diagnosis.handoff = "analyze-product-performance"; }, valid: false, includes: "ليس من المهارات المنشورة" },
  { name: "stockout must hand off to inventory reorder", mutate: (d) => { d.diagnosis.handoff = "design-profitable-offer"; }, valid: false, includes: "plan-inventory-reorder" },
  { name: "stockout needs more out-of-stock days", mutate: (d) => { d.by_product[0].current.out_of_stock_days = 0; }, valid: false, includes: "أيام نفاد" },
  { name: "price cause needs a real price change", mutate: (d) => { d.diagnosis.cause_type = "price"; d.diagnosis.handoff = "design-profitable-offer"; }, valid: false, includes: "لم يتغير" },
  { name: "salary-day mismatch needs a seasonality note", mutate: (d) => { delete d.seasonality_note; }, valid: false, includes: "يوم صرف الرواتب" },
  {
    name: "Ramadan against a normal period needs a note",
    mutate: (d) => {
      d.periods.previous = { ...d.periods.previous, start: "2026-02-04", end: "2026-02-17" };
      d.periods.current = { ...d.periods.current, start: "2026-02-18", end: "2026-03-03" };
      delete d.seasonality_note;
    },
    valid: false,
    includes: "رمضان",
  },
  { name: "product breakdown must add up to total sales", mutate: (d) => { d.by_product.pop(); }, valid: false, includes: "باقي المنتجات" },
  { name: "drill-down must name the product with the largest effect", mutate: (d) => { d.diagnosis.drilldown[0].key = "أدوات التقطير"; }, valid: false, includes: "ليس المنتج الأكبر أثرًا" },
  { name: "more than two drill-downs are rejected", mutate: (d) => { d.diagnosis.drilldown.push({ driver: "sessions", by: "source", key: "Instagram" }, { driver: "aov", by: "product", key: "بن خولاني 250غ" }); }, valid: false, includes: "محركين على الأكثر" },
  { name: "invented benchmarks are rejected", mutate: (d) => { d.diagnosis.evidence.push("تحويلك أقل من متوسط السوق."); }, valid: false, includes: "متوسطات سوق" },
  { name: "claims of executed store changes are rejected", mutate: (d) => { d.diagnosis.next_step = "تم رفع ميزانية سناب لتعويض النزول في المبيعات."; }, valid: false, includes: "تحلل وتوصي فقط" },
  { name: "the algorithm is not a cause", mutate: (d) => { d.diagnosis.cause = "خوارزمية سناب غيّرت توزيع الإعلانات فنزلت المبيعات."; }, valid: false, includes: "الخوارزمية" },
  { name: "counter-evidence is required", mutate: (d) => { d.diagnosis.counter_evidence = []; }, valid: false, includes: "counter_evidence" },
  { name: "unfilled placeholders are rejected", mutate: (d) => { d.diagnosis.cause = "[السبب الأرجح في جملة واحدة]"; }, valid: false, includes: "لم يُملأ" },
  { name: "needs_data names no cause", mutate: (d) => { d.diagnosis.status = "needs_data"; }, valid: false, includes: "cause_type = null" },
];

let failures = 0;
let total = 0;
const report = (ok, name, detail) => {
  total += 1;
  if (ok) console.log(`PASS ${name}`);
  else { failures += 1; console.error(`FAIL ${name}${detail ? `\n${detail}` : ""}`); }
};

for (const testCase of cases) {
  const data = clone();
  testCase.mutate(data);
  const result = diagnose(JSON.parse(JSON.stringify(data)));
  const ok = result.valid === testCase.valid
    && (!testCase.includes || result.errors.some((e) => e.includes(testCase.includes)))
    && (!testCase.check || testCase.check(result));
  report(ok, testCase.name, ok ? "" : JSON.stringify({ valid: result.valid, errors: result.errors }, null, 2));
}

for (const root of [[], null, "text"]) report(!diagnose(root).valid, `malformed root ${JSON.stringify(root)}`);

// The split always reconciles, with and without traffic, for random periods.
let seed = 7;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
let reconciled = true;
for (let i = 0; i < 300; i += 1) {
  const period = (traffic) => {
    const orders = 30 + Math.floor(rand() * 900);
    return { sessions: traffic ? orders * (20 + Math.floor(rand() * 80)) : null, orders, sales: Math.round(orders * (80 + rand() * 400)), returns: Math.round(rand() * 3000) };
  };
  const traffic = i % 2 === 0;
  const dec = decompose(period(traffic), period(traffic));
  if (!dec.reconciled || Math.abs(dec.sum - dec.total_change) > 0.01) reconciled = false;
}
const parts = splitProductChange([2, 3, 5], [4, 1, 7]);
reconciled &&= Math.abs(parts.reduce((m, v) => m + v, 0) - (4 * 1 * 7 - 2 * 3 * 5)) < 1e-9;
report(reconciled, "contributions reconcile for 300 random period pairs");

// Command line behaviour.
const cli = (args) => spawnSync(process.execPath, [calculator, ...args], { encoding: "utf8" });
const shipped = cli([examplePath]);
report(shipped.status === 0 && JSON.parse(shipped.stdout).valid === true, "shipped example passes via CLI", shipped.stdout + shipped.stderr);
const template = cli([path.join(skillDir, "assets/output-template.md")]);
report(template.status === 2, "unfilled Markdown template is rejected as non-JSON", template.stdout + template.stderr);
const noDiagnosis = structuredClone(example);
delete noDiagnosis.diagnosis;
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "diagnose-")), "periods.json");
fs.writeFileSync(tmp, JSON.stringify(noDiagnosis));
const missing = cli([tmp]);
report(missing.status === 1 && missing.stdout.includes("diagnosis مفقود"), "periods without a diagnosis fail validation", missing.stdout);
const computeOnly = cli([tmp, "--compute-only"]);
report(computeOnly.status === 0 && JSON.parse(computeOnly.stdout).decomposition.main_driver === "conversion", "--compute-only returns the split", computeOnly.stdout + computeOnly.stderr);
report(cli([]).status === 2, "missing argument is a usage error");

if (failures) { console.error(`FAIL ${failures}/${total}`); process.exit(1); }
console.log(`PASS ${total}/${total}`);
