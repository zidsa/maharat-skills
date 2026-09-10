import assert from "node:assert/strict";
import { validate } from "./validate-output.mjs";
import fs from "node:fs";

const valid = fs.readFileSync(new URL("../examples/example-output.md", import.meta.url), "utf8");
assert.deepEqual(validate(valid, [{ id: "O-101" }, { id: "O-102" }, { id: "O-103" }]), []);
assert.ok(validate(valid.replaceAll("O-103", "X-103"), [{ id: "O-103" }]).some((e) => e.includes("O-103")));
assert.ok(validate(valid + "\nتم إرسال الرسالة").some((e) => e.includes("تنفيذ")));
console.log("triage-open-orders validator tests passed");
