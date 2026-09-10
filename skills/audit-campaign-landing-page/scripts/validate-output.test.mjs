import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid), []);
assert.ok(validate(valid.replace(/CTA/g, "زر").replace(/الدعوة/g, "الزر").replace(/وجهة/g, "الرابط")).some((error) => error.includes("الوجهة")));
assert.ok(validate(`${valid}\nالدفع ناجح`).some((error) => error.includes("داخلي")));
console.log("audit-campaign-landing-page validator tests passed");
