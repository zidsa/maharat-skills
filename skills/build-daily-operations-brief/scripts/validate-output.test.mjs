import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid), []);
assert.ok(validate(valid.replace("3. صعّد", "3. صعّد").replace("## المراقبة", "4. أولوية رابعة\n\n## المراقبة")).some((e) => e.includes("1 إلى 3")));
assert.ok(validate(valid + "\nتم إنشاء طلب شراء").some((e) => e.includes("تنفيذ")));
console.log("build-daily-operations-brief validator tests passed");
