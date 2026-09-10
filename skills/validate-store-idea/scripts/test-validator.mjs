import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const validator = path.join(root, "scripts", "validate-evidence.mjs");
const valid = JSON.parse(readFileSync(path.join(root, "examples", "example-evidence.json"), "utf8"));
const temp = mkdtempSync(path.join(os.tmpdir(), "validate-store-idea-"));

function run(name, value, status) {
  const input = path.join(temp, `${name}.json`);
  writeFileSync(input, JSON.stringify(value));
  const result = spawnSync(process.execPath, [validator, input], { encoding: "utf8" });
  assert.equal(result.status, status, `${name}: ${result.stdout}${result.stderr}`);
}

run("valid", valid, 0);
run("invalid-decision", { ...valid, decision: "launch" }, 1);
run("missing-counterevidence", { ...valid, counterevidence: [] }, 1);
run("incomplete-evidence", { ...valid, evidence: [{ type: "interview" }] }, 1);

console.log("✓ اختبارات سجل أدلة فكرة المتجر نجحت.");
