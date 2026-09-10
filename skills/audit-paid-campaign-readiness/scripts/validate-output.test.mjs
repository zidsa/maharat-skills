import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid), []);
assert.ok(validate(valid.replace("| القياس |", "| الرصد |")).some((e) => e.includes("القياس")));
assert.ok(validate(valid + "\nتم التفعيل").some((e) => e.includes("تنفيذ")));
console.log("audit-paid-campaign-readiness validator tests passed");
