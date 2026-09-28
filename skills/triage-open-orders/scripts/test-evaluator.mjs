#!/usr/bin/env node
// Runs from any directory: node scripts/test-evaluator.mjs

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { evaluateOrders, primaryCategory } from "./evaluate-orders.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.dirname(scriptDir);
const evaluator = path.join(scriptDir, "evaluate-orders.mjs");
const examplePath = path.join(skillDir, "examples/example-orders.json");
const example = JSON.parse(fs.readFileSync(examplePath, "utf8"));
const clone = () => structuredClone(example);
const planOrder = (data, id) => data.plan.orders.find((item) => item.order_id === id);
const order = (data, id) => data.orders.find((item) => item.id === id);
const AS_OF = Date.parse("2026-09-28T09:00:00+03:00");

// A small store: five open orders, only one stuck.
function smallStore() {
  const base = { payment_method: "mada", payment_status: "paid", cod_confirmed: null, is_potential_fraud: false, stock: "ok", promise_source: "zid_estimated_delivery", tracking_status: null, customer_request: null };
  const orders = [
    { ...base, id: "7001", created_at: "2026-09-27T10:00:00+03:00", order_status: "new", promised_by: "2026-10-01T23:59:00+03:00" },
    { ...base, id: "7002", created_at: "2026-09-27T11:00:00+03:00", order_status: "preparing", promised_by: "2026-10-01T23:59:00+03:00" },
    { ...base, id: "7003", created_at: "2026-09-26T12:00:00+03:00", order_status: "indelivery", promised_by: "2026-09-29T23:59:00+03:00" },
    { ...base, id: "7004", created_at: "2026-09-27T15:00:00+03:00", order_status: "ready", promised_by: "2026-10-01T23:59:00+03:00" },
    { ...base, id: "7005", created_at: "2026-09-27T16:00:00+03:00", order_status: "ready", payment_method: "bank_transfer", payment_status: "pending", promised_by: "2026-10-01T23:59:00+03:00" },
  ];
  return {
    store: { name: "متجر صغير", handling_hours: null },
    as_of: "2026-09-28T09:00:00+03:00",
    source: "paste",
    orders,
    plan: {
      orders: orders.map((item) => ({ order_id: item.id, category: item.id === "7005" ? "payment_shipping_risk" : "normal", missing: [] })),
      top_actions: [{
        rank: 1, category: "payment_shipping_risk", order_ids: ["7005"],
        action: "أوقف شحن الطلب حتى تتأكد من الحوالة", owner: "صاحب المتجر",
        deadline: "2026-09-28T11:00:00+03:00", safe_step: "طابق المبلغ في كشف الحساب قبل تسليمه للناقل",
        why: "الطلب جاهز ودفعه معلّق، وخروجه يعرّض البضاعة والمبلغ للخسارة", handoff: null,
      }],
      drafts: [],
      not_done: "المساعد لم يغيّر أي طلب ولم يرسل أي رسالة.",
    },
  };
}

// A large store: 200 open orders, three stuck in different categories.
function largeStore() {
  const orders = [];
  for (let i = 1; i <= 200; i += 1) {
    orders.push({ id: String(80000 + i), created_at: "2026-09-27T12:00:00+03:00", order_status: "indelivery", payment_method: "mada", payment_status: "paid", cod_confirmed: null, is_potential_fraud: false, stock: "ok", promised_by: "2026-09-30T23:59:00+03:00", promise_source: "zid_estimated_delivery", tracking_status: "in_transit", customer_request: null });
  }
  Object.assign(orders[10], { promised_by: "2026-09-27T23:59:00+03:00" }); // 80011 promise_missed
  Object.assign(orders[50], { order_status: "preparing", stock: "short" }); // 80051 stock_short
  Object.assign(orders[120], { order_status: "new", payment_method: "cod", payment_status: "pending", cod_confirmed: false }); // 80121 payment_hold
  const category = { 80011: "promise_missed", 80051: "stock_short", 80121: "payment_hold" };
  const action = (rank, cat, id, handoff) => ({ rank, category: cat, order_ids: [id], action: "إجراء واضح لهذا الطلب", owner: "المستودع", deadline: "2026-09-28T15:00:00+03:00", safe_step: "خطوة آمنة من لوحة زد دون تغيير الحالة", why: "أعلى طلب عالق متبقٍ في ترتيب الأولوية", handoff });
  return {
    store: { name: "متجر كبير", handling_hours: 72 },
    as_of: "2026-09-28T09:00:00+03:00",
    source: "zid_mcp",
    orders,
    plan: {
      orders: orders.map((item) => ({ order_id: item.id, category: category[item.id] ?? "normal", missing: [] })),
      top_actions: [action(1, "promise_missed", "80011", "detect-shipping-delay"), action(2, "stock_short", "80051", "plan-inventory-reorder"), action(3, "payment_hold", "80121", null)],
      drafts: [{ order_ids: ["80011"], purpose: "اعتذار عن التأخير", text: "مرحبًا، بخصوص طلبك رقم 80011: نعتذر عن التأخير ونتابع الشحنة الآن.", status: "draft_needs_approval" }],
      not_done: "المساعد لم يغيّر أي طلب ولم يرسل أي رسالة.",
    },
  };
}

const cases = [
  { name: "shipped example passes as-is", build: clone, valid: true },
  { name: "open order left unclassified", build: () => { const d = clone(); d.plan.orders = d.plan.orders.filter((o) => o.order_id !== "61540111"); return d; }, valid: false, includes: "61540111 غير مصنف" },
  { name: "closed order in the open table", build: () => { const d = clone(); d.plan.orders.push({ order_id: "61540090", category: "normal", missing: [] }); return d; }, valid: false, includes: "طلب مغلق" },
  { name: "stuck order classified as normal", build: () => { const d = clone(); planOrder(d, "61540103").category = "normal"; return d; }, valid: false, includes: "لا يطابق المحسوب «payment_shipping_risk»" },
  { name: "missing field must be named, not guessed", build: () => { const d = clone(); planOrder(d, "61540112").missing = []; return d; }, valid: false, includes: "promised_by" },
  { name: "a healthy paid order is not a priority", build: () => { const d = clone(); d.plan.top_actions[0].order_ids = ["61540113"]; return d; }, valid: false, includes: "61540113 ليس عالقًا" },
  { name: "top actions out of priority order", build: () => { const d = clone(); const [a, b] = d.plan.top_actions; d.plan.top_actions[0] = { ...b, rank: 1 }; d.plan.top_actions[1] = { ...a, rank: 2 }; return d; }, valid: false, includes: "يجب أن يبدأ بالطلب 61540102" },
  { name: "grouping across categories rejected", build: () => { const d = clone(); d.plan.top_actions[2].order_ids.push("61540107"); return d; }, valid: false, includes: "لا يُجمع 61540107" },
  { name: "fewer than 3 actions while stuck orders remain", build: () => { const d = clone(); d.plan.top_actions.pop(); return d; }, valid: false, includes: "المطلوب 3 إجراءات" },
  { name: "more than 3 actions rejected", build: () => { const d = clone(); d.plan.top_actions.push({ ...d.plan.top_actions[2], rank: 4, order_ids: ["61540107"] }); return d; }, valid: false, includes: "ثلاثة إجراءات كحد أقصى" },
  { name: "action needs an owner", build: () => { const d = clone(); d.plan.top_actions[1].owner = ""; return d; }, valid: false, includes: "owner مطلوب" },
  { name: "action deadline must be within 24 hours", build: () => { const d = clone(); d.plan.top_actions[0].deadline = "2026-09-30T11:00:00+03:00"; return d; }, valid: false, includes: "خلال 24 ساعة" },
  { name: "action deadline needs an offset", build: () => { const d = clone(); d.plan.top_actions[0].deadline = "2026-09-28 11:00"; return d; }, valid: false, includes: "deadline يحتاج وقتًا بإزاحة" },
  { name: "action needs a safe step", build: () => { const d = clone(); delete d.plan.top_actions[2].safe_step; return d; }, valid: false, includes: "safe_step مطلوب" },
  { name: "action needs a reason for its rank", build: () => { const d = clone(); d.plan.top_actions[0].why = ""; return d; }, valid: false, includes: "why مطلوب" },
  { name: "claiming a message was sent is rejected", build: () => { const d = clone(); d.plan.not_done = "تم الإرسال للعميلين المتأخرين."; return d; }, valid: false, includes: "يدّعي تنفيذ" },
  { name: "claiming a cancellation or refund is rejected", build: () => { const d = clone(); d.plan.top_actions[1].action = "تم إلغاء الطلب وتم الاسترداد"; return d; }, valid: false, includes: "يدّعي تنفيذ" },
  { name: "negated claims are allowed", build: () => { const d = clone(); d.plan.not_done = "لم يتم الإرسال ولم يتم الإلغاء ولم يتم الاسترداد لأي طلب."; return d; }, valid: true },
  { name: "Saudi mobile number rejected", build: () => { const d = clone(); d.plan.drafts[0].text += " للتواصل: 0551234567"; return d; }, valid: false, includes: "رقم جوال" },
  { name: "international phone format rejected", build: () => { const d = clone(); d.plan.top_actions[0].safe_step += " اتصل على +966 55 123 4567"; return d; }, valid: false, includes: "رقم جوال" },
  { name: "email rejected", build: () => { const d = clone(); d.plan.drafts[1].text += " أو راسلنا على customer1@example.com"; return d; }, valid: false, includes: "بريدًا إلكترونيًا" },
  { name: "customer data keys rejected in orders", build: () => { const d = clone(); order(d, "61540103").customer = { id: 1441 }; return d; }, valid: false, includes: "حقل بيانات عميل" },
  { name: "handoff to an unpublished skill rejected", build: () => { const d = clone(); d.plan.top_actions[2].handoff = "check-order-stock-levels"; return d; }, valid: false, includes: "ليست مهارة منشورة" },
  { name: "mentioning a missing skill rejected", build: () => { const d = clone(); d.plan.top_actions[0].safe_step += " ثم شغّل track-daily-order-queue"; return d; }, valid: false, includes: "مهارة غير منشورة" },
  { name: "late order needs a customer draft", build: () => { const d = clone(); d.plan.drafts = d.plan.drafts.filter((x) => !x.order_ids.includes("61540102")); return d; }, valid: false, includes: "61540102 (promise_missed) يحتاج مسودة" },
  { name: "draft marked as sent rejected", build: () => { const d = clone(); d.plan.drafts[0].status = "sent"; return d; }, valid: false, includes: "draft_needs_approval" },
  { name: "unknown Zid status code rejected", build: () => { const d = clone(); order(d, "61540111").order_status = "shipped"; return d; }, valid: false, includes: "ليس من رموز زد" },
  { name: "missing payment status becomes needs_data", build: () => { const d = clone(); order(d, "61540113").payment_status = null; return d; }, valid: false, includes: "«normal» لا يطابق المحسوب «needs_data»" },
  { name: "small store: 5 orders, 1 stuck, 1 action", build: smallStore, valid: true },
  { name: "no stuck orders means no actions", build: () => { const d = smallStore(); d.orders[4].payment_status = "paid"; d.plan.orders[4].category = "normal"; d.plan.top_actions = []; return d; }, valid: true },
  { name: "an action with nothing stuck is rejected", build: () => { const d = smallStore(); d.orders[4].payment_status = "paid"; d.plan.orders[4].category = "normal"; return d; }, valid: false, includes: "لا يوجد طلب عالق" },
  { name: "large store: 200 orders", build: largeStore, valid: true },
  { name: "large store: stock before payment hold", build: () => { const d = largeStore(); const [a, b, c] = d.plan.top_actions; d.plan.top_actions = [a, { ...c, rank: 2 }, { ...b, rank: 3 }]; return d; }, valid: false, includes: "يجب أن يبدأ بالطلب 80051" },
];

let failures = 0;
let total = 0;
const report = (ok, name, detail = "") => {
  total += 1;
  if (ok) console.log(`PASS ${name}`);
  else { failures += 1; console.error(`FAIL ${name}\n${detail}`); }
};

for (const testCase of cases) {
  const result = evaluateOrders(JSON.parse(JSON.stringify(testCase.build())));
  const ok = result.valid === testCase.valid && (!testCase.includes || result.errors.some((error) => error.includes(testCase.includes)));
  report(ok, testCase.name, JSON.stringify(result.errors, null, 2));
}

for (const root of [[], null, "text"]) {
  report(!evaluateOrders(root).valid, `malformed root ${JSON.stringify(root)}`);
}

// Classification rules checked directly.
const cod = { id: "x", created_at: "2026-09-27T12:00:00+03:00", payment_method: "cod", payment_status: "pending", stock: "ok", promised_by: "2026-10-01T23:59:00+03:00" };
report(primaryCategory({ ...cod, order_status: "ready", cod_confirmed: true }, AS_OF, null) === "normal", "confirmed COD is not a payment risk");
report(primaryCategory({ ...cod, order_status: "ready", cod_confirmed: false }, AS_OF, null) === "payment_shipping_risk", "unconfirmed COD ready to ship is a payment risk");
const queue = evaluateOrders(clone()).priority_queue.map((entry) => entry.order_id);
report(queue.indexOf("61540107") < queue.indexOf("61540106") && queue.indexOf("61540104") < queue.indexOf("61540105"), "tie-break: earlier promise, then older order", queue.join(", "));

// Command line: shipped example, two-file mode, unfilled template, non-JSON.
const run = (...args) => spawnSync(process.execPath, [evaluator, ...args], { encoding: "utf8", cwd: os.tmpdir() });
const shipped = run(examplePath);
report(shipped.status === 0 && shipped.stdout.includes('"valid": true'), "shipped example via CLI", shipped.stdout + shipped.stderr);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "triage-open-orders-"));
const { plan, ...snapshot } = clone();
fs.writeFileSync(path.join(temp, "orders.json"), JSON.stringify(snapshot));
fs.writeFileSync(path.join(temp, "plan.json"), JSON.stringify({ plan }));
const twoFiles = run(path.join(temp, "orders.json"), path.join(temp, "plan.json"));
report(twoFiles.status === 0, "orders and plan as two files via CLI", twoFiles.stdout + twoFiles.stderr);
const ordersOnly = run(path.join(temp, "orders.json"));
report(ordersOnly.status === 1 && ordersOnly.stdout.includes("plan مفقود"), "orders without a plan fail", ordersOnly.stdout);

const template = run(path.join(skillDir, "assets/output-template.md"));
report(template.status === 2, "unfilled output template rejected", template.stdout + template.stderr);
fs.writeFileSync(path.join(temp, "notes.txt"), "الطلب 61540102 متأخر");
const plainText = run(path.join(temp, "notes.txt"));
report(plainText.status === 2, "non-JSON input rejected", plainText.stdout + plainText.stderr);
fs.rmSync(temp, { recursive: true, force: true });

if (failures) { console.error(`FAIL ${failures}/${total}`); process.exit(1); }
console.log(`PASS ${total}/${total}`);
