import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid), []);
assert.ok(validate(valid.replace("## قرارات المطابقة", "## قرار")).some((error) => error.includes("قسم مفقود")));
assert.ok(validate(`${valid}\nتم التفعيل`).some((error) => error.includes("تنفيذ")));
console.log("fix-store-search-results validator tests passed");
