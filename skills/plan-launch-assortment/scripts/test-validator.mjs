import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const validator = path.join(root, "scripts", "validate-assortment.mjs");
const valid = JSON.parse(readFileSync(path.join(root, "examples", "example-assortment.json"), "utf8"));
const temp = mkdtempSync(path.join(os.tmpdir(), "launch-assortment-"));

function run(name, value, status) {
  const input = path.join(temp, `${name}.json`);
  writeFileSync(input, JSON.stringify(value));
  const result = spawnSync(process.execPath, [validator, input], { encoding: "utf8" });
  assert.equal(result.status, status, `${name}: ${result.stdout}${result.stderr}`);
}

run("valid", valid, 0);
run("invalid-decision", {
  ...valid,
  products: [{ ...valid.products[0], decision: "launch-everything" }],
}, 1);
run("missing-evidence", {
  ...valid,
  products: [{ ...valid.products[0], evidence: "" }],
}, 1);
run("fractional-variants", {
  ...valid,
  products: [{ ...valid.products[0], variants: { combinations: 1.5 } }],
}, 1);

console.log("✓ اختبارات تشكيلة الإطلاق نجحت.");
