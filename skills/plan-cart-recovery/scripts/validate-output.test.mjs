import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";
const valid=fs.readFileSync(new URL("../examples/example-output.md",import.meta.url),"utf8");
assert.deepEqual(validate(valid),[]);
assert.ok(validate(valid.replace(/موافقة/g,"إذن")).some((e)=>e.includes("موافقة")));
assert.ok(validate(`${valid}\nتم الإرسال إلى 0500000000`).some((e)=>e.includes("غير مسموح")));
console.log("plan-cart-recovery validator tests passed");
