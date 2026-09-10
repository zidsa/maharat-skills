import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const diagnostic = path.join(root, "scripts", "compare-store-periods.mjs");
const valid = JSON.parse(readFileSync(path.join(root, "examples", "example-periods.json"), "utf8"));
const temp = mkdtempSync(path.join(os.tmpdir(), "store-performance-"));

function run(name, value, status) {
  const input = path.join(temp, `${name}.json`);
  writeFileSync(input, JSON.stringify(value));
  const result = spawnSync(process.execPath, [diagnostic, input], { encoding: "utf8" });
  assert.equal(result.status, status, `${name}: ${result.stdout}${result.stderr}`);
  return result;
}

const result = JSON.parse(run("valid", valid, 0).stdout);
assert.equal(result.current.contribution, 6380);
assert.equal(result.previous.contribution, 6500);
assert.equal(result.revenue_bridge.reconciled, true);
assert.ok(Math.abs(result.revenue_bridge.sum - 2200) < 0.01);

run("currency-mismatch", {
  ...valid,
  current: { ...valid.current, currency: "USD" },
}, 1);
run("immature-refunds", {
  ...valid,
  current: { ...valid.current, measurement_end: "2026-07-10" },
}, 1);
run("impossible-orders", {
  ...valid,
  current: { ...valid.current, sessions: 0, orders: 80 },
}, 1);

console.log("✓ اختبارات تشخيص أداء المتجر نجحت.");
