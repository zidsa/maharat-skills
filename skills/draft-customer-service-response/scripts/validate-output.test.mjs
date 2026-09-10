import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid), []);
assert.ok(validate(valid + "\nتم رد المبلغ").some((e) => e.includes("تنفيذ")));
assert.ok(validate(valid.replace("جاهز للمراجعة", "جاهز")).some((e) => e.includes("الجاهزية")));
console.log("draft-customer-service-response validator tests passed");
