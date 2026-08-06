import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid), []);
assert.ok(validate(valid.replace("Meta description", "وصف قصير")).some((error) => error.includes("Metadata")));
assert.ok(validate(`${valid}\nنضمن الظهور في الترتيب الأول`).some((error) => error.includes("SEO")));
console.log("optimize-product-seo validator tests passed");
