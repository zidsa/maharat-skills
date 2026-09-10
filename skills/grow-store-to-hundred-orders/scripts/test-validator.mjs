import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const diagnostic = path.join(root, "scripts", "diagnose-growth-funnel.mjs");
const valid = JSON.parse(readFileSync(path.join(root, "examples", "example-funnel.json"), "utf8"));
const temp = mkdtempSync(path.join(os.tmpdir(), "growth-funnel-"));

function run(name, value, status) {
  const input = path.join(temp, `${name}.json`);
  writeFileSync(input, JSON.stringify(value));
  const result = spawnSync(process.execPath, [diagnostic, input], { encoding: "utf8" });
  assert.equal(result.status, status, `${name}: ${result.stdout}${result.stderr}`);
  return result;
}

const result = JSON.parse(run("valid", valid, 0).stdout);
assert.equal(result.largest_negative_rate_change.from, "add_to_carts");
assert.equal(result.largest_negative_rate_change.to, "checkout_starts");
assert.ok(Math.abs(result.largest_negative_rate_change.rate_change + 0.2222222222) < 1e-8);

run("impossible-funnel", {
  ...valid,
  current: { ...valid.current, purchases: 200 },
}, 1);
run("missing-stage", {
  ...valid,
  previous: { sessions: 1000 },
}, 1);

console.log("✓ اختبارات تشخيص قمع النمو نجحت.");
