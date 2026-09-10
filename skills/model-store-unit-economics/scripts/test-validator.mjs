import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const calculator = path.join(root, "scripts", "calculate-unit-economics.mjs");
const valid = JSON.parse(readFileSync(path.join(root, "examples", "example-input.json"), "utf8"));
const unattributed = JSON.parse(readFileSync(path.join(root, "examples", "example-input-unattributed.json"), "utf8"));
const temp = mkdtempSync(path.join(os.tmpdir(), "unit-economics-"));

function run(name, value, status) {
  const input = path.join(temp, `${name}.json`);
  writeFileSync(input, JSON.stringify(value));
  const result = spawnSync(process.execPath, [calculator, input], { encoding: "utf8" });
  assert.equal(result.status, status, `${name}: ${result.stdout}${result.stderr}`);
  return result;
}

const result = JSON.parse(run("valid", valid, 0).stdout);
assert.equal(result.actual_cac_per_attributed_order, 40);
assert.equal(result.contribution_before_acquisition_per_order, 54.33);
assert.equal(result.contribution_after_acquisition_total, 1146);

const noAttribution = JSON.parse(run("unattributed", unattributed, 0).stdout);
assert.equal(noAttribution.actual_cac_per_attributed_order, null);
assert.match(noAttribution.warnings.join(" "), /تعذر حساب CAC/);

run("attributed-over-orders", { ...valid, attributed_paid_orders: 81 }, 1);
run("invalid-tax-flag", { ...valid, tax_included_in_gross_revenue: "yes" }, 1);

console.log("✓ اختبارات اقتصاديات الطلب نجحت.");
