#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const diagnosePath = join(here, "diagnose-journey.mjs");
const validatePath = join(here, "validate-result.mjs");
const temp = await mkdtemp(join(tmpdir(), "first-ten-"));

const base = {
  source: "mcp",
  observed_at: "2026-08-03T09:00:00+03:00",
  store: {
    published: true,
    products_count: 3,
    payment_enabled: true,
    shipping_enabled: true,
    checkout_test: "passed",
  },
  hero_product: { name: "منتج بطل", published: true, price: 120, stock: 20 },
  funnel: { product_views: 100, add_to_carts: 0, checkout_starts: 0 },
  merchant_assets: ["content"],
  tracking_ready: true,
  orders: [],
};

let orderSequence = 0;
function paidOrder(overrides = {}) {
  orderSequence += 1;
  return {
    id: `order-${orderSequence}`,
    is_test: false,
    is_fraud: false,
    status: "confirmed",
    refund_status: "none",
    payment_method: "card",
    payment_status: "paid",
    ...overrides,
  };
}

async function run(name, input, expected, expectFailure = false) {
  const inputPath = join(temp, `${name}.json`);
  await writeFile(inputPath, JSON.stringify(input));
  const execution = spawnSync(process.execPath, [diagnosePath, inputPath], { encoding: "utf8" });
  if (expectFailure) {
    assert.notEqual(execution.status, 0, `${name}: كان يجب أن يفشل`);
    const payload = JSON.parse(execution.stdout);
    assert.equal(payload.valid, false);
    return;
  }
  assert.equal(execution.status, 0, `${name}: ${execution.stderr || execution.stdout}`);
  const payload = JSON.parse(execution.stdout);
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(payload[key], value, `${name}: ${key}`);
  const resultPath = join(temp, `${name}-result.json`);
  await writeFile(resultPath, JSON.stringify(payload));
  const validation = spawnSync(process.execPath, [validatePath, resultPath], { encoding: "utf8" });
  assert.equal(validation.status, 0, `${name}: ${validation.stderr}`);
}

await run("view-no-cart", base, { status: "active", diagnosis: "view_to_cart" });
await run("no-traffic-owned", { ...base, funnel: { product_views: 0, add_to_carts: 0, checkout_starts: 0 }, merchant_assets: ["owned_audience"] }, { diagnosis: "owned" });
await run("cart-no-checkout", { ...base, funnel: { product_views: 120, add_to_carts: 9, checkout_starts: 0 } }, { diagnosis: "cart_to_checkout" });
await run("checkout-no-order", { ...base, funnel: { product_views: 120, add_to_carts: 9, checkout_starts: 4 } }, { diagnosis: "checkout_to_order", handoff: "test-order-payment-shipping" });

const sevenValid = Array.from({ length: 7 }, () => paidOrder());
await run("excluded-orders", {
  ...base,
  funnel: { product_views: 200, add_to_carts: 20, checkout_starts: 10 },
  orders: [
    ...sevenValid,
    paidOrder({ status: "cancelled" }),
    paidOrder({ is_test: true }),
    paidOrder({ refund_status: "full" }),
  ],
}, { verified_order_count: 7, excluded_order_count: 3 });

await run("complete", { ...base, orders: Array.from({ length: 10 }, () => paidOrder()) }, { status: "complete", handoff: "grow-store-to-hundred-orders" });
await run("no-product", { ...base, store: { ...base.store, products_count: 0 } }, { status: "blocked", diagnosis: "no_published_products" });
await run("paid-without-tracking", { ...base, funnel: { product_views: 0, add_to_carts: 0, checkout_starts: 0 }, merchant_assets: ["ad_budget"], tracking_ready: false }, { diagnosis: "paid_blocked", handoff: "audit-paid-campaign-readiness" });
await run("public-url-only", {
  ...base,
  source: "public_url",
  store: { ...base.store, payment_enabled: null, shipping_enabled: null, checkout_test: "not_assessed" },
  hero_product: { ...base.hero_product, stock: null },
  funnel: null,
}, { status: "blocked", diagnosis: "stock_unverified" });
await run("impossible-funnel", { ...base, funnel: { product_views: 10, add_to_carts: 20, checkout_starts: 0 } }, {}, true);
await run("reject-pii", { ...base, customer_name: "عميل" }, {}, true);

console.log("✓ نجحت 11 حالة لرحلة أول 10 طلبات.");
