#!/usr/bin/env node
// Recomputes the margin of every candidate offer and checks the proposed limited-time test.
// Usage: node scripts/calculate-offer.mjs <offer.json|->
// Exit codes: 0 valid, 1 invalid or blocked, 2 unreadable or not JSON.

import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const VAT_RATE = 0.15;
export const TOLERANCE = 0.01;
export const MIN_TEST_DAYS = 7;
export const MAX_TEST_DAYS = 28;

const OFFER_TYPES = new Set(["percent_discount", "fixed_discount", "free_shipping", "bundle", "price_change"]);
const REQUIRED_COSTS = ["unit_cost", "shipping_cost", "packaging_cost", "payment_fee_pct", "payment_fee_fixed"];
const LICENCE_STATUSES = new Set(["to_verify", "confirmed_obtained", "confirmed_not_required"]);
const ZID_TOOLS = {
  percent_discount: ["Coupons"],
  fixed_discount: ["Coupons"],
  free_shipping: ["Coupons", "ShippingSettings"],
  bundle: ["BundleOffers"],
  price_change: ["Products"],
};
const BASIS_AR = {
  net_of_vat: "صافي بعد استبعاد الضريبة: السعر المعروض ÷ 1.15",
  vat_exclusive_prices: "الأسعار المعروضة لا تشمل الضريبة؛ الإيراد هو السعر نفسه",
  not_registered: "المتجر غير مسجل في الضريبة؛ لم تُستبعد ضريبة",
};
const PLACEHOLDER = /…|\.\.\.|TODO|<[^>]*>/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const num = (value) => typeof value === "number" && Number.isFinite(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;
const round2 = (value) => (value === null ? null : Math.round(value * 100) / 100);
const day = (value) => (typeof value === "string" && DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? Date.parse(`${value}T00:00:00Z`) : Number.NaN);

function findPlaceholders(node, pathLabel, found) {
  if (typeof node === "string") { if (PLACEHOLDER.test(node)) found.push(pathLabel); return; }
  if (Array.isArray(node)) { node.forEach((item, i) => findPlaceholders(item, `${pathLabel}[${i}]`, found)); return; }
  if (node && typeof node === "object") for (const [key, value] of Object.entries(node)) findPlaceholders(value, pathLabel ? `${pathLabel}.${key}` : key, found);
}

function findExpectedKeys(node, pathLabel, found) {
  if (Array.isArray(node)) { node.forEach((item, i) => findExpectedKeys(item, `${pathLabel}[${i}]`, found)); return; }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      const here = pathLabel ? `${pathLabel}.${key}` : key;
      if (/^(expected|predicted|forecast)_/.test(key)) found.push(here);
      findExpectedKeys(value, here, found);
    }
  }
}

export function vatBasis(vat) {
  if (vat?.registered === false) return "not_registered";
  if (vat?.registered === true && vat?.prices_include_vat === true) return "net_of_vat";
  if (vat?.registered === true && vat?.prices_include_vat === false) return "vat_exclusive_prices";
  return null;
}

// One order: displayed goods value, discount, shipping charged, then net revenue and variable costs.
export function orderMargin({ goodsGross, discount = 0, shippingCharged, units, costs, basis }) {
  const goodsAfter = goodsGross - discount;
  const customerPays = goodsAfter + shippingCharged;
  const netRevenue = basis === "net_of_vat" ? customerPays / (1 + VAT_RATE) : customerPays;
  const paymentFees = customerPays * (costs.payment_fee_pct / 100) + costs.payment_fee_fixed;
  const variableCosts = units * costs.unit_cost + costs.shipping_cost + costs.packaging_cost + paymentFees + (costs.other_variable_cost ?? 0);
  return {
    goods_gross: round2(goodsGross),
    discount: round2(discount),
    customer_pays: round2(customerPays),
    net_revenue: round2(netRevenue),
    vat_removed: round2(customerPays - netRevenue),
    payment_fees: round2(paymentFees),
    variable_costs: round2(variableCosts),
    margin: netRevenue - variableCosts,
  };
}

function isDiscount(offer, baseline) {
  if (offer.type === "percent_discount" || offer.type === "fixed_discount") return true;
  if (offer.type === "bundle") return num(offer.bundle_price) && num(offer.units_per_order) && offer.bundle_price < offer.units_per_order * baseline.unit_price;
  if (offer.type === "price_change") return num(offer.new_unit_price) && offer.new_unit_price < baseline.unit_price;
  return false;
}

function checkStated(errors, label, stated, computed) {
  if (!num(stated) && stated !== null) { errors.push(`${label} مطلوب رقمًا`); return; }
  if (computed === null || stated === null) {
    if (computed !== stated) errors.push(`${label} المذكور ${stated} لا يطابق المحسوب ${computed === null ? "null (لا تعادل ممكن)" : round2(computed)}`);
    return;
  }
  if (Math.abs(stated - computed) > TOLERANCE + 1e-9) errors.push(`${label} المذكور ${stated} لا يطابق المحسوب ${round2(computed)} (الفرق أكبر من ${TOLERANCE})`);
}

export function calculateOffer(data) {
  const errors = [];
  const missing = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, status: "invalid", errors: ["الجذر يجب أن يكون كائن JSON"] };
  }

  const placeholders = [];
  findPlaceholders(data, "", placeholders);
  if (placeholders.length) {
    return { valid: false, status: "invalid", errors: [`القالب غير معبأ: قيم نائبة في ${placeholders.slice(0, 5).join("، ")}`] };
  }

  const analysisDay = day(data.analysis_date);
  if (Number.isNaN(analysisDay)) errors.push("analysis_date يجب أن يكون تاريخًا بصيغة YYYY-MM-DD");

  // VAT basis
  if (typeof data.vat?.registered !== "boolean") errors.push("vat.registered مطلوب: هل المتجر مسجل في ضريبة القيمة المضافة؟ (true أو false)");
  if (data.vat?.registered === true && typeof data.vat?.prices_include_vat !== "boolean") errors.push("vat.prices_include_vat مطلوب: هل الأسعار المعروضة شاملة الضريبة؟");
  const basis = vatBasis(data.vat);
  if (basis && data.stated_basis !== basis) errors.push(`stated_basis «${data.stated_basis ?? "مفقود"}» لا يطابق أساس الحساب «${basis}»`);

  // Baseline and costs: an empty or missing cost is never treated as zero.
  const baseline = data.baseline ?? {};
  const costs = baseline.costs ?? {};
  for (const field of ["unit_price", "units_per_order", "shipping_charged"]) {
    if (!num(baseline[field])) missing.push(`baseline.${field}`);
  }
  for (const field of REQUIRED_COSTS) if (!num(costs[field])) missing.push(`baseline.costs.${field}`);
  if ("other_variable_cost" in costs && !num(costs.other_variable_cost)) missing.push("baseline.costs.other_variable_cost");
  if (num(baseline.units_per_order) && (!Number.isInteger(baseline.units_per_order) || baseline.units_per_order < 1)) errors.push("baseline.units_per_order يجب أن يكون عددًا صحيحًا موجبًا");
  for (const field of REQUIRED_COSTS) if (num(costs[field]) && costs[field] < 0) errors.push(`baseline.costs.${field} لا يكون سالبًا`);
  if (num(costs.payment_fee_pct) && costs.payment_fee_pct >= 100) errors.push("baseline.costs.payment_fee_pct نسبة مئوية أقل من 100");

  if (missing.length || !basis) {
    return {
      valid: false,
      status: "blocked_missing_costs",
      basis,
      missing,
      errors: [
        ...missing.map((field) => `مفقود: ${field}. لا يُحسب هامش ولا يُعطى حكم قبل إدخاله؛ القيمة الفارغة لا تُعامل كصفر`),
        ...errors,
      ],
    };
  }

  const base = orderMargin({ goodsGross: baseline.unit_price * baseline.units_per_order, shippingCharged: baseline.shipping_charged, units: baseline.units_per_order, costs, basis });
  checkStated(errors, "baseline.stated_margin", baseline.stated_margin ?? undefined, base.margin);

  // Candidate offers
  const offers = Array.isArray(data.offers) ? data.offers : [];
  if (!offers.length) errors.push("offers يجب أن تحوي عرضًا مرشحًا واحدًا على الأقل");
  const ids = new Set();
  const results = [];
  let anyDiscount = false;

  for (const [index, offer] of offers.entries()) {
    const label = text(offer?.id) ? `offers.${offer.id}` : `offers[${index}]`;
    if (!text(offer?.id)) { errors.push(`${label}.id مطلوب`); continue; }
    if (ids.has(offer.id)) { errors.push(`${label} مكرر`); continue; }
    ids.add(offer.id);
    if (!OFFER_TYPES.has(offer.type)) { errors.push(`${label}.type غير معروف`); continue; }

    const units = offer.units_per_order ?? baseline.units_per_order;
    if (!Number.isInteger(units) || units < 1) { errors.push(`${label}.units_per_order عدد صحيح موجب`); continue; }
    let goodsGross = baseline.unit_price * units;
    let discount = 0;
    let shippingCharged = baseline.shipping_charged;

    if (offer.type === "percent_discount") {
      if (!num(offer.value) || offer.value <= 0 || offer.value >= 100) { errors.push(`${label}.value نسبة بين 0 و100`); continue; }
      discount = goodsGross * offer.value / 100;
    } else if (offer.type === "fixed_discount") {
      if (!num(offer.value) || offer.value <= 0 || offer.value >= goodsGross) { errors.push(`${label}.value مبلغ موجب أقل من قيمة السلة`); continue; }
      discount = offer.value;
    } else if (offer.type === "free_shipping") {
      if (!num(offer.min_goods_value) || offer.min_goods_value < 0) { errors.push(`${label}.min_goods_value (حد الشحن المجاني) مطلوب`); continue; }
      shippingCharged = 0;
    } else if (offer.type === "bundle") {
      if (units < 2 || !num(offer.bundle_price) || offer.bundle_price <= 0) { errors.push(`${label} الباقة تحتاج units_per_order ≥ 2 وbundle_price`); continue; }
      goodsGross = offer.bundle_price;
    } else if (offer.type === "price_change") {
      if (!num(offer.new_unit_price) || offer.new_unit_price <= 0) { errors.push(`${label}.new_unit_price مطلوب`); continue; }
      goodsGross = offer.new_unit_price * units;
    }

    if (num(offer.min_goods_value) && baseline.unit_price * units < offer.min_goods_value) {
      errors.push(`${label} السلة المفترضة (${units} × ${baseline.unit_price} = ${round2(baseline.unit_price * units)}) لا تبلغ الحد ${offer.min_goods_value}؛ ارفع units_per_order`);
      continue;
    }

    const result = orderMargin({ goodsGross, discount, shippingCharged, units, costs, basis });
    const uplift = result.margin > 0 ? (base.margin / result.margin - 1) * 100 : null;
    const entry = {
      id: offer.id,
      type: offer.type,
      units_per_order: units,
      ...result,
      margin: round2(result.margin),
      break_even_uplift_pct: round2(uplift),
      below_floor: num(data.margin_floor) ? result.margin < data.margin_floor : null,
      is_discount: isDiscount(offer, baseline),
    };
    if (entry.is_discount) anyDiscount = true;

    checkStated(errors, `${label}.stated_margin`, offer.stated_margin ?? undefined, result.margin);
    checkStated(errors, `${label}.stated_break_even_uplift_pct`, offer.stated_break_even_uplift_pct === undefined ? undefined : offer.stated_break_even_uplift_pct, uplift);

    // A bigger basket is compared with the same basket without the offer.
    if (units !== baseline.units_per_order) {
      const same = orderMargin({ goodsGross: baseline.unit_price * units, shippingCharged: baseline.shipping_charged, units, costs, basis });
      const costVsSame = same.margin - result.margin;
      const gainVsBase = result.margin - base.margin;
      const share = gainVsBase > 0 ? (costVsSame > 0 ? costVsSame / (costVsSame + gainVsBase) * 100 : 0) : null;
      entry.same_basket_margin = round2(same.margin);
      entry.cost_vs_same_basket = round2(costVsSame);
      entry.break_even_upgrade_share_pct = round2(share);
      if ("stated_same_basket_margin" in offer) checkStated(errors, `${label}.stated_same_basket_margin`, offer.stated_same_basket_margin, same.margin);
      if ("stated_upgrade_share_pct" in offer) checkStated(errors, `${label}.stated_upgrade_share_pct`, offer.stated_upgrade_share_pct, share);
    }
    results.push(entry);
  }

  // No fabricated forecasts without order history.
  if (typeof data.history?.available !== "boolean") errors.push("history.available مطلوب: هل يوجد سجل طلبات سابق؟");
  const expectedKeys = [];
  findExpectedKeys({ offers: data.offers, test: data.test }, "", expectedKeys);
  if (expectedKeys.length && data.history?.available !== true) errors.push(`لا توقعات بلا سجل طلبات: احذف ${expectedKeys.join("، ")} وصمم الاختبار للتعلم لا للإثبات`);

  // The one recommended limited-time test.
  const test = data.test ?? {};
  const chosen = results.find((entry) => entry.id === test.offer_id);
  if (!text(test.offer_id)) errors.push("test.offer_id مطلوب: اختبار واحد موصى به");
  else if (!chosen) errors.push(`test.offer_id «${test.offer_id}» ليس من العروض المحسوبة`);
  const start = day(test.start_date);
  const end = day(test.end_date);
  if (Number.isNaN(start)) errors.push("test.start_date مطلوب بصيغة YYYY-MM-DD");
  if (Number.isNaN(end)) errors.push("test.end_date مطلوب بصيغة YYYY-MM-DD: الاختبار محدود المدة");
  if (!Number.isNaN(start) && !Number.isNaN(analysisDay) && start < analysisDay) errors.push("test.start_date قبل تاريخ التحليل");
  let days = null;
  if (!Number.isNaN(start) && !Number.isNaN(end)) {
    days = Math.round((end - start) / 86400000) + 1;
    if (end <= start) errors.push("test.end_date يجب أن يكون بعد start_date");
    else if (days < MIN_TEST_DAYS || days > MAX_TEST_DAYS) errors.push(`مدة الاختبار ${days} يومًا؛ المسموح من ${MIN_TEST_DAYS} إلى ${MAX_TEST_DAYS}`);
  }
  if (!text(test.stop_condition)) errors.push("test.stop_condition مطلوب: متى يوقف العرض فورًا");
  if (!text(test.success_metric)) errors.push("test.success_metric مطلوب: كيف يُحكم على النتيجة");
  if (chosen) {
    if (chosen.margin <= 0) errors.push(`العرض المختار ${chosen.id} هامشه ${chosen.margin} ر.س؛ لا يُختبر عرض يخسر في كل طلب`);
    else if (chosen.below_floor) errors.push(`العرض المختار ${chosen.id} هامشه ${chosen.margin} ر.س تحت الحد الأدنى ${data.margin_floor}`);
    const setup = test.zid_setup ?? {};
    if (setup.status !== "draft_awaiting_approval") errors.push("test.zid_setup.status يجب أن يكون draft_awaiting_approval؛ المهارة لا تنشئ كوبونًا ولا تغير سعرًا");
    if (!ZID_TOOLS[chosen.type].includes(setup.tool)) errors.push(`test.zid_setup.tool لنوع ${chosen.type} يكون ${ZID_TOOLS[chosen.type].join(" أو ")}`);
  }

  // Ministry of Commerce discount licence: verify before announcing any discount.
  const licence = (Array.isArray(data.pre_launch_checks) ? data.pre_launch_checks : []).find((check) => check?.id === "moc_discount_licence");
  if (anyDiscount) {
    if (!licence) errors.push("pre_launch_checks ينقصه moc_discount_licence: تحقق من اشتراط ترخيص التخفيضات من وزارة التجارة قبل الإعلان عن أي خصم");
    else {
      if (!LICENCE_STATUSES.has(licence.status)) errors.push("moc_discount_licence.status واحدة من to_verify وconfirmed_obtained وconfirmed_not_required");
      if (!text(licence.note)) errors.push("moc_discount_licence.note مطلوب");
    }
  }

  if (!Array.isArray(data.approvals_needed) || !data.approvals_needed.some(text)) errors.push("approvals_needed مطلوب: ما يوافق عليه التاجر قبل أي تفعيل");

  return {
    valid: errors.length === 0,
    status: errors.length ? "invalid" : "ok",
    basis,
    basis_ar: BASIS_AR[basis],
    baseline: { ...base, margin: round2(base.margin) },
    offers: results,
    test: chosen ? { offer_id: chosen.id, days, margin: chosen.margin } : null,
    discount_licence_check: anyDiscount ? (licence?.status ?? "missing") : "not_needed",
    errors,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("الاستخدام: node scripts/calculate-offer.mjs <offer.json|->");
    process.exit(2);
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(inputPath === "-" ? 0 : inputPath, "utf8"));
  } catch (error) {
    console.error(`تعذر قراءة JSON: ${error.message}`);
    process.exit(2);
  }
  const result = calculateOffer(data);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid ? 0 : 1);
}
