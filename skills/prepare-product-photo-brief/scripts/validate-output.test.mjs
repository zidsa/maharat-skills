import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid), []);
assert.ok(validate(valid.replace("## النص البديل", "## وصف الصور")).some((error) => error.includes("قسم مفقود")));
assert.ok(validate(`${valid}\nغيّر اللون ليكون أجمل`).some((error) => error.includes("تغيير")));
console.log("prepare-product-photo-brief validator tests passed");
