import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid), []);
assert.ok(validate(valid.replace("## القياس والتحقق", "## القياس")).some((error) => error.includes("قسم مفقود")));
assert.ok(validate(`${valid}\nنضمن الترتيب الأول`).some((error) => error.includes("SEO")));
console.log("bulk-product-seo validator tests passed");
