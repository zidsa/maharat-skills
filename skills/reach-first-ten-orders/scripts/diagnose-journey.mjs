#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const forbiddenKeys = new Set([
  "customer_name",
  "email",
  "phone",
  "address",
  "card_number",
  "access_token",
  "service_role_key",
]);

const [inputPath] = process.argv.slice(2);
if (!inputPath) {
  console.error("Usage: node diagnose-journey.mjs <input.json>");
  process.exit(2);
}

const input = JSON.parse(await readFile(inputPath, "utf8"));
const errors = [];
const warnings = [];

function scanForbidden(value, path = "input") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbidden(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key.toLowerCase())) errors.push(`ممنوع تمرير ${path}.${key}`);
    scanForbidden(child, `${path}.${key}`);
  }
}

function nullableBoolean(value, path) {
  if (value !== true && value !== false && value !== null) errors.push(`${path} يجب أن يكون true أو false أو null`);
}

function nonNegativeInteger(value, path, nullable = false) {
  if (nullable && value === null) return;
  if (!Number.isInteger(value) || value < 0) errors.push(`${path} يجب أن يكون عددًا صحيحًا غير سالب`);
}

function validOrder(order = {}) {
  if (order.is_test === true) return { valid: false, reason: "test_order" };
  if (order.is_fraud === true) return { valid: false, reason: "fraud" };
  if (order.status === "cancelled") return { valid: false, reason: "cancelled" };
  if (order.refund_status === "full") return { valid: false, reason: "fully_refunded" };
  if (order.payment_method === "cod") {
    return order.cod_status === "confirmed"
      ? { valid: true }
      : { valid: false, reason: "payment_unconfirmed" };
  }
  return order.payment_status === "paid"
    ? { valid: true }
    : { valid: false, reason: "payment_unconfirmed" };
}

scanForbidden(input);

if (!["mcp", "public_url", "manual"].includes(input.source)) errors.push("source غير صالح");
if (Number.isNaN(Date.parse(input.observed_at))) errors.push("observed_at غير صالح");

const store = input.store ?? {};
nullableBoolean(store.published, "store.published");
nonNegativeInteger(store.products_count, "store.products_count", true);
nullableBoolean(store.payment_enabled, "store.payment_enabled");
nullableBoolean(store.shipping_enabled, "store.shipping_enabled");
if (!["passed", "failed", "not_assessed"].includes(store.checkout_test)) errors.push("store.checkout_test غير صالح");

const product = input.hero_product ?? {};
nullableBoolean(product.published, "hero_product.published");
if (product.price !== null && (!Number.isFinite(product.price) || product.price <= 0)) errors.push("hero_product.price يجب أن يكون موجبًا أو null");
nonNegativeInteger(product.stock, "hero_product.stock", true);

const funnel = input.funnel;
if (funnel !== null) {
  nonNegativeInteger(funnel?.product_views, "funnel.product_views");
  nonNegativeInteger(funnel?.add_to_carts, "funnel.add_to_carts");
  nonNegativeInteger(funnel?.checkout_starts, "funnel.checkout_starts");
  if (Number.isInteger(funnel?.product_views) && Number.isInteger(funnel?.add_to_carts) && funnel.add_to_carts > funnel.product_views) {
    errors.push("الإضافة للسلة أكبر من مشاهدات المنتج");
  }
  if (Number.isInteger(funnel?.add_to_carts) && Number.isInteger(funnel?.checkout_starts) && funnel.checkout_starts > funnel.add_to_carts) {
    errors.push("بدء الدفع أكبر من الإضافة للسلة");
  }
}

if (!Array.isArray(input.orders)) errors.push("orders يجب أن تكون مصفوفة");
if (!Array.isArray(input.merchant_assets)) errors.push("merchant_assets يجب أن تكون مصفوفة");

if (errors.length) {
  console.log(JSON.stringify({ valid: false, errors }, null, 2));
  process.exit(1);
}

const orderChecks = input.orders.map(validOrder);
const verifiedOrderCount = orderChecks.filter((order) => order.valid).length;
const excludedReasons = orderChecks
  .filter((order) => !order.valid)
  .reduce((counts, order) => ({ ...counts, [order.reason]: (counts[order.reason] ?? 0) + 1 }), {});
const base = {
  valid: true,
  errors: [],
  warnings,
  observed_at: input.observed_at,
  source: input.source,
  verified_order_count: verifiedOrderCount,
  excluded_order_count: orderChecks.length - verifiedOrderCount,
  excluded_reasons: excludedReasons,
};

function emit(result) {
  console.log(JSON.stringify({ ...base, ...result }, null, 2));
}

if (verifiedOrderCount >= 10) {
  emit({
    status: "complete",
    diagnosis: "first_ten_orders_reached",
    evidence: `${verifiedOrderCount} طلبات صحيحة وفق قواعد التحقق`,
    next_action: "ثبّت مصادر الطلبات التي أثبتت نجاحها قبل توسيع النمو.",
    experiment: null,
    handoff: "grow-store-to-hundred-orders",
  });
  process.exit(0);
}

const readinessChecks = [
  [store.published === false, "store_unpublished", "انشر المتجر وتحقق من فتحه للزوار.", "pass-store-launch-gate"],
  [store.products_count === 0, "no_published_products", "انشر منتجًا واحدًا صالحًا للبيع.", "pass-store-launch-gate"],
  [product.published === false || !product.name, "hero_product_missing", "اختر منتجًا بطلًا منشورًا للحملة الأولى.", "pass-store-launch-gate"],
  [product.price === null, "price_unverified", "تحقق من ظهور سعر المنتج البطل.", "pass-store-launch-gate"],
  [product.stock === null, "stock_unverified", "تحقق من توفر مخزون المنتج أو وضّح الطلب المسبق.", "pass-store-launch-gate"],
  [product.stock === 0, "out_of_stock", "وفّر مخزون المنتج البطل أو اختر منتجًا متاحًا.", "pass-store-launch-gate"],
  [store.payment_enabled === false, "payment_disabled", "فعّل وسيلة دفع صالحة واختبرها.", "test-order-payment-shipping"],
  [store.shipping_enabled === false, "shipping_disabled", "فعّل شحنًا أو استلامًا يغطي السوق المستهدف.", "test-order-payment-shipping"],
  [store.checkout_test === "failed", "checkout_test_failed", "نفّذ طلبًا تجريبيًا وأصلح نقطة فشل الدفع أو الشحن.", "test-order-payment-shipping"],
];

const blocker = readinessChecks.find(([blocked]) => blocked);
if (blocker) {
  emit({
    status: "blocked",
    diagnosis: blocker[1],
    evidence: "فشل بند حاسم في بوابة الجاهزية.",
    next_action: blocker[2],
    experiment: null,
    handoff: blocker[3],
  });
  process.exit(0);
}

const internalUnknown = store.payment_enabled === null || store.shipping_enabled === null || store.checkout_test === "not_assessed";
if (internalUnknown) {
  emit({
    status: "not_assessed",
    diagnosis: "internal_readiness_unverified",
    evidence: "الرابط العام لا يثبت إعدادات الدفع والشحن أو نجاح الطلب.",
    next_action: "اربط بيانات المتجر أو أكّد نتيجة اختبار طلب واحد.",
    experiment: null,
    handoff: "test-order-payment-shipping",
  });
  process.exit(0);
}

function acquisitionResult() {
  const assets = new Set(input.merchant_assets);
  if (assets.has("owned_audience")) return ["owned", "أرسل رسالة واحدة لشريحة مهتمة تقود لمنتج واحد.", "الرسالة", "مشاهدات المنتج المؤهلة", "لا ترسل لجمهور غير ذي صلة"];
  if (assets.has("content")) return ["organic", "انشر قطعة محتوى واحدة تعالج اعتراضًا وتقود للمنتج البطل.", "زاوية المحتوى", "مشاهدات المنتج المؤهلة", "لا تغيّر العرض والرسالة معًا"];
  if (assets.has("partnership")) return ["partnership", "فعّل شراكة واحدة مع جمهور مناسب ووجهة واحدة.", "الشريك", "مشاهدات المنتج المؤهلة", "لا تعتمد خصمًا غير محسوب"];
  if (assets.has("ad_budget") && input.tracking_ready === true) return ["paid", "شغّل اختبارًا صغيرًا على عرض ووجهة واحدين.", "الجمهور", "مشاهدات المنتج المؤهلة", "أوقف الإنفاق عند تعطل القياس"];
  if (assets.has("ad_budget")) return ["paid_blocked", "أصلح التتبع واختبر الإسناد قبل تشغيل الإعلان.", "التتبع", "حدث اختبار مسجل", "لا تنفق قبل نجاح القياس"];
  return ["needs_input", "اختر أصلًا واحدًا يمكنك تنفيذه هذا الأسبوع.", "مسار الاكتساب", "مشاهدات المنتج المؤهلة", "لا تبدأ خمس قنوات معًا"];
}

let diagnosis;
let evidence;
let nextAction;
let variable;
let metric;
let guardrail;
let handoff = null;

if (funnel === null || funnel.product_views === 0) {
  [diagnosis, nextAction, variable, metric, guardrail] = acquisitionResult();
  evidence = funnel === null ? "لا توجد بيانات مسار تحويل متاحة." : "لا توجد مشاهدات مسجلة للمنتج البطل.";
  if (diagnosis === "paid_blocked") handoff = "audit-paid-campaign-readiness";
} else if (funnel.add_to_carts === 0) {
  diagnosis = "view_to_cart";
  evidence = `${funnel.product_views} مشاهدة و0 إضافة للسلة.`;
  nextAction = "حسّن عرض المنتج البطل بإجابة واضحة عن أهم اعتراض ثم راقب الإضافة للسلة.";
  variable = "عرض المنتج";
  metric = "الإضافة للسلة";
  guardrail = "لا تغيّر السعر والمحتوى معًا";
} else if (funnel.checkout_starts === 0) {
  diagnosis = "cart_to_checkout";
  evidence = `${funnel.add_to_carts} إضافة للسلة و0 بدء دفع.`;
  nextAction = "راجع التكلفة النهائية ووضوح الشحن في السلة ثم اختبر بدء الدفع.";
  variable = "وضوح التكلفة والشحن";
  metric = "بدء الدفع";
  guardrail = "لا تضف خصمًا قبل معرفة الاعتراض";
} else if (verifiedOrderCount === 0) {
  diagnosis = "checkout_to_order";
  evidence = `${funnel.checkout_starts} بدء دفع و0 طلبات صحيحة.`;
  nextAction = "نفّذ طلبًا من جهاز عميل وحدد نقطة فشل الدفع أو الشحن.";
  variable = "نقطة فشل الدفع";
  metric = "الطلبات الصحيحة";
  guardrail = "لا ترسل زيارات جديدة قبل إصلاح المسار";
  handoff = "test-order-payment-shipping";
} else if (!input.order_sources || Object.keys(input.order_sources).length === 0) {
  diagnosis = "order_source_unknown";
  evidence = `${verifiedOrderCount} طلبات صحيحة بلا مصدر موثق.`;
  nextAction = "وثّق مصدر كل طلب صحيح مجمعًا قبل التجربة التالية.";
  variable = "وسم المصدر";
  metric = "طلبات صحيحة بمصدر معروف";
  guardrail = "لا تجمع بيانات عميل شخصية";
} else {
  const [source] = Object.entries(input.order_sources).sort((a, b) => b[1] - a[1])[0];
  diagnosis = "repeat_proven_source";
  evidence = `${verifiedOrderCount} طلبات صحيحة؛ المصدر الأعلى ${source}.`;
  nextAction = `كرّر أفضل تنفيذ من ${source} على المنتج نفسه مرة واحدة.`;
  variable = "تكرار المصدر المثبت";
  metric = "الطلبات الصحيحة من المصدر";
  guardrail = "لا توسّع قبل ثبات القياس";
}

if (base.excluded_order_count > 0) warnings.push(`استُبعد ${base.excluded_order_count} طلب من العداد.`);

emit({
  status: "active",
  diagnosis,
  evidence,
  next_action: nextAction,
  experiment: {
    variable,
    metric,
    guardrail,
    review_when: "بعد تنفيذ التجربة وجمع إشارة كافية للحكم دون تغيير عامل ثانٍ",
  },
  handoff,
});
