#!/usr/bin/env node
// Decomposes the sales change between two equal periods and validates a stated diagnosis.
// Usage: node scripts/diagnose.mjs <diagnosis.json|-> [--compute-only]
// Exit codes: 0 valid, 1 invalid, 2 usage error or input that is not JSON.

import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const MIN_ORDERS = 30;
export const PRICE_CHANGE_MIN = 0.05;
export const HANDOFFS = new Set([
  "audit-checkout-friction",
  "plan-inventory-reorder",
  "audit-paid-campaign-readiness",
  "reduce-returns-exchanges",
  "design-profitable-offer",
]);
const STATUSES = new Set(["diagnosed", "needs_data", "insufficient_sample"]);
const CAUSE_TYPES = new Set(["traffic_source", "conversion", "aov", "product", "stockout", "returns", "price"]);
const UNKNOWN_VALUES = new Set(["traffic", "conversion", "returns", "stock_history", "product_views", "cost", "attribution"]);
const ORDER_SOURCES = new Set(["zid_mcp", "zid_dashboard_export", "merchant_file"]);
const SESSION_SOURCES = new Set(["zid_analytics_export", "ga4", "ads_platform", "merchant_file"]);
const STOCK_SOURCES = new Set(["zid_dashboard", "merchant_file"]);

// Which causes can explain which first-level driver.
const CAUSES_BY_DRIVER = {
  sessions: ["traffic_source"],
  conversion: ["conversion", "stockout", "price", "product"],
  orders: ["stockout", "price", "product"],
  aov: ["aov", "price", "product"],
  returns: ["returns", "product"],
};
// Causes whose handoff is fixed. traffic_source depends on whether the source is paid.
const REQUIRED_HANDOFF = {
  conversion: "audit-checkout-friction",
  stockout: "plan-inventory-reorder",
  returns: "reduce-returns-exchanges",
  price: "design-profitable-offer",
};
const DRIVER_AR = {
  sessions: "الزيارات",
  conversion: "نسبة التحويل",
  orders: "عدد الطلبات",
  aov: "متوسط قيمة الطلب",
  returns: "المرتجعات",
};

const DAY = 86400000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Seasonal windows. Hijri dates follow the Umm al-Qura calendar and can shift by a day;
// retail windows around White Friday, National Day and Founding Day are the skill's own convention.
const EVENTS = [
  { id: "ramadan", ar: "رمضان", start: "2025-03-01", end: "2025-03-29" },
  { id: "eid_al_fitr", ar: "عيد الفطر", start: "2025-03-30", end: "2025-04-02" },
  { id: "eid_al_adha", ar: "العشر الأوائل من ذي الحجة وعيد الأضحى", start: "2025-05-28", end: "2025-06-09" },
  { id: "ramadan", ar: "رمضان", start: "2026-02-18", end: "2026-03-19" },
  { id: "eid_al_fitr", ar: "عيد الفطر", start: "2026-03-20", end: "2026-03-23" },
  { id: "eid_al_adha", ar: "العشر الأوائل من ذي الحجة وعيد الأضحى", start: "2026-05-18", end: "2026-05-30" },
  { id: "ramadan", ar: "رمضان", start: "2027-02-08", end: "2027-03-08" },
  { id: "eid_al_fitr", ar: "عيد الفطر", start: "2027-03-09", end: "2027-03-12" },
  { id: "eid_al_adha", ar: "العشر الأوائل من ذي الحجة وعيد الأضحى", start: "2027-05-08", end: "2027-05-20" },
];
const CALENDAR_FROM = "2025-01-01";
const CALENDAR_TO = "2027-12-31";
for (const year of [2025, 2026, 2027]) {
  EVENTS.push({ id: "founding_day", ar: "يوم التأسيس (22 فبراير)", start: `${year}-02-19`, end: `${year}-02-23` });
  EVENTS.push({ id: "national_day", ar: "اليوم الوطني (23 سبتمبر)", start: `${year}-09-20`, end: `${year}-09-24` });
  const friday = blackFriday(year);
  EVENTS.push({ id: "white_friday", ar: "الجمعة البيضاء", start: addDays(friday, -7), end: addDays(friday, 3) });
}

const text = (v) => typeof v === "string" && v.trim().length > 0;
const num = (v) => typeof v === "number" && Number.isFinite(v);
const r2 = (v) => (v === null || v === undefined ? null : Math.round(v * 100) / 100);
function parseDate(v) {
  if (typeof v !== "string" || !DATE.test(v)) return Number.NaN;
  const t = Date.parse(`${v}T00:00:00Z`);
  return new Date(t).toISOString().slice(0, 10) === v ? t : Number.NaN;
}
function iso(t) { return new Date(t).toISOString().slice(0, 10); }
function addDays(dateText, days) { return iso(parseDate(dateText) + days * DAY); }
function blackFriday(year) {
  // Friday after the fourth Thursday of November.
  const first = new Date(Date.UTC(year, 10, 1));
  const thursday = 1 + ((4 - first.getUTCDay() + 7) % 7) + 21;
  return iso(Date.UTC(year, 10, thursday + 1));
}
function salaryDay(year, month) {
  // Government salaries: the 27th; a Friday moves to the Thursday before, a Saturday to the Sunday after.
  const t = Date.UTC(year, month, 27);
  const dow = new Date(t).getUTCDay();
  return iso(dow === 5 ? t - DAY : dow === 6 ? t + DAY : t);
}

function seasonality(start, end) {
  const s = parseDate(start), e = parseDate(end);
  const hits = {};
  for (const ev of EVENTS) {
    const a = Math.max(s, parseDate(ev.start)), b = Math.min(e, parseDate(ev.end));
    if (a <= b) {
      const key = `${ev.id}`;
      hits[key] = hits[key] || { name: ev.ar, days: 0 };
      hits[key].days += Math.round((b - a) / DAY) + 1;
    }
  }
  const salary = [];
  for (let t = Date.UTC(new Date(s).getUTCFullYear(), new Date(s).getUTCMonth(), 1); t <= e; t = Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth() + 1, 1)) {
    const d = salaryDay(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth());
    const dt = parseDate(d);
    if (dt >= s && dt <= e) salary.push(d);
  }
  if (salary.length) hits.salary_day = { name: "يوم صرف الرواتب (27 من الشهر)", days: salary.length, dates: salary };
  const covered = s >= parseDate(CALENDAR_FROM) && e <= parseDate(CALENDAR_TO);
  return { events: hits, covered };
}

function permutations(n) {
  if (n === 1) return [[0]];
  const out = [];
  for (const p of permutations(n - 1)) for (let i = 0; i <= p.length; i += 1) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return out;
}
// Splits the change in a product of factors so that the parts add up exactly to the change.
export function splitProductChange(before, after) {
  const perms = permutations(before.length);
  const parts = before.map(() => 0);
  for (const perm of perms) {
    const v = [...before];
    for (const i of perm) {
      const prev = v.reduce((m, x) => m * x, 1);
      v[i] = after[i];
      parts[i] += (v.reduce((m, x) => m * x, 1) - prev) / perms.length;
    }
  }
  return parts;
}

function periodMetrics(p) {
  const sessions = num(p.sessions) ? p.sessions : null;
  const returns = num(p.returns) ? p.returns : null;
  return {
    start: p.start, end: p.end,
    days: Math.round((parseDate(p.end) - parseDate(p.start)) / DAY) + 1,
    sessions,
    orders: p.orders,
    conversion_pct: sessions ? r2((p.orders / sessions) * 100) : null,
    aov: p.orders ? r2(p.sales / p.orders) : null,
    sales: p.sales,
    returns,
    net_sales: returns === null ? p.sales : p.sales - returns,
  };
}

export function decompose(prev, curr) {
  const trafficKnown = num(prev.sessions) && prev.sessions > 0 && num(curr.sessions) && curr.sessions > 0;
  const returnsKnown = num(prev.returns) && num(curr.returns);
  const keys = trafficKnown ? ["sessions", "conversion", "aov"] : ["orders", "aov"];
  const f = (p) => (trafficKnown ? [p.sessions, p.orders / p.sessions, p.sales / p.orders] : [p.orders, p.sales / p.orders]);
  const parts = splitProductChange(f(prev), f(curr));
  const contributions = Object.fromEntries(keys.map((k, i) => [k, parts[i]]));
  if (returnsKnown) contributions.returns = -(curr.returns - prev.returns);
  const net = (p) => p.sales - (returnsKnown ? p.returns : 0);
  const total = net(curr) - net(prev);
  const sum = Object.values(contributions).reduce((m, v) => m + v, 0);
  const reconciled = Math.abs(sum - total) <= Math.max(0.01, Math.abs(total) * 1e-9);
  const sign = Math.sign(total);
  const ranked = Object.entries(contributions).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const inDirection = ranked.filter(([, v]) => sign !== 0 && Math.sign(v) === sign);
  const main = (inDirection[0] || ranked[0])[0];
  return {
    traffic_known: trafficKnown,
    returns_known: returnsKnown,
    basis: `${returnsKnown ? "صافي المبيعات = المبيعات − المرتجعات؛ " : ""}${trafficKnown ? "المبيعات = الزيارات × التحويل × متوسط الطلب" : "المبيعات = الطلبات × متوسط الطلب (الزيارات غير متاحة)"}`,
    total_change: total,
    contributions,
    sum,
    reconciled,
    main_driver: main,
    main_driver_share_pct: total ? r2((contributions[main] / total) * 100) : null,
    ranking: ranked.map(([k, v]) => ({ driver: k, name: DRIVER_AR[k], contribution: r2(v), share_pct: total ? r2((v / total) * 100) : null })),
  };
}

function checkPeriod(label, p, errors) {
  if (!p || typeof p !== "object") { errors.push(`periods.${label} مفقودة`); return false; }
  const s = parseDate(p.start), e = parseDate(p.end);
  if (Number.isNaN(s) || Number.isNaN(e)) errors.push(`periods.${label}.start/end يجب أن تكون تواريخ بصيغة YYYY-MM-DD`);
  else if (e < s) errors.push(`periods.${label}: النهاية قبل البداية`);
  if (!num(p.orders) || p.orders < 0 || !Number.isInteger(p.orders)) errors.push(`periods.${label}.orders يجب أن يكون عددًا صحيحًا غير سالب`);
  if (!num(p.sales) || p.sales < 0) errors.push(`periods.${label}.sales يجب أن يكون رقمًا غير سالب`);
  if (p.returns !== null && (!num(p.returns) || p.returns < 0)) errors.push(`periods.${label}.returns رقم غير سالب أو null إذا لم يتوفر`);
  if (p.sessions !== null && (!num(p.sessions) || p.sessions < 0)) errors.push(`periods.${label}.sessions رقم أو null إذا لم تتوفر بيانات الزيارات`);
  if (p.sessions === 0 && p.orders > 0) errors.push(`periods.${label}.sessions = 0 مع وجود طلبات: البيانات الناقصة ليست صفرًا، اكتب null`);
  if (num(p.sessions) && num(p.orders) && p.sessions > 0 && p.orders > p.sessions) errors.push(`periods.${label}: الطلبات أكثر من الزيارات؛ راجع المصدر`);
  if (p.orders === 0 && p.sales > 0) errors.push(`periods.${label}: مبيعات بلا طلبات`);
  if (num(p.returns) && num(p.sales) && p.returns > p.sales) errors.push(`periods.${label}: المرتجعات أكبر من المبيعات`);
  return !errors.some((x) => x.startsWith(`periods.${label}`));
}

function strings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => strings(v, out));
  return out;
}

const TRAFFIC_CLAIM = [
  /(الزيارات|الزوار|الجلسات|الزيارة|الترافيك|traffic|sessions)[^.،؛\n]{0,25}(انخفض|نزل|تراجع|ارتفع|زاد|زادت|قلّ|قلت|قلّت|صفر|توقف|انعدم|اختف)/i,
  /(انخفاض|تراجع|نزول|ارتفاع|زيادة|قلة|انعدام|توقف|غياب|لا توجد|ما فيه|ما في)\s+(في\s+)?(ال)?(زيارات|زوار|جلسات|ترافيك)/,
];
const BENCHMARK = /(متوسط السوق|متوسط القطاع|متوسط الصناعة|المعدل الطبيعي|المعدل المعتاد في السوق|معيار السوق|industry average|benchmark)/i;
const EXECUTED = /(تم رفع|تم خفض|تم تعديل|تم إيقاف|تم تغيير|تم نشر|تم إنشاء|رفعنا|أوقفنا|عدّلنا|غيّرنا|نشرنا)/;
const PLACEHOLDER = /(…|\.\.\.|\[[^\]]*\]|<[^>]*>)/;

export function diagnose(data, { computeOnly = false } = {}) {
  const errors = [];
  const warnings = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) return { valid: false, errors: ["الجذر يجب أن يكون كائن JSON"], warnings };

  for (const f of ["store", "currency", "sales_basis"]) if (!text(data[f])) errors.push(`${f} مطلوب`);
  const asOf = parseDate(data.as_of);
  if (Number.isNaN(asOf)) errors.push("as_of مطلوب بصيغة YYYY-MM-DD");

  const src = data.data_sources || {};
  if (!ORDER_SOURCES.has(src.orders)) errors.push("data_sources.orders يجب أن يكون zid_mcp أو zid_dashboard_export أو merchant_file");

  const prev = data.periods?.previous, curr = data.periods?.current;
  const okPrev = checkPeriod("previous", prev, errors);
  const okCurr = checkPeriod("current", curr, errors);
  if (!okPrev || !okCurr) return { valid: false, errors, warnings };

  // Comparable periods.
  const a = periodMetrics(prev), b = periodMetrics(curr);
  if (a.days !== b.days) errors.push(`الفترتان غير متساويتين: ${a.days} يومًا مقابل ${b.days}`);
  if (a.days < 7) errors.push("الفترة أقصر من 7 أيام؛ أيام الأسبوع وحدها تغيّر المبيعات");
  if (parseDate(prev.end) >= parseDate(curr.start)) errors.push("الفترتان متداخلتان أو السابقة ليست قبل الحالية");
  if (!Number.isNaN(asOf) && parseDate(curr.end) > asOf) errors.push("الفترة الحالية تنتهي بعد as_of؛ لا تقارن فترة لم تكتمل");

  // Traffic data: never from Zid MCP, never zero when missing.
  const trafficAny = num(prev.sessions) || num(curr.sessions);
  const trafficBoth = num(prev.sessions) && prev.sessions > 0 && num(curr.sessions) && curr.sessions > 0;
  if (src.sessions === "zid_mcp") errors.push("data_sources.sessions لا يكون zid_mcp: ربط زد لا يعرض الزيارات؛ استخدم تصدير تحليلات زد أو GA4 أو منصة الإعلان");
  else if (trafficAny && !SESSION_SOURCES.has(src.sessions)) errors.push("data_sources.sessions مطلوب مع أرقام الزيارات: zid_analytics_export أو ga4 أو ads_platform أو merchant_file");
  if (!trafficAny && src.sessions != null) errors.push("data_sources.sessions محدد بلا أرقام زيارات");
  if (trafficAny && !trafficBoth) errors.push("الزيارات متاحة لفترة واحدة فقط؛ اكتب null للفترتين أو أكمل الأخرى من المصدر نفسه");
  if (src.stock_history != null && !STOCK_SOURCES.has(src.stock_history)) errors.push("data_sources.stock_history يجب أن يكون zid_dashboard أو merchant_file أو null (ربط زد يعرض المخزون الحالي فقط)");

  // Seasonality.
  const seasonPrev = seasonality(prev.start, prev.end), seasonCurr = seasonality(curr.start, curr.end);
  const sig = (s) => JSON.stringify(Object.keys(s.events).sort().map((k) => [k, s.events[k].days]));
  const mismatch = sig(seasonPrev) !== sig(seasonCurr);
  const uncovered = !seasonPrev.covered || !seasonCurr.covered;
  if (uncovered) warnings.push(`تقويم المواسم في الحاسبة يغطي ${CALENDAR_FROM} إلى ${CALENDAR_TO} فقط؛ افحص المواسم يدويًا`);
  if ((mismatch || uncovered) && !(text(data.seasonality_note) && data.seasonality_note.trim().length >= 15)) {
    const names = [...new Set([...Object.values(seasonPrev.events), ...Object.values(seasonCurr.events)].map((e) => e.name))];
    errors.push(`الفترتان لا تغطيان المواسم نفسها (${names.join("، ") || "خارج التقويم"}); اكتب seasonality_note يشرح أثرها قبل المقارنة`);
  }

  // Decomposition.
  const dec = decompose(prev, curr);
  if (!dec.reconciled) errors.push("مجموع المساهمات لا يساوي تغير المبيعات");
  const minOrders = Math.min(prev.orders, curr.orders);
  const smallSample = minOrders < MIN_ORDERS;
  if (smallSample) warnings.push(`أقل من ${MIN_ORDERS} طلبًا في فترة واحدة على الأقل (${minOrders}); التغير قد يكون عشوائيًا`);
  const noiseBand = 2 * Math.sqrt(prev.orders + curr.orders);
  const withinNoise = Math.abs(curr.orders - prev.orders) < noiseBand;
  if (withinNoise) warnings.push(`تغير الطلبات (${curr.orders - prev.orders}) أقل من ±${r2(noiseBand)}، أي ضمن التذبذب العشوائي المعتاد لعدد الطلبات`);
  if (!Number.isNaN(asOf) && dec.returns_known && asOf - parseDate(curr.end) < 14 * DAY) warnings.push("مرتجعات الفترة الحالية قد لا تكون اكتملت بعد (أقل من 14 يومًا منذ نهايتها)");

  // Breakdowns.
  const products = Array.isArray(data.by_product) ? data.by_product : [];
  const sources = Array.isArray(data.by_source) ? data.by_source : [];
  const productRows = [];
  const tol = (v) => Math.max(1, Math.abs(v) * 0.005);
  for (const [i, row] of products.entries()) {
    const label = `by_product[${i}]`;
    if (!text(row?.product)) { errors.push(`${label}.product مطلوب`); continue; }
    for (const side of ["previous", "current"]) {
      const s = row[side];
      if (!s || !num(s.sales) || s.sales < 0) errors.push(`${label}.${side}.sales مطلوب`);
      if (s && s.units !== undefined && s.units !== null && (!num(s.units) || s.units < 0)) errors.push(`${label}.${side}.units غير صالح`);
      if (s && s.out_of_stock_days !== undefined && s.out_of_stock_days !== null && (!num(s.out_of_stock_days) || s.out_of_stock_days < 0 || s.out_of_stock_days > a.days)) errors.push(`${label}.${side}.out_of_stock_days خارج طول الفترة`);
      if (s && s.returns !== undefined && s.returns !== null && (!num(s.returns) || s.returns < 0)) errors.push(`${label}.${side}.returns غير صالح`);
    }
    const p0 = row.previous || {}, p1 = row.current || {};
    const price0 = num(p0.units) && p0.units > 0 ? p0.sales / p0.units : null;
    const price1 = num(p1.units) && p1.units > 0 ? p1.sales / p1.units : null;
    productRows.push({
      product: row.product,
      other: row.other === true,
      sales_change: r2((p1.sales ?? 0) - (p0.sales ?? 0)),
      returns_change: num(p0.returns) && num(p1.returns) ? r2(p1.returns - p0.returns) : null,
      unit_price_previous: r2(price0),
      unit_price_current: r2(price1),
      unit_price_change_pct: price0 && price1 ? r2((price1 / price0 - 1) * 100) : null,
      out_of_stock_days_previous: num(p0.out_of_stock_days) ? p0.out_of_stock_days : null,
      out_of_stock_days_current: num(p1.out_of_stock_days) ? p1.out_of_stock_days : null,
    });
  }
  if (products.length) {
    for (const side of ["previous", "current"]) {
      const sum = products.reduce((m, r) => m + (num(r?.[side]?.sales) ? r[side].sales : 0), 0);
      const target = data.periods[side].sales;
      if (Math.abs(sum - target) > tol(target)) errors.push(`مبيعات المنتجات في ${side} (${r2(sum)}) لا تساوي المجموع (${target}); أضف صف «باقي المنتجات» مع other: true`);
    }
  }
  const sourceRows = [];
  for (const [i, row] of sources.entries()) {
    const label = `by_source[${i}]`;
    if (!text(row?.source)) { errors.push(`${label}.source مطلوب`); continue; }
    if (typeof row.paid !== "boolean") errors.push(`${label}.paid يجب أن يكون true أو false`);
    for (const side of ["previous", "current"]) {
      const v = row[side]?.sessions;
      if (v !== null && (!num(v) || v < 0)) errors.push(`${label}.${side}.sessions رقم أو null`);
    }
    const s0 = row.previous?.sessions, s1 = row.current?.sessions;
    sourceRows.push({ source: row.source, paid: row.paid === true, other: row.other === true, sessions_change: num(s0) && num(s1) ? s1 - s0 : null });
  }
  if (sources.length) {
    if (!trafficBoth) errors.push("by_source فيه زيارات بينما مجموع الزيارات غير متاح؛ اجمع الزيارات في periods أو احذف التفصيل");
    else for (const side of ["previous", "current"]) {
      const values = sources.map((r) => r?.[side]?.sessions);
      if (values.every(num)) {
        const sum = values.reduce((m, v) => m + v, 0);
        const target = data.periods[side].sessions;
        if (Math.abs(sum - target) > Math.max(1, target * 0.01)) errors.push(`زيارات المصادر في ${side} (${sum}) لا تساوي المجموع (${target}); أضف صف «مصادر أخرى» مع other: true`);
      }
    }
  }

  const computed = {
    periods: { previous: a, current: b },
    change: {
      sales: curr.sales - prev.sales,
      sales_pct: prev.sales ? r2((curr.sales / prev.sales - 1) * 100) : null,
      net_sales: dec.total_change,
      net_sales_pct: a.net_sales ? r2((b.net_sales / a.net_sales - 1) * 100) : null,
      orders: curr.orders - prev.orders,
    },
    decomposition: {
      basis: dec.basis,
      contributions: Object.fromEntries(Object.entries(dec.contributions).map(([k, v]) => [k, r2(v)])),
      sum: r2(dec.sum),
      total_change: r2(dec.total_change),
      reconciled: dec.reconciled,
      main_driver: dec.main_driver,
      main_driver_share_pct: dec.main_driver_share_pct,
      ranking: dec.ranking,
    },
    sample: { min_orders: minOrders, small_sample: smallSample, orders_change_within_noise: withinNoise },
    seasonality: { previous: seasonPrev.events, current: seasonCurr.events, mismatch, calendar_covers_periods: !uncovered },
    by_product: productRows,
    by_source: sourceRows,
    must_mark_unknown: [...(dec.traffic_known ? [] : ["traffic", "conversion"]), ...(dec.returns_known ? [] : ["returns"])],
  };

  if (computeOnly) return { valid: errors.length === 0, errors, warnings, ...computed };

  // Stated diagnosis.
  const d = data.diagnosis;
  if (!d || typeof d !== "object" || Array.isArray(d)) {
    errors.push("diagnosis مفقود؛ شغّل الحاسبة بـ --compute-only أولًا ثم اكتب التشخيص");
    return { valid: false, errors, warnings, ...computed };
  }
  for (const s of strings(d)) if (PLACEHOLDER.test(s)) { errors.push(`diagnosis فيه نص قالب لم يُملأ: «${s.slice(0, 40)}»`); break; }
  if (!STATUSES.has(d.status)) errors.push("diagnosis.status يجب أن يكون diagnosed أو needs_data أو insufficient_sample");

  // Contributions must match the calculator and reconcile.
  const stated = d.contributions;
  if (stated !== undefined || d.status !== "insufficient_sample") {
    if (!stated || typeof stated !== "object") errors.push("diagnosis.contributions مطلوب");
    else {
      const want = Object.keys(dec.contributions).sort().join(","), got = Object.keys(stated).sort().join(",");
      if (want !== got) errors.push(`diagnosis.contributions يجب أن يحوي العوامل ${want} بالضبط (الموجود: ${got || "لا شيء"})`);
      const t = tol(dec.total_change);
      for (const [k, v] of Object.entries(dec.contributions)) {
        if (!num(stated[k])) continue;
        if (Math.abs(stated[k] - v) > t) errors.push(`مساهمة ${k} المكتوبة ${stated[k]} لا تطابق المحسوبة ${r2(v)}`);
      }
      const statedSum = Object.values(stated).filter(num).reduce((m, v) => m + v, 0);
      if (Math.abs(statedSum - dec.total_change) > t) errors.push(`مجموع المساهمات المكتوبة ${r2(statedSum)} لا يصالح تغير صافي المبيعات ${r2(dec.total_change)}`);
    }
  }

  const unknown = Array.isArray(d.unknown) ? d.unknown : null;
  if (!unknown) errors.push("diagnosis.unknown قائمة مطلوبة (فارغة إذا كانت كل البيانات متاحة)");
  else for (const u of unknown) if (!UNKNOWN_VALUES.has(u)) errors.push(`diagnosis.unknown قيمة غير معروفة: ${u}`);
  for (const u of computed.must_mark_unknown) if (unknown && !unknown.includes(u)) errors.push(`بيانات ${u} غير متاحة ويجب ذكرها في diagnosis.unknown بدل افتراضها`);
  if (!Array.isArray(d.missing_data) || d.missing_data.some((m) => !text(m))) errors.push("diagnosis.missing_data قائمة نصوص مطلوبة");
  else if (computed.must_mark_unknown.length && d.missing_data.length === 0) errors.push("diagnosis.missing_data فارغة مع وجود بيانات غير متاحة");
  if (!text(d.cause) || d.cause.trim().length < 15) errors.push("diagnosis.cause جملة واضحة مطلوبة");
  if (!text(d.next_step) || d.next_step.trim().length < 15) errors.push("diagnosis.next_step خطوة واحدة واضحة مطلوبة");
  else if (/\n|(^|\s)[12][.)]\s/.test(d.next_step)) errors.push("diagnosis.next_step خطوة واحدة فقط، لا قائمة");
  if (d.handoff !== null && !HANDOFFS.has(d.handoff)) errors.push(`diagnosis.handoff «${d.handoff}» ليس من المهارات المنشورة: ${[...HANDOFFS].join("، ")}`);

  const claims = [d.cause, ...(Array.isArray(d.evidence) ? d.evidence : [])].filter(text);
  if (!dec.traffic_known && claims.some((c) => TRAFFIC_CLAIM.some((re) => re.test(c)))) errors.push("السبب أو الدليل يتكلم عن تغير الزيارات بينما بيانات الزيارات غير متاحة");
  const allText = strings(d);
  if (allText.some((s) => BENCHMARK.test(s))) errors.push("لا تستخدم متوسطات سوق أو معايير غير موثقة؛ قارن المتجر بنفسه");
  if (allText.some((s) => EXECUTED.test(s))) errors.push("المهارة تحلل وتوصي فقط؛ لا تذكر تنفيذ تغيير في المتجر أو الإنفاق");
  if (text(d.cause) && /خوارزمي/.test(d.cause)) errors.push("«الخوارزمية» ليست سببًا قابلًا للقياس من بيانات المتجر");

  const drill = d.drilldown === undefined ? [] : d.drilldown;
  if (!Array.isArray(drill)) errors.push("diagnosis.drilldown قائمة");

  if (d.status === "insufficient_sample") {
    if (!smallSample) errors.push(`insufficient_sample لا ينطبق: كل فترة فيها ${MIN_ORDERS} طلبًا أو أكثر`);
    if (d.main_driver != null || d.cause_type != null || d.handoff != null || (Array.isArray(drill) && drill.length)) errors.push("مع عينة صغيرة: main_driver وcause_type وhandoff تكون null والتفصيل فارغ");
    return finish();
  }
  if (smallSample) errors.push(`أقل من ${MIN_ORDERS} طلبًا في فترة (${minOrders}): التغير قد يكون عشوائيًا؛ الحالة يجب أن تكون insufficient_sample بلا سبب`);

  // Main driver.
  if (!(d.main_driver in dec.contributions)) errors.push(`diagnosis.main_driver يجب أن يكون أحد: ${Object.keys(dec.contributions).join("، ")}`);
  else if (d.main_driver !== dec.main_driver) errors.push(`main_driver «${d.main_driver}» ليس أكبر مساهم في اتجاه التغير؛ المحسوب «${dec.main_driver}»`);
  if (!dec.traffic_known && ["sessions", "conversion"].includes(d.main_driver)) errors.push("لا يمكن أن يكون المحرك الزيارات أو التحويل بلا بيانات زيارات");

  // Drill-down: at most two drivers, the first is the main one.
  if (Array.isArray(drill)) {
    if (drill.length > 2) errors.push("فصّل في محركين على الأكثر");
    if (drill.length && drill[0]?.driver !== d.main_driver) errors.push("أول تفصيل يجب أن يكون للمحرك الرئيسي");
    for (const [i, item] of drill.entries()) {
      const label = `drilldown[${i}]`;
      if (!(item?.driver in dec.contributions)) { errors.push(`${label}.driver غير صالح`); continue; }
      if (item.by === "source") {
        if (item.driver !== "sessions") { errors.push(`${label}: التفصيل حسب المصدر يفسر الزيارات فقط`); continue; }
        const row = sourceRows.find((r) => r.source === item.key);
        if (!row || row.other) { errors.push(`${label}.key «${item.key}» ليس مصدرًا مسمى في by_source`); continue; }
        const sign = Math.sign(dec.contributions.sessions);
        const best = sourceRows.filter((r) => !r.other && r.sessions_change !== null).sort((x, y) => sign * (y.sessions_change - x.sessions_change))[0];
        if (!best || best.source !== item.key) errors.push(`${label}: «${item.key}» ليس المصدر الأكبر تغيرًا في الزيارات${best ? `؛ الأكبر «${best.source}»` : ""}`);
      } else if (item.by === "product") {
        const row = productRows.find((r) => r.product === item.key);
        if (!row || row.other) { errors.push(`${label}.key «${item.key}» ليس منتجًا مسمى في by_product`); continue; }
        const useReturns = item.driver === "returns";
        const field = useReturns ? "returns_change" : "sales_change";
        const sign = useReturns ? -Math.sign(dec.contributions.returns) : Math.sign(dec.contributions[item.driver]);
        const best = productRows.filter((r) => !r.other && r[field] !== null).sort((x, y) => sign * (y[field] - x[field]))[0];
        if (!best || best.product !== item.key) errors.push(`${label}: «${item.key}» ليس المنتج الأكبر أثرًا${best ? `؛ الأكبر «${best.product}»` : ""}`);
      } else errors.push(`${label}.by يجب أن يكون source أو product`);
    }
  }

  // Cause.
  const mainDrill = Array.isArray(drill) ? drill[0] : undefined;
  if (d.status === "needs_data") {
    if (d.cause_type != null) errors.push("needs_data: لا تسمِّ سببًا (cause_type = null) حتى تصل البيانات الناقصة");
    if (!Array.isArray(d.missing_data) || !d.missing_data.length) errors.push("needs_data تحتاج قائمة بالبيانات الناقصة");
    return finish();
  }
  if (d.status === "diagnosed") {
    if (!CAUSE_TYPES.has(d.cause_type)) errors.push(`diagnosis.cause_type يجب أن يكون أحد: ${[...CAUSE_TYPES].join("، ")}`);
    else if (d.main_driver in CAUSES_BY_DRIVER && !CAUSES_BY_DRIVER[d.main_driver].includes(d.cause_type)) errors.push(`السبب ${d.cause_type} لا يفسر المحرك ${d.main_driver}`);
    if (!Array.isArray(d.evidence) || !d.evidence.some(text)) errors.push("diagnosis.evidence دليل واحد على الأقل");
    if (!Array.isArray(d.counter_evidence) || !d.counter_evidence.some(text)) errors.push("diagnosis.counter_evidence مطلوب: اذكر ما يعاكس السبب أو يضعفه");
    const needsProduct = ["product", "stockout", "price"].includes(d.cause_type);
    if (needsProduct && mainDrill?.by !== "product") errors.push(`السبب ${d.cause_type} يحتاج تفصيلًا حسب المنتج للمحرك الرئيسي`);
    if (d.cause_type === "traffic_source" && mainDrill?.by !== "source") errors.push("السبب traffic_source يحتاج تفصيلًا حسب المصدر");
    const product = needsProduct && mainDrill?.by === "product" ? productRows.find((r) => r.product === mainDrill.key) : null;
    if (product && d.cause_type === "stockout") {
      const o0 = product.out_of_stock_days_previous, o1 = product.out_of_stock_days_current;
      if (o0 === null || o1 === null) errors.push("سبب النفاد يحتاج أيام النفاد للفترتين من سجل المخزون؛ ربط زد يعرض المخزون الحالي فقط");
      else if (dec.total_change < 0 ? !(o1 > o0) : !(o0 > o1)) errors.push(`أيام نفاد «${product.product}» لم تتغير في اتجاه يفسر التغير (${o0} ← ${o1})`);
    }
    if (product && d.cause_type === "price") {
      const c = product.unit_price_change_pct;
      if (c === null || Math.abs(c) < PRICE_CHANGE_MIN * 100) errors.push(`سعر وحدة «${product.product}» لم يتغير ${PRICE_CHANGE_MIN * 100}٪ أو أكثر؛ لا يكفي لاعتباره السبب`);
    }
    if (d.cause_type in REQUIRED_HANDOFF && d.handoff !== REQUIRED_HANDOFF[d.cause_type]) errors.push(`السبب ${d.cause_type} يُحال إلى ${REQUIRED_HANDOFF[d.cause_type]}`);
    if (d.cause_type === "traffic_source" && mainDrill?.by === "source") {
      const row = sourceRows.find((r) => r.source === mainDrill.key);
      if (row?.paid && d.handoff !== "audit-paid-campaign-readiness") errors.push("تراجع مصدر مدفوع يُحال إلى audit-paid-campaign-readiness");
      if (row && !row.paid && d.handoff === "audit-paid-campaign-readiness") errors.push("المصدر غير مدفوع؛ لا تحِله إلى فحص الحملة المدفوعة");
    }
  }
  return finish();

  function finish() {
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stated: { status: d.status ?? null, main_driver: d.main_driver ?? null, cause_type: d.cause_type ?? null, handoff: d.handoff ?? null },
      ...computed,
    };
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const args = process.argv.slice(2);
  const computeOnly = args.includes("--compute-only");
  const inputPath = args.find((x) => !x.startsWith("--"));
  if (!inputPath) {
    console.error("الاستخدام: node scripts/diagnose.mjs <diagnosis.json|-> [--compute-only]");
    process.exit(2);
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(inputPath === "-" ? 0 : inputPath, "utf8"));
  } catch (error) {
    console.error(`تعذر قراءة JSON: ${error.message}`);
    process.exit(2);
  }
  const result = diagnose(data, { computeOnly });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid ? 0 : 1);
}
