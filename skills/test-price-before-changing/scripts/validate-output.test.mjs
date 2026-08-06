import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid), []);
assert.ok(validate(valid.replace("## تجربة محدودة قبل التعميم", "## تجربة")).some((error) => error.includes("قسم مفقود")));
assert.ok(validate(`${valid}\nتم تعديل السعر`).some((error) => error.includes("تنفيذ")));
console.log("test-price-before-changing validator tests passed");
