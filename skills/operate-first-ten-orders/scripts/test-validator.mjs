import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const builder = path.join(root, "scripts", "build-order-exception-queue.mjs");
const valid = JSON.parse(readFileSync(path.join(root, "examples", "example-orders.json"), "utf8"));
const temp = mkdtempSync(path.join(os.tmpdir(), "first-ten-orders-"));

function run(name, value, status) {
  const input = path.join(temp, `${name}.json`);
  writeFileSync(input, JSON.stringify(value));
  const result = spawnSync(process.execPath, [builder, input], { encoding: "utf8" });
  assert.equal(result.status, status, `${name}: ${result.stdout}${result.stderr}`);
  return result;
}

const result = JSON.parse(run("valid", valid, 0).stdout);
assert.deepEqual(result.normal_order_ids, ["A-1"]);
assert.deepEqual(result.exception_queue.map((entry) => entry.order_id), ["A-3", "A-4", "A-2"]);
assert.equal(new Set(result.exception_queue.map((entry) => entry.action_key)).size, 3);

run("pii-field", {
  ...valid,
  orders: [{ ...valid.orders[0], phone: "0500000000" }],
}, 1);
run("missing-status", {
  ...valid,
  orders: [{ id: "B-1", payment_status: "paid" }],
}, 1);

console.log("✓ اختبارات طابور أول الطلبات نجحت.");
