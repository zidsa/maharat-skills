import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid), []);
assert.ok(validate(valid.replace(/المقام/g, "العدد").replace(/البسط/g, "النتيجة")).some((error) => error.includes("مقام")));
assert.ok(validate(`${valid}\nهذا هو المعيار العالمي`).some((error) => error.includes("معيار")));
console.log("review-social-content-performance validator tests passed");
