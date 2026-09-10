import assert from "node:assert/strict"; import fs from "node:fs"; import {validate} from "./validate-output.mjs";
const valid=fs.readFileSync(new URL("../examples/example-output.md",import.meta.url),"utf8"); assert.deepEqual(validate(valid),[]);
assert.ok(validate(valid.replace(/الوحدات المسلمة/g,"الطلبات").replace(/المقام/g,"العدد")).some(e=>e.includes("مقام")));
assert.ok(validate(`${valid}\nالعميل مخطئ`).some(e=>e.includes("غير مسموح")));
console.log("reduce-returns-exchanges validator tests passed");
