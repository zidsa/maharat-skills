import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "./validate-output.mjs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid, [{ id: "S-11" }, { id: "S-12" }]), []);
assert.ok(validate(valid, [{ id: "S-99" }]).some((e) => e.includes("S-99")));
assert.ok(validate(valid + "\nتم التعويض").some((e) => e.includes("تنفيذ")));
console.log("detect-shipping-delay validator tests passed");
