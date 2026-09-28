#!/usr/bin/env node
// Checks a triage plan against the open-orders snapshot it was written from.
// It recomputes each order's category and the top-3 order from the facts,
// then compares them with what the plan claims.
//
// Usage:
//   node scripts/evaluate-orders.mjs <triage.json|->              (one file: orders + plan)
//   node scripts/evaluate-orders.mjs <orders.json> <plan.json>    (two files)

import fs from "node:fs";
import { pathToFileURL } from "node:url";

// Single priority order. Lower rank = handled first. See references/triage-method.md.
export const CATEGORIES = [
  { id: "promise_missed", rank: 1 },
  { id: "payment_shipping_risk", rank: 2 },
  { id: "stock_short", rank: 3 },
  { id: "promise_at_risk", rank: 4 },
  { id: "customer_waiting", rank: 5 },
  { id: "payment_hold", rank: 6 },
  { id: "needs_data", rank: 7 },
];
const RANK = new Map(CATEGORIES.map((c) => [c.id, c.rank]));
const ALL_CATEGORIES = new Set([...RANK.keys(), "normal"]);

export const OPEN_STATUSES = new Set(["new", "preparing", "ready", "indelivery"]);
const CLOSED_STATUSES = new Set(["delivered", "cancelled", "canceled", "reversed", "partially_reversed", "reverse_in_progress"]);
const PRE_SHIP = new Set(["new", "preparing", "ready"]);
const STOCK_VALUES = new Set(["ok", "short", "unknown"]);
const REQUEST_TYPES = new Set(["status_inquiry", "cancel_request", "change_request", "complaint", "other"]);
const SOURCES = new Set(["zid_mcp", "export", "paste"]);
export const HANDOFFS = new Set(["detect-shipping-delay", "draft-customer-service-response", "plan-inventory-reorder", "reduce-returns-exchanges"]);
const DRAFT_REQUIRED = new Set(["promise_missed", "customer_waiting"]);
// Any skill-like slug (three or more lowercase words joined by "-") must be a published handoff or this skill.
const SLUG = /(?<![A-Za-z0-9-])[a-z]+(?:-[a-z]+){2,}(?![A-Za-z0-9-])/g;
const KNOWN_SLUGS = new Set([...HANDOFFS, "triage-open-orders"]);
const FORBIDDEN_KEYS = new Set([
  "customer", "customer_name", "customer_email", "customer_mobile", "customer_phone", "name_of_customer",
  "mobile", "phone", "email", "address", "street", "district", "short_address", "national_address",
  "consignee_name", "consignee_mobile", "consignee_address_1", "consignee_address_2", "lat", "lng",
]);
const PHONE = /(?<![\d])(?:\+?966|00966|0)[\s-]?5\d(?:[\s-]?\d){7}(?![\d])/;
const INTL_PHONE = /\+\d{1,3}[\s-]?\d(?:[\s-]?\d){7,}/;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
// "تم الإلغاء / تم الاسترداد / تم الإرسال ..." are claims of execution; "لم يتم ..." is allowed.
const DONE_CLAIM = /(?<!لم ي)(?<!لا ي)تم\s+(?:ال)?(?:إلغاء|الغاء|استرداد|استرجاع المبلغ|رد المبلغ|إرسال|ارسال|تغيير حالة|تحديث حالة)/;
const OFFSET_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?([+-]\d{2}:\d{2}|Z)$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const text = (value, min = 1) => typeof value === "string" && value.trim().length >= min;
const time = (value) => (typeof value === "string" && OFFSET_TIME.test(value) ? Date.parse(value) : Number.NaN);
const isNull = (value) => value === null || value === undefined;

function isOpen(order) {
  return isNull(order.order_status) || OPEN_STATUSES.has(order.order_status);
}

// Facts the plan must admit are missing for this order.
export function missingFields(order) {
  const missing = [];
  const status = order.order_status;
  const preShip = isNull(status) || PRE_SHIP.has(status);
  if (isNull(status)) missing.push("order_status");
  if (isNull(order.payment_method)) missing.push("payment_method");
  if (order.payment_method !== "cod" && isNull(order.payment_status)) missing.push("payment_status");
  if (order.payment_method === "cod" && isNull(order.cod_confirmed) && preShip) missing.push("cod_confirmed");
  if (isNull(order.promised_by)) missing.push("promised_by");
  if ((isNull(order.stock) || order.stock === "unknown") && preShip) missing.push("stock");
  return missing;
}

// Every condition that applies; the primary category is the one with the lowest rank.
export function conditions(order, asOf, handlingHours) {
  const found = [];
  const status = order.order_status;
  const preShip = PRE_SHIP.has(status);
  const promised = isNull(order.promised_by) ? Number.NaN : time(order.promised_by);
  const created = time(order.created_at);
  const cod = order.payment_method === "cod";
  const unpaid = !cod && !isNull(order.payment_status) && order.payment_status !== "paid";
  const codUnconfirmed = cod && order.cod_confirmed === false;
  const fraud = order.is_potential_fraud === true;

  if (!isNull(status) && !Number.isNaN(promised) && promised < asOf) found.push("promise_missed");
  if ((status === "ready" || status === "indelivery") && (unpaid || fraud || (codUnconfirmed && status === "ready"))) found.push("payment_shipping_risk");
  if (preShip && order.stock === "short") found.push("stock_short");
  if (preShip) {
    const promiseSoon = !Number.isNaN(promised) && promised >= asOf && promised - asOf <= DAY_MS;
    const handlingOver = typeof handlingHours === "number" && !Number.isNaN(created) && asOf - created > handlingHours * HOUR_MS;
    if (promiseSoon || handlingOver) found.push("promise_at_risk");
  }
  if (order.customer_request && order.customer_request.answered !== true) found.push("customer_waiting");
  if ((status === "new" || status === "preparing") && (unpaid || fraud || codUnconfirmed)) found.push("payment_hold");
  if (isNull(status) || isNull(order.payment_method) || (!cod && isNull(order.payment_status))) found.push("needs_data");
  return found;
}

export function primaryCategory(order, asOf, handlingHours) {
  const found = conditions(order, asOf, handlingHours);
  if (!found.length) return "normal";
  return found.sort((a, b) => RANK.get(a) - RANK.get(b))[0];
}

function sortKey(entry) {
  const promised = isNull(entry.order.promised_by) ? Number.POSITIVE_INFINITY : time(entry.order.promised_by);
  return [RANK.get(entry.category), Number.isNaN(promised) ? Number.POSITIVE_INFINITY : promised, time(entry.order.created_at)];
}

// Stuck orders in the documented order: category rank, then earliest promise, then oldest order, then id.
export function rankStuck(entries) {
  return entries
    .filter((entry) => entry.category !== "normal")
    .sort((a, b) => {
      const ka = sortKey(a);
      const kb = sortKey(b);
      for (let i = 0; i < ka.length; i += 1) if (ka[i] !== kb[i]) return ka[i] - kb[i];
      return String(a.order.id).localeCompare(String(b.order.id), "en", { numeric: true });
    });
}

function walk(value, path, visit) {
  if (Array.isArray(value)) value.forEach((item, index) => walk(item, `${path}[${index}]`, visit));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      visit({ key, path: `${path}.${key}`, value: child });
      walk(child, `${path}.${key}`, visit);
    }
  } else visit({ key: null, path, value });
}

function checkContent(data, errors) {
  walk(data, "$", ({ key, path, value }) => {
    if (key && FORBIDDEN_KEYS.has(key.toLowerCase())) errors.push(`${path}: حقل بيانات عميل غير مسموح؛ استخدم رقم الطلب فقط`);
    if (typeof value !== "string") return;
    if (PHONE.test(value) || INTL_PHONE.test(value)) errors.push(`${path}: يحتوي رقم جوال أو هاتف`);
    if (EMAIL.test(value)) errors.push(`${path}: يحتوي بريدًا إلكترونيًا`);
    if (DONE_CLAIM.test(value)) errors.push(`${path}: يدّعي تنفيذ إجراء (إلغاء أو استرداد أو إرسال أو تغيير حالة)؛ المهارة لا تنفذ شيئًا`);
    for (const slug of value.match(SLUG) ?? []) if (!KNOWN_SLUGS.has(slug)) errors.push(`${path}: يشير إلى مهارة غير منشورة ${slug}`);
  });
}

function checkOrders(data, asOf, errors) {
  const orders = Array.isArray(data.orders) ? data.orders : [];
  if (!Array.isArray(data.orders) || !orders.length) errors.push("orders يجب أن تكون قائمة غير فارغة");
  const seen = new Set();
  for (const [index, order] of orders.entries()) {
    const label = order?.id ? `orders.${order.id}` : `orders[${index}]`;
    if (!order || typeof order !== "object" || !text(String(order.id ?? ""))) { errors.push(`${label}: يحتاج id`); continue; }
    if (seen.has(String(order.id))) errors.push(`${label}: رقم طلب مكرر`);
    seen.add(String(order.id));
    if (!isNull(order.order_status) && !OPEN_STATUSES.has(order.order_status) && !CLOSED_STATUSES.has(order.order_status)) {
      errors.push(`${label}.order_status «${order.order_status}» ليس من رموز زد (new, preparing, ready, indelivery, delivered, cancelled, reversed…)`);
    }
    if (Number.isNaN(time(order.created_at))) errors.push(`${label}.created_at يحتاج وقتًا بإزاحة مثل +03:00`);
    else if (!Number.isNaN(asOf) && time(order.created_at) > asOf) errors.push(`${label}.created_at بعد وقت الفرز`);
    if (!isNull(order.promised_by) && Number.isNaN(time(order.promised_by))) errors.push(`${label}.promised_by يحتاج وقتًا بإزاحة أو null`);
    if (!isNull(order.promised_by) && !text(order.promise_source)) errors.push(`${label}.promise_source مطلوب عند وجود promised_by`);
    if (!isNull(order.stock) && !STOCK_VALUES.has(order.stock)) errors.push(`${label}.stock يجب أن تكون ok أو short أو unknown`);
    if (!isNull(order.cod_confirmed) && typeof order.cod_confirmed !== "boolean") errors.push(`${label}.cod_confirmed يجب أن يكون true أو false أو null`);
    if (!isNull(order.is_potential_fraud) && typeof order.is_potential_fraud !== "boolean") errors.push(`${label}.is_potential_fraud يجب أن يكون true أو false أو null`);
    const request = order.customer_request;
    if (!isNull(request)) {
      if (!REQUEST_TYPES.has(request?.type)) errors.push(`${label}.customer_request.type غير صالح`);
      if (Number.isNaN(time(request?.since))) errors.push(`${label}.customer_request.since يحتاج وقتًا بإزاحة`);
    }
  }
  return orders.filter((order) => order && typeof order === "object" && order.id !== undefined);
}

export function evaluateOrders(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, errors: ["الجذر يجب أن يكون كائن JSON فيه as_of وorders وplan"] };
  }

  const asOf = time(data.as_of);
  if (Number.isNaN(asOf)) errors.push("as_of يجب أن يكون وقتًا بإزاحة مثل 2026-09-28T09:00:00+03:00");
  if (!SOURCES.has(data.source)) errors.push("source يجب أن يكون zid_mcp أو export أو paste");
  const handling = data.store?.handling_hours;
  if (!isNull(handling) && (typeof handling !== "number" || handling <= 0)) errors.push("store.handling_hours يجب أن يكون رقمًا موجبًا أو null");

  checkContent(data, errors);
  const orders = checkOrders(data, asOf, errors);
  const plan = data.plan;
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    errors.push("plan مفقود");
    return { valid: false, errors };
  }
  if (Number.isNaN(asOf)) return { valid: false, errors };

  const open = orders.filter(isOpen);
  const entries = open.map((order) => ({ order, category: primaryCategory(order, asOf, handling ?? null) }));
  const byId = new Map(entries.map((entry) => [String(entry.order.id), entry]));
  const closedIds = new Set(orders.filter((order) => !isOpen(order)).map((order) => String(order.id)));

  // 1. Every open order is classified once, with the computed category and its missing fields.
  const planOrders = Array.isArray(plan.orders) ? plan.orders : [];
  if (!Array.isArray(plan.orders)) errors.push("plan.orders يجب أن تكون قائمة بكل طلب مفتوح");
  const classified = new Set();
  for (const item of planOrders) {
    const id = String(item?.order_id ?? "");
    const label = `plan.orders.${id || "?"}`;
    if (closedIds.has(id)) { errors.push(`${label}: طلب مغلق لا يدخل جدول الطلبات المفتوحة`); continue; }
    const entry = byId.get(id);
    if (!entry) { errors.push(`${label}: رقم طلب غير موجود في البيانات`); continue; }
    if (classified.has(id)) { errors.push(`${label}: الطلب مصنف أكثر من مرة`); continue; }
    classified.add(id);
    if (!ALL_CATEGORIES.has(item.category)) errors.push(`${label}.category غير معروف`);
    else if (item.category !== entry.category) errors.push(`${label}: التصنيف «${item.category}» لا يطابق المحسوب «${entry.category}»`);
    const declared = new Set(Array.isArray(item.missing) ? item.missing : []);
    for (const field of missingFields(entry.order)) {
      if (!declared.has(field)) errors.push(`${label}.missing يجب أن يذكر الحقل الناقص ${field} بدل التخمين`);
    }
  }
  for (const entry of entries) {
    if (!classified.has(String(entry.order.id))) errors.push(`plan.orders: الطلب المفتوح ${entry.order.id} غير مصنف`);
  }

  // 2. Top actions follow the single priority order.
  const ranked = rankStuck(entries);
  const actions = Array.isArray(plan.top_actions) ? plan.top_actions : [];
  if (!Array.isArray(plan.top_actions)) errors.push("plan.top_actions يجب أن تكون قائمة");
  if (actions.length > 3) errors.push("plan.top_actions: ثلاثة إجراءات كحد أقصى");
  const covered = new Set();
  const expectedLeads = [];
  for (const [index, action] of actions.slice(0, 3).entries()) {
    const label = `plan.top_actions[${index}]`;
    const lead = ranked.find((entry) => !covered.has(String(entry.order.id)));
    if (action?.rank !== index + 1) errors.push(`${label}.rank يجب أن يكون ${index + 1}`);
    for (const field of ["action", "owner", "safe_step", "why"]) {
      if (!text(action?.[field], field === "owner" ? 2 : 8)) errors.push(`${label}.${field} مطلوب`);
    }
    const deadline = time(action?.deadline);
    if (Number.isNaN(deadline)) errors.push(`${label}.deadline يحتاج وقتًا بإزاحة`);
    else if (deadline <= asOf || deadline - asOf > DAY_MS) errors.push(`${label}.deadline يجب أن يكون بعد وقت الفرز وخلال 24 ساعة`);
    if (!isNull(action?.handoff) && !HANDOFFS.has(action.handoff)) errors.push(`${label}.handoff «${action.handoff}» ليست مهارة منشورة`);
    const ids = Array.isArray(action?.order_ids) ? action.order_ids.map(String) : [];
    if (!ids.length) { errors.push(`${label}.order_ids مطلوبة`); continue; }
    if (!lead) { errors.push(`${label}: لا يوجد طلب عالق متبقٍ يبرر هذا الإجراء`); continue; }
    expectedLeads.push(String(lead.order.id));
    if (!ids.includes(String(lead.order.id))) {
      errors.push(`${label}: يجب أن يبدأ بالطلب ${lead.order.id} (${lead.category}) حسب ترتيب الأولوية`);
    }
    if (action.category !== lead.category) errors.push(`${label}.category يجب أن يكون ${lead.category}`);
    for (const id of ids) {
      const entry = byId.get(id);
      if (!entry || entry.category === "normal") errors.push(`${label}: الطلب ${id} ليس عالقًا`);
      else if (covered.has(id)) errors.push(`${label}: الطلب ${id} مكرر في إجراء سابق`);
      else if (entry.category !== lead.category) errors.push(`${label}: لا يُجمع ${id} (${entry.category}) مع فئة ${lead.category}`);
      covered.add(id);
    }
  }
  const remaining = ranked.filter((entry) => !covered.has(String(entry.order.id)));
  if (actions.length < 3 && remaining.length) {
    errors.push(`plan.top_actions: المطلوب 3 إجراءات ما دامت هناك طلبات عالقة؛ التالي ${remaining[0].order.id}`);
  }

  // 3. Drafts: required where the customer is harmed or waiting; never sent.
  const drafts = Array.isArray(plan.drafts) ? plan.drafts : [];
  if (!isNull(plan.drafts) && !Array.isArray(plan.drafts)) errors.push("plan.drafts يجب أن تكون قائمة");
  const drafted = new Set();
  for (const [index, draft] of drafts.entries()) {
    const label = `plan.drafts[${index}]`;
    if (draft?.status !== "draft_needs_approval") errors.push(`${label}.status يجب أن يكون draft_needs_approval؛ لا يُرسل شيء`);
    if (!text(draft?.text, 20)) errors.push(`${label}.text مطلوب`);
    for (const id of Array.isArray(draft?.order_ids) ? draft.order_ids.map(String) : []) {
      if (!byId.has(id)) errors.push(`${label}: الطلب ${id} ليس طلبًا مفتوحًا`);
      drafted.add(id);
    }
  }
  for (const id of covered) {
    const entry = byId.get(id);
    if (entry && DRAFT_REQUIRED.has(entry.category) && !drafted.has(id)) errors.push(`plan.drafts: الطلب ${id} (${entry.category}) يحتاج مسودة رسالة للعميل`);
  }

  if (!text(plan.not_done, 10)) errors.push("plan.not_done مطلوب: اذكر أن المساعد لم يغيّر حالة أو يلغِ أو يسترد أو يرسل");

  const counts = {};
  for (const entry of entries) counts[entry.category] = (counts[entry.category] ?? 0) + 1;
  return {
    valid: errors.length === 0,
    as_of: data.as_of,
    open_orders: entries.length,
    stuck_orders: ranked.length,
    categories: counts,
    priority_queue: ranked.map((entry) => ({ order_id: String(entry.order.id), category: entry.category })),
    expected_action_leads: expectedLeads,
    errors,
  };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file === "-" ? 0 : file, "utf8"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [first, second] = process.argv.slice(2);
  if (!first) {
    console.error("الاستخدام: node scripts/evaluate-orders.mjs <triage.json|-> أو <orders.json> <plan.json>");
    process.exit(2);
  }
  let data;
  try {
    data = readJson(first);
    if (second) {
      const planFile = readJson(second);
      data = { ...data, plan: planFile?.plan ?? planFile };
    }
  } catch (error) {
    console.error(`تعذر قراءة JSON: ${error.message}`);
    process.exit(2);
  }
  const result = evaluateOrders(data);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid ? 0 : 1);
}
