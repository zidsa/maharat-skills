import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid), []);
assert.ok(validate(valid.replace("9:16", "رأسي")).some((error) => error.includes("9:16")));
assert.ok(validate(valid.replace("ما لم يُنفذ", "التنفيذ")).some((error) => error.includes("قسم مفقود")));
assert.ok(validate(`${valid}\nالمنتج الأفضل ومضمون`).some((error) => error.includes("ادعاء")));
console.log("prepare-tiktok-shoot validator tests passed");
