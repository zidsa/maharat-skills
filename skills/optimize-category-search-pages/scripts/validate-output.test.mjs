import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const dir = await mkdtemp(path.join(tmpdir(), "maharat-"));
const valid = path.join(dir, "valid.md");
const invalid = path.join(dir, "invalid.md");
await writeFile(valid, "## تشخيص الصفحة\nمحتوى موثق وقابل للمراجعة.\n\n## نية الباحث\nمحتوى موثق وقابل للمراجعة.\n\n## النسخة المقترحة\nمحتوى موثق وقابل للمراجعة.\n\n## الروابط والترتيب\nمحتوى موثق وقابل للمراجعة.\n\n## خطة القياس\nمحتوى موثق وقابل للمراجعة.");
await writeFile(invalid, "## تشخيص الصفحة\nناقص");
const script = new URL("./validate-output.mjs", import.meta.url);
const good = spawnSync(process.execPath, [fileURLToPath(script), valid]);
const bad = spawnSync(process.execPath, [fileURLToPath(script), invalid]);
await rm(dir, { recursive: true, force: true });
if (good.status !== 0 || bad.status === 0) process.exit(1);
console.log("✓ اختبارات أداة التحقق نجحت.");
