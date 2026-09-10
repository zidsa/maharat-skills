import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid), []);
assert.ok(validate(valid.replaceAll("الحارس", "قيد")).some((e) => e.includes("الحارس")));
assert.ok(validate(valid + "\nتم صرف الميزانية").some((e) => e.includes("تنفيذ")));
console.log("build-marketing-campaign-brief validator tests passed");
