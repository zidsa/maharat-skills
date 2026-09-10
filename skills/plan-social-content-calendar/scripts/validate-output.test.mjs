import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid), []);
assert.ok(validate(valid.replace("3/3", "ممتلئ").replace("2/2", "ممتلئ").replace("5/5", "ممتلئ")).some((e) => e.includes("حمل العمل")));
assert.ok(validate(valid + "\nتم النشر").some((e) => e.includes("تنفيذ")));
console.log("plan-social-content-calendar validator tests passed");
