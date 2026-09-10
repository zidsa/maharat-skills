import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const skillRoot = path.resolve(import.meta.dirname, "..");
const validator = path.join(skillRoot, "scripts", "validate-output.mjs");
const request = path.join(skillRoot, "examples", "example-request.md");
const validOutput = await readFile(path.join(skillRoot, "examples", "example-output.md"), "utf8");
const temp = await mkdtemp(path.join(os.tmpdir(), "summer-skill-test-"));

async function runCase(name, content, expectedStatus) {
  const output = path.join(temp, `${name}.md`);
  await writeFile(output, content);
  const result = spawnSync(process.execPath, [validator, output, request], { encoding: "utf8" });
  assert.equal(result.status, expectedStatus, `${name}: ${result.stdout}${result.stderr}`);
}

await runCase("valid", validOutput, 0);
await runCase("extra-channel", validOutput.replace("### واتساب", "### سناب\n\nمخرج غير مختار.\n\n### واتساب"), 1);
await runCase("missing-channel", validOutput.replace(/### واتساب[\s\S]*?(?=\n## خطة القياس)/, ""), 1);
await runCase("extra-offer", validOutput.replace("**ملاحظات التنفيذ**", "كاش باك بقيمة 50 ريال.\n\n**ملاحظات التنفيذ**"), 1);
await runCase("wrong-discount", validOutput.replaceAll("15٪", "20٪"), 1);

console.log("✓ اختبارات فاحص حملة الصيف نجحت.");
