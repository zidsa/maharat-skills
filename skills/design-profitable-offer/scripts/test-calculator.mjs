#!/usr/bin/env node
// Runs from any directory: node scripts/test-calculator.mjs

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { calculateOffer } from "./calculate-offer.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.dirname(scriptDir);
const calculator = path.join(scriptDir, "calculate-offer.mjs");
const examplePath = path.join(skillDir, "examples/example-offer.json");
const example = JSON.parse(fs.readFileSync(examplePath, "utf8"));
const clone = () => structuredClone(example);
const offer = (data, id) => data.offers.find((item) => item.id === id);

// The travel-bag case from the old package: 249 SAR, cost 105, fees 6.
const bag = (registered, stated) => ({
  analysis_date: "2026-09-28",
  vat: { registered, prices_include_vat: true },
  stated_basis: registered ? "net_of_vat" : "not_registered",
  baseline: {
    unit_price: 249, units_per_order: 1, shipping_charged: 0,
    costs: { unit_cost: 105, shipping_cost: 0, packaging_cost: 0, payment_fee_pct: 0, payment_fee_fixed: 6 },
    stated_margin: stated,
  },
  history: { available: false },
  offers: [{ id: "pct10", type: "percent_discount", value: 10, stated_margin: registered ? 83.87 : 113.1, stated_break_even_uplift_pct: registered ? 25.82 : 22.02 }],
  test: {
    offer_id: "pct10", start_date: "2026-10-04", end_date: "2026-10-10",
    success_metric: "مجموع هامش الأسبوع مقارنة بأسبوع قبله", stop_condition: "أوقف إذا نزل هامش الأسبوع عن 90% من السابق",
    zid_setup: { tool: "Coupons", status: "draft_awaiting_approval", fields: { discount_type: "p", discount: 10 } },
  },
  pre_launch_checks: [{ id: "moc_discount_licence", status: "to_verify", note: "تحقق من اشتراط الترخيص قبل الإعلان" }],
  approvals_needed: ["اعتماد مسودة الكوبون"],
});

const cases = [
  { name: "shipped example passes", build: clone, valid: true, check: (r) => r.basis === "net_of_vat" && r.baseline.margin === 65.48 && r.test.days === 14 },
  { name: "VAT-registered bag: 138 is rejected", build: () => bag(true, 138), valid: false, includes: "المحسوب 105.52" },
  { name: "VAT-registered bag: 105.52 passes", build: () => bag(true, 105.52), valid: true, check: (r) => r.offers[0].margin === 83.87 },
  { name: "unregistered bag: 138 is correct", build: () => bag(false, 138), valid: true, check: (r) => r.basis === "not_registered" },
  { name: "VAT-exclusive prices keep the price as revenue", build: () => { const d = bag(true, 138); d.vat.prices_include_vat = false; d.stated_basis = "vat_exclusive_prices"; d.offers[0].stated_margin = 113.1; d.offers[0].stated_break_even_uplift_pct = 22.02; return d; }, valid: true },
  { name: "stated basis must match the VAT answers", build: () => { const d = clone(); d.stated_basis = "not_registered"; return d; }, valid: false, includes: "stated_basis" },
  { name: "unknown VAT registration blocks the verdict", build: () => { const d = clone(); delete d.vat.registered; return d; }, valid: false, status: "blocked_missing_costs", includes: "vat.registered" },
  { name: "empty cost is missing, not zero", build: () => { const d = clone(); d.baseline.costs.shipping_cost = ""; return d; }, valid: false, status: "blocked_missing_costs", includes: "مفقود: baseline.costs.shipping_cost" },
  { name: "absent cost is missing, not zero", build: () => { const d = clone(); delete d.baseline.costs.unit_cost; return d; }, valid: false, status: "blocked_missing_costs", includes: "مفقود: baseline.costs.unit_cost" },
  { name: "null cost is missing, not zero", build: () => { const d = clone(); d.baseline.costs.payment_fee_pct = null; return d; }, valid: false, status: "blocked_missing_costs", includes: "payment_fee_pct" },
  { name: "offer margin off by more than 0.01 fails", build: () => { const d = clone(); offer(d, "pct10").stated_margin = 53.78; return d; }, valid: false, includes: "offers.pct10.stated_margin" },
  { name: "break-even uplift is recomputed", build: () => { const d = clone(); offer(d, "pct10").stated_break_even_uplift_pct = 11.1; return d; }, valid: false, includes: "stated_break_even_uplift_pct" },
  { name: "free shipping keeps the cost of the extra bag (old 108 error)", build: () => { const d = clone(); offer(d, "fs200").stated_margin = 102.86; return d; }, valid: false, includes: "المحسوب 78.86" },
  { name: "threshold basket below the threshold fails", build: () => { const d = clone(); offer(d, "fs200").units_per_order = 2; return d; }, valid: false, includes: "لا تبلغ الحد" },
  { name: "upgrade share is recomputed", build: () => { const d = clone(); offer(d, "fs200").stated_upgrade_share_pct = 40; return d; }, valid: false, includes: "stated_upgrade_share_pct" },
  { name: "test without an end date fails", build: () => { const d = clone(); delete d.test.end_date; return d; }, valid: false, includes: "test.end_date" },
  { name: "test without a stop condition fails", build: () => { const d = clone(); d.test.stop_condition = " "; return d; }, valid: false, includes: "stop_condition" },
  { name: "test without a success metric fails", build: () => { const d = clone(); delete d.test.success_metric; return d; }, valid: false, includes: "success_metric" },
  { name: "test longer than 28 days fails", build: () => { const d = clone(); d.test.end_date = "2026-11-30"; return d; }, valid: false, includes: "مدة الاختبار" },
  { name: "discount without the licence check fails", build: () => { const d = clone(); d.pre_launch_checks = []; return d; }, valid: false, includes: "moc_discount_licence" },
  { name: "free shipping alone needs no licence check", build: () => { const d = clone(); d.offers = d.offers.filter((o) => o.id === "fs200"); d.pre_launch_checks = []; return d; }, valid: true, check: (r) => r.discount_licence_check === "not_needed" },
  { name: "chosen offer below the margin floor fails", build: () => { const d = clone(); d.test.offer_id = "pct10"; return d; }, valid: false, includes: "تحت الحد الأدنى" },
  { name: "Zid setup must stay a draft", build: () => { const d = clone(); d.test.zid_setup.status = "created"; return d; }, valid: false, includes: "draft_awaiting_approval" },
  { name: "no forecasts without order history", build: () => { const d = clone(); d.history = { available: false }; d.test.expected_uplift_pct = 30; return d; }, valid: false, includes: "لا توقعات بلا سجل" },
  { name: "approvals are required", build: () => { const d = clone(); d.approvals_needed = []; return d; }, valid: false, includes: "approvals_needed" },
  { name: "placeholder values are rejected", build: () => { const d = clone(); d.test.success_metric = "…"; return d; }, valid: false, includes: "القالب غير معبأ" },
];

let failures = 0;
const report = (ok, name, detail) => {
  if (ok) console.log(`PASS ${name}`);
  else { failures += 1; console.error(`FAIL ${name}\n${detail ?? ""}`); }
};

for (const testCase of cases) {
  const result = calculateOffer(JSON.parse(JSON.stringify(testCase.build())));
  const ok = result.valid === testCase.valid
    && (!testCase.status || result.status === testCase.status)
    && (!testCase.includes || result.errors.some((error) => error.includes(testCase.includes)))
    && (!testCase.check || testCase.check(result));
  report(ok, testCase.name, JSON.stringify(result, null, 2));
}

for (const root of [[], null, "text"]) {
  report(!calculateOffer(root).valid, `malformed root ${JSON.stringify(root)}`);
}

// Command line: shipped example exits 0, unfilled template and non-JSON exit 2, a bad file exits 1.
const run = (file) => spawnSync(process.execPath, [calculator, file], { encoding: "utf8", cwd: "/" });
const shipped = run(examplePath);
report(shipped.status === 0 && shipped.stdout.includes('"valid": true'), "shipped example via CLI", shipped.stdout + shipped.stderr);
const template = run(path.join(skillDir, "assets/output-template.md"));
report(template.status === 2, "unfilled template rejected via CLI", template.stdout + template.stderr);
const tmpBad = path.join(fs.mkdtempSync(path.join((await import("node:os")).tmpdir(), "offer-")), "bad.json");
fs.writeFileSync(tmpBad, JSON.stringify(bag(true, 138)));
const bad = run(tmpBad);
report(bad.status === 1, "wrong VAT margin exits 1 via CLI", bad.stdout + bad.stderr);

const total = cases.length + 6;
if (failures) { console.error(`FAIL ${failures}/${total}`); process.exit(1); }
console.log(`PASS ${total}/${total}`);
