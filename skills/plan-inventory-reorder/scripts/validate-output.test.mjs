import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid, [{ sku: "A" }]), []);
assert.ok(validate(valid, [{ sku: "B" }]).some((e) => e.includes("B")));
assert.ok(validate(valid + "\nتم إنشاء طلب شراء").some((e) => e.includes("تنفيذ")));
console.log("plan-inventory-reorder validator tests passed");
