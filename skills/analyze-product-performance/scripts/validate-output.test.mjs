import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";
const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid), []);
assert.ok(validate(valid.replace(/المقام/g, "العدد").replace(/البسط/g, "النتيجة")).some((e) => e.includes("المقاييس")));
assert.ok(validate(`${valid}\nتم طلب المخزون`).some((e) => e.includes("تنفيذ")));
console.log("analyze-product-performance validator tests passed");
