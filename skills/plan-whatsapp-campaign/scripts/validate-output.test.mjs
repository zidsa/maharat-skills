import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid), []);
assert.ok(validate(valid.replace(/opt-in/g, "إذن").replace(/موافقة/g, "إذن")).some((error) => error.includes("الموافقة")));
assert.ok(validate(`${valid}\nجوال العميل 0500000000`).some((error) => error.includes("شخصية")));
assert.ok(validate(`${valid}\nتم الإرسال`).some((error) => error.includes("إرسال")));
console.log("plan-whatsapp-campaign validator tests passed");
