#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../", import.meta.url));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "launch-gate-install-"));
let passed = 0;
try {
  const installed = path.join(temporary, ".agents/skills/pass-store-launch-gate");
  fs.cpSync(source, installed, { recursive: true });
  assert.deepEqual(fs.readdirSync(path.dirname(installed)), ["pass-store-launch-gate"]);
  const validator = path.join(installed, "scripts/evaluate-launch-gates.mjs");
  const check = (name, input, valid, root) => {
    const args = [validator, input, ...(root ? [root] : [])];
    const result = spawnSync(process.execPath, args, { cwd: temporary, encoding: "utf8" });
    assert.equal(result.error, undefined, name);
    assert.equal(result.status, valid ? 0 : 1, `${name}: ${result.stdout}${result.stderr}`);
    assert.equal(JSON.parse(result.stdout).valid, valid, name);
    passed++;
    console.log(`PASS ${name}`);
  };
  const bundledInput = path.join(installed, "examples/example-gates.json");
  check("single-skill installation with no sibling packages", bundledInput, true);

  const evidence = path.join(temporary, "merchant-evidence");
  fs.cpSync(path.join(installed, "examples"), evidence, { recursive: true });
  const input = path.join(evidence, "example-gates.json");
  check("merchant evidence outside skill installation", input, true);
  const separateInput = path.join(temporary, "decision.json");
  fs.copyFileSync(input, separateInput);
  check("explicit evidence root for a separate decision file", separateInput, true, evidence);

  const script = path.join(installed, "scripts/validators/validate-compliance-audit.mjs");
  fs.renameSync(script, `${script}.disabled`);
  check("missing bundled validator fails closed", input, false);
  fs.renameSync(`${script}.disabled`, script);

  const artifact = path.join(evidence, "artifacts/audit-commerce-compliance/example-audit.json");
  const original = fs.readFileSync(artifact);
  fs.appendFileSync(artifact, "\n");
  check("changed artifact bytes invalidate bound reports and approvals", input, false);
  fs.writeFileSync(artifact, original);

  const outside = path.join(temporary, "outside-evidence.json");
  fs.renameSync(artifact, outside);
  fs.symlinkSync(outside, artifact);
  check("artifact symlink outside evidence root is rejected", input, false);
  fs.unlinkSync(artifact);
  fs.renameSync(outside, artifact);

  const rawEvidence = path.join(evidence, "artifacts/define-launch-measurement/evidence/events.json");
  const rawOriginal = fs.readFileSync(rawEvidence);
  const event = JSON.parse(rawOriginal);
  event["run-42"].transaction_id = "WRONG-ORDER";
  fs.writeFileSync(rawEvidence, JSON.stringify(event));
  check("changed raw measurement evidence fails the nested validator", input, false);
  fs.writeFileSync(rawEvidence, rawOriginal);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
console.log(`PASS ${passed}/${passed} portable package checks`);
