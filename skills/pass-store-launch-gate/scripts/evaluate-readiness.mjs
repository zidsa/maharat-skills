#!/usr/bin/env node
// Checks a readiness file and computes the launch decision from its checks.
// Usage: node scripts/evaluate-readiness.mjs <readiness.json|->

import fs from "node:fs";

export const CHECKS = [
  { id: "products.catalog_ready", critical: true },
  { id: "products.stock_set", critical: true },
  { id: "products.options_complete", critical: false },
  { id: "payment.methods_active", critical: true },
  { id: "payment.test_order_paid", critical: true },
  { id: "shipping.method_active", critical: true },
  { id: "shipping.fulfilment_tried", critical: false },
  { id: "policies.returns_published", critical: true },
  { id: "policies.shipping_published", critical: true },
  { id: "policies.contact_working", critical: true },
  { id: "policies.business_identity", critical: true },
  { id: "policies.vat_display", critical: "vat_registered" },
  { id: "policies.privacy_published", critical: false },
  { id: "storefront.mobile_checkout", critical: true },
  { id: "storefront.navigation_works", critical: false },
  { id: "measurement.orders_visible", critical: true },
  { id: "measurement.ads_pixel", critical: "paid_campaign_at_launch" },
];

const STATUSES = new Set(["passed", "failed", "not_tested", "not_applicable"]);
const SOURCES = new Set(["zid_mcp", "public_url", "zid_dashboard", "test_order", "merchant"]);
const DECISIONS = new Set(["launch", "conditional_launch", "postpone"]);
const MAX_EVIDENCE_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const OFFSET_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?([+-]\d{2}:\d{2}|Z)$/;

const text = (value) => typeof value === "string" && value.trim().length > 0;
const time = (value) => (typeof value === "string" && OFFSET_TIME.test(value) ? Date.parse(value) : Number.NaN);

export function evaluateReadiness(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, errors: ["الجذر يجب أن يكون كائن JSON"] };
  }

  if (!text(data.store?.url) || !/^https:\/\//.test(data.store.url)) errors.push("store.url مفقود أو ليس رابط https");
  const decisionAt = time(data.decision_at);
  if (Number.isNaN(decisionAt)) errors.push("decision_at يجب أن يكون وقتًا بإزاحة مثل 2026-09-28T10:00:00+03:00");
  if (Number.isNaN(time(data.launch_at))) errors.push("launch_at يجب أن يكون وقتًا بإزاحة");
  for (const flag of ["vat_registered", "paid_campaign_at_launch"]) {
    if (typeof data[flag] !== "boolean") errors.push(`${flag} يجب أن يكون true أو false`);
  }

  const provided = new Map();
  for (const [index, check] of (Array.isArray(data.checks) ? data.checks : []).entries()) {
    const label = check?.id ? `checks.${check.id}` : `checks[${index}]`;
    if (!CHECKS.some((known) => known.id === check?.id)) { errors.push(`${label} معرّف غير معروف`); continue; }
    if (provided.has(check.id)) { errors.push(`${label} مكرر`); continue; }
    provided.set(check.id, check);
  }
  if (!Array.isArray(data.checks)) errors.push("checks يجب أن تكون قائمة");

  const blockers = [];
  const conditions = [];
  for (const known of CHECKS) {
    const check = provided.get(known.id);
    const label = `checks.${known.id}`;
    if (!check) { errors.push(`${label} مفقود؛ كل فحوصات القائمة مطلوبة`); continue; }
    if (!STATUSES.has(check.status)) { errors.push(`${label}.status غير صالحة`); continue; }

    const conditional = typeof known.critical === "string";
    const applies = !conditional || data[known.critical] === true;
    const critical = conditional ? applies : known.critical;

    if (check.status === "not_applicable") {
      if (applies) errors.push(`${label} لا يكون not_applicable هنا`);
      continue;
    }
    if (conditional && !applies) {
      errors.push(`${label} يجب أن يكون not_applicable لأن شرطه غير متحقق`);
      continue;
    }

    if (check.status === "passed") {
      const evidence = check.evidence;
      if (!SOURCES.has(evidence?.source)) errors.push(`${label}.evidence.source غير صالح`);
      if (!text(evidence?.detail) || evidence.detail.trim().length < 8) errors.push(`${label}.evidence.detail يحتاج وصفًا للدليل`);
      const checkedAt = time(evidence?.checked_at);
      if (Number.isNaN(checkedAt)) errors.push(`${label}.evidence.checked_at يحتاج وقتًا بإزاحة`);
      else if (!Number.isNaN(decisionAt)) {
        if (checkedAt > decisionAt) errors.push(`${label} دليله بعد وقت القرار`);
        else if (decisionAt - checkedAt > MAX_EVIDENCE_AGE_MS) errors.push(`${label} دليله أقدم من 14 يومًا؛ أعد الفحص`);
      }
      if (known.id === "payment.test_order_paid" && evidence?.source !== "test_order") {
        errors.push(`${label} لا ينجح إلا بطلب تجريبي حقيقي (source: test_order)`);
      }
      continue;
    }

    // failed or not_tested
    if (critical) {
      blockers.push({ id: known.id, status: check.status, note: text(check.note) ? check.note : null });
      continue;
    }
    const fix = check.fix;
    if (!text(fix?.summary) || !text(fix?.owner)) errors.push(`${label}.fix يحتاج summary وowner`);
    const dueAt = time(fix?.due_at);
    if (Number.isNaN(dueAt)) errors.push(`${label}.fix.due_at يحتاج وقتًا بإزاحة`);
    else if (!Number.isNaN(decisionAt) && dueAt <= decisionAt) errors.push(`${label}.fix.due_at يجب أن يكون بعد وقت القرار`);
    conditions.push({ id: known.id, status: check.status, owner: fix?.owner ?? null, due_at: fix?.due_at ?? null });
  }

  const computed = blockers.length ? "postpone" : conditions.length ? "conditional_launch" : "launch";
  if (!DECISIONS.has(data.decision)) errors.push("decision يجب أن يكون launch أو conditional_launch أو postpone");
  else if (data.decision !== computed) errors.push(`decision «${data.decision}» لا يطابق القرار المحسوب «${computed}»`);

  if (computed !== "postpone") {
    const plan = data.rollback_plan;
    for (const field of ["trigger", "owner", "action"]) {
      if (!text(plan?.[field])) errors.push(`rollback_plan.${field} مطلوب قبل الافتتاح`);
    }
  }

  return {
    valid: errors.length === 0,
    computed_decision: computed,
    stated_decision: data.decision ?? null,
    blockers,
    conditions,
    errors,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("الاستخدام: node scripts/evaluate-readiness.mjs <readiness.json|->");
    process.exit(2);
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(inputPath === "-" ? 0 : inputPath, "utf8"));
  } catch (error) {
    console.error(`تعذر قراءة JSON: ${error.message}`);
    process.exit(2);
  }
  const result = evaluateReadiness(data);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid ? 0 : 1);
}
