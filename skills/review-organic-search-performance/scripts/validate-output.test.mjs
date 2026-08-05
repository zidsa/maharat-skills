import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const dir = await mkdtemp(path.join(tmpdir(), "maharat-"));
const valid = path.join(dir, "valid.md");
const invalid = path.join(dir, "invalid.md");
await writeFile(valid, "## ملخص الأداء\nمحتوى موثق وقابل للمراجعة.\n\n## أكبر التغيرات\nمحتوى موثق وقابل للمراجعة.\n\n## التشخيص\nمحتوى موثق وقابل للمراجعة.\n\n## الإجراءات\nمحتوى موثق وقابل للمراجعة.\n\n## خطة القياس\nمحتوى موثق وقابل للمراجعة.");
await writeFile(invalid, "## ملخص الأداء\nناقص");
const script = new URL("./validate-output.mjs", import.meta.url);
const good = spawnSync(process.execPath, [script.pathname, valid]);
const bad = spawnSync(process.execPath, [script.pathname, invalid]);
await rm(dir, { recursive: true, force: true });
if (good.status !== 0 || bad.status === 0) process.exit(1);
console.log("✓ اختبارات أداة التحقق نجحت.");

