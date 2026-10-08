#!/usr/bin/env node
// Checks a campaign readiness file and computes the decision from its checks.
// Usage: node scripts/evaluate-campaign.mjs <campaign.json|->

import fs from "node:fs";
import { fileURLToPath } from "node:url";

// Order = fix priority inside each group. kill: a failure means this campaign must not run as designed.
// scope: "public" can be verified from the public landing page; "internal" needs Zid, the ad account or a test purchase.
export const CHECKS = [
  { id: "offer.defined", critical: true, kill: true, scope: "internal", sources: ["merchant", "zid_dashboard", "public_url"] },
  { id: "offer.discount_licence", critical: "discount_offer", scope: "internal", sources: ["merchant", "public_url"] },
  { id: "ad.policy_claims", critical: true, kill: true, scope: "internal", sources: ["ads_platform", "merchant", "public_url"] },
  { id: "ad.influencer_licence", critical: "uses_influencer", kill: true, scope: "internal", sources: ["merchant", "public_url"] },
  { id: "landing.loads_right_page", critical: true, scope: "public", sources: ["public_url", "merchant"] },
  { id: "landing.message_match", critical: true, scope: "public", sources: ["public_url", "merchant"] },
  { id: "landing.price_matches", critical: true, scope: "public", sources: ["public_url", "merchant", "test_purchase"] },
  { id: "landing.cta_to_checkout", critical: true, scope: "public", sources: ["public_url", "test_purchase"] },
  { id: "landing.mobile_rtl", critical: true, scope: "public", sources: ["public_url", "merchant", "test_purchase"] },
  { id: "stock.covers_campaign", critical: true, scope: "internal", sources: ["zid_dashboard"] },
  { id: "measurement.pixel_installed", critical: true, scope: "internal", sources: ["zid_dashboard", "ads_platform"] },
  { id: "measurement.purchase_event_verified", critical: true, scope: "internal", sources: ["test_purchase", "ads_platform"], needsOrderId: true },
  { id: "measurement.zid_order_visible", critical: true, scope: "internal", sources: ["zid_dashboard"], needsOrderId: true },
  { id: "budget.daily_cap_set", critical: true, scope: "internal", sources: ["ads_platform", "merchant"] },
  { id: "landing.policies_visible", critical: false, scope: "public", sources: ["public_url", "merchant"] },
  { id: "ad.creative_specs", critical: false, scope: "internal", sources: ["merchant", "ads_platform"] },
  { id: "ops.support_ready", critical: false, scope: "internal", sources: ["merchant"] },
];

const CHANNELS = new Set(["snapchat", "tiktok", "meta", "google"]);
const OFFER_TYPES = new Set(["discount", "free_shipping", "bundle", "gift", "none"]);
const STATUSES = new Set(["passed", "failed", "not_tested", "not_applicable"]);
const SOURCES = new Set(["public_url", "test_purchase", "ads_platform", "zid_dashboard", "merchant"]);
const DECISIONS = new Set(["run", "fix_first", "dont_run"]);
const MAX_EVIDENCE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const OFFSET_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?([+-]\d{2}:\d{2}|Z)$/;
const PLACEHOLDER = /…|\.\.\.|^\s*\[.*\]\s*$|TODO|<[^>]+>/;

const text = (value) => typeof value === "string" && value.trim().length > 0;
const time = (value) => (typeof value === "string" && OFFSET_TIME.test(value) ? Date.parse(value) : Number.NaN);
const num = (value) => typeof value === "number" && Number.isFinite(value);

function findPlaceholders(value, pathLabel, found) {
  if (typeof value === "string") { if (PLACEHOLDER.test(value)) found.push(pathLabel); return; }
  if (Array.isArray(value)) { value.forEach((item, index) => findPlaceholders(item, `${pathLabel}[${index}]`, found)); return; }
  if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) findPlaceholders(item, pathLabel ? `${pathLabel}.${key}` : key, found);
}

export function evaluateCampaign(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, errors: ["الجذر يجب أن يكون كائن JSON"] };
  }

  const placeholders = [];
  findPlaceholders(data, "", placeholders);
  for (const where of placeholders) errors.push(`${where} ما زال نصًا نموذجيًا غير معبأ`);

  const campaign = data.campaign ?? {};
  for (const field of ["store_url", "landing_url"]) {
    if (!text(campaign[field]) || !/^https:\/\//.test(campaign[field])) errors.push(`campaign.${field} مفقود أو ليس رابط https`);
  }
  if (!CHANNELS.has(campaign.channel)) errors.push("campaign.channel يجب أن يكون snapchat أو tiktok أو meta أو google");
  if (!text(campaign.creative_summary)) errors.push("campaign.creative_summary مطلوب: ماذا يقول الإعلان ويعرض");
  if (typeof campaign.uses_influencer !== "boolean") errors.push("campaign.uses_influencer يجب أن يكون true أو false");
  if (!Number.isInteger(campaign.stock_units) || campaign.stock_units < 0) errors.push("campaign.stock_units يجب أن يكون عددًا صحيحًا غير سالب");
  const startsAt = time(campaign.starts_at);
  if (Number.isNaN(startsAt)) errors.push("campaign.starts_at يجب أن يكون وقتًا بإزاحة مثل 2026-10-01T20:00:00+03:00");

  const offer = campaign.offer ?? {};
  if (!OFFER_TYPES.has(offer.type)) errors.push("campaign.offer.type يجب أن يكون discount أو free_shipping أو bundle أو gift أو none");
  if (offer.type && offer.type !== "none") {
    if (!text(offer.summary)) errors.push("campaign.offer.summary مطلوب لوصف العرض وشروطه");
    const endsAt = time(offer.ends_at);
    if (Number.isNaN(endsAt)) errors.push("campaign.offer.ends_at يحتاج تاريخًا كاملًا بالسنة والإزاحة");
    else if (!Number.isNaN(startsAt) && endsAt <= startsAt) errors.push("العرض ينتهي قبل بدء الحملة أو معها");
  }

  const decisionAt = time(data.decision_at);
  if (Number.isNaN(decisionAt)) errors.push("decision_at يجب أن يكون وقتًا بإزاحة");

  // Budget and stop rule: required whatever the decision.
  const budget = data.budget ?? {};
  if (!num(budget.daily_cap_sar) || budget.daily_cap_sar <= 0) errors.push("budget.daily_cap_sar مطلوب: حد يومي بالريال أكبر من صفر");
  if (!num(budget.total_cap_sar) || budget.total_cap_sar <= 0) errors.push("budget.total_cap_sar مطلوب بالريال");
  else if (num(budget.daily_cap_sar) && budget.total_cap_sar < budget.daily_cap_sar) errors.push("budget.total_cap_sar أقل من الحد اليومي");
  if (!num(budget.margin_per_order_sar)) errors.push("budget.margin_per_order_sar مطلوب: ربح الطلب بعد الخصم والشحن وقبل الإعلان");
  if (!Number.isInteger(budget.expected_orders) || budget.expected_orders < 1) errors.push("budget.expected_orders يجب أن يكون عددًا صحيحًا من 1 فأكثر");
  const loses = num(budget.margin_per_order_sar) && budget.margin_per_order_sar <= 0;

  const stop = data.stop_rule ?? {};
  if (!num(stop.max_cpa_sar) || stop.max_cpa_sar <= 0) errors.push("stop_rule.max_cpa_sar مطلوب: أعلى تكلفة لطلب مؤكد في زد قبل الإيقاف");
  else if (num(budget.margin_per_order_sar) && !loses && stop.max_cpa_sar > budget.margin_per_order_sar) errors.push("stop_rule.max_cpa_sar أعلى من ربح الطلب؛ كل طلب سيخسر");
  if (!num(stop.spend_without_order_sar) || stop.spend_without_order_sar <= 0) errors.push("stop_rule.spend_without_order_sar مطلوب: المبلغ الذي يوقف الإعلان إن لم يأتِ طلب");
  else if (num(budget.daily_cap_sar) && stop.spend_without_order_sar > budget.daily_cap_sar) errors.push("stop_rule.spend_without_order_sar يتجاوز الحد اليومي");
  for (const field of ["owner", "action"]) if (!text(stop[field])) errors.push(`stop_rule.${field} مطلوب`);

  const testOrderId = text(data.test_order_id) ? data.test_order_id.trim() : null;
  const conditions = { discount_offer: offer.type === "discount", uses_influencer: campaign.uses_influencer === true };

  const provided = new Map();
  for (const [index, check] of (Array.isArray(data.checks) ? data.checks : []).entries()) {
    const label = check?.id ? `checks.${check.id}` : `checks[${index}]`;
    if (!CHECKS.some((known) => known.id === check?.id)) { errors.push(`${label} معرّف غير معروف`); continue; }
    if (provided.has(check.id)) { errors.push(`${label} مكرر`); continue; }
    provided.set(check.id, check);
  }
  if (!Array.isArray(data.checks)) errors.push("checks يجب أن تكون قائمة");

  const kills = [];
  const blockers = [];
  const gaps = [];
  const split = { verified_by_source: Object.fromEntries([...SOURCES].map((source) => [source, []])), needs_internal_testing: [], public_page_issues: [] };

  for (const known of CHECKS) {
    const check = provided.get(known.id);
    const label = `checks.${known.id}`;
    if (!check) { errors.push(`${label} مفقود؛ كل فحوصات القائمة مطلوبة`); continue; }
    if (!STATUSES.has(check.status)) { errors.push(`${label}.status غير صالحة`); continue; }

    const conditional = typeof known.critical === "string";
    const applies = !conditional || conditions[known.critical];
    const critical = conditional ? applies : known.critical;

    if (check.status === "not_applicable") {
      if (applies) errors.push(`${label} لا يكون not_applicable هنا`);
      continue;
    }
    if (!applies) { errors.push(`${label} يجب أن يكون not_applicable لأن شرطه غير متحقق`); continue; }

    if (check.status === "passed") {
      const evidence = check.evidence;
      if (!SOURCES.has(evidence?.source)) errors.push(`${label}.evidence.source غير صالح`);
      else if (!known.sources.includes(evidence.source)) errors.push(`${label} لا يثبت بمصدر ${evidence.source}؛ المقبول: ${known.sources.join("، ")}`);
      if (!text(evidence?.detail) || evidence.detail.trim().length < 12) errors.push(`${label}.evidence.detail يحتاج وصفًا محددًا للدليل`);
      const checkedAt = time(evidence?.checked_at);
      if (Number.isNaN(checkedAt)) errors.push(`${label}.evidence.checked_at يحتاج وقتًا بإزاحة`);
      else if (!Number.isNaN(decisionAt)) {
        if (checkedAt > decisionAt) errors.push(`${label} دليله بعد وقت القرار`);
        else if (decisionAt - checkedAt > MAX_EVIDENCE_AGE_MS) errors.push(`${label} دليله أقدم من 7 أيام؛ أعد الفحص`);
      }
      if (known.needsOrderId) {
        if (!testOrderId) errors.push(`${label} ناجح بلا test_order_id؛ لا يثبت القياس إلا طلب اختبار`);
        else if (text(evidence?.detail) && !evidence.detail.includes(testOrderId)) errors.push(`${label} دليله لا يذكر طلب الاختبار ${testOrderId}`);
      }
      if (known.id === "stock.covers_campaign" && Number.isInteger(campaign.stock_units) && Number.isInteger(budget.expected_orders) && campaign.stock_units < budget.expected_orders) {
        errors.push(`${label} ناجح لكن المخزون ${campaign.stock_units} أقل من الطلبات المتوقعة ${budget.expected_orders}`);
      }
      if (SOURCES.has(evidence?.source)) split.verified_by_source[evidence.source].push(known.id);
      continue;
    }

    // failed or not_tested
    split[known.scope === "public" ? "public_page_issues" : "needs_internal_testing"].push(known.id);
    const fix = check.fix;
    if (!text(fix?.summary) || !text(fix?.owner)) errors.push(`${label}.fix يحتاج summary وowner`);
    const entry = { id: known.id, status: check.status, critical, fix: fix?.summary ?? null, owner: fix?.owner ?? null };
    if (critical && known.kill && check.status === "failed") { kills.push(entry); continue; }
    if (critical) { blockers.push(entry); continue; }
    const dueAt = time(fix?.due_at);
    if (Number.isNaN(dueAt)) errors.push(`${label}.fix.due_at يحتاج وقتًا بإزاحة`);
    else if (!Number.isNaN(decisionAt) && dueAt <= decisionAt) errors.push(`${label}.fix.due_at يجب أن يكون بعد وقت القرار`);
    gaps.push({ ...entry, due_at: fix?.due_at ?? null });
  }

  const reasons = [];
  if (loses) reasons.push("ربح الطلب صفر أو أقل قبل الإعلان؛ كل طلب مدفوع سيخسر");
  for (const kill of kills) reasons.push(`${kill.id} فشل، ولا يُشغَّل هذا الإعلان بصيغته الحالية`);
  for (const blocker of blockers) reasons.push(`${blocker.id} حرج وحالته ${blocker.status}`);

  const computed = loses || kills.length ? "dont_run" : blockers.length ? "fix_first" : "run";
  const order = (list) => list.map((item) => item.id);
  const fixOrder = [...order(kills), ...order(blockers.filter((b) => b.status === "failed")), ...order(blockers.filter((b) => b.status === "not_tested")), ...order(gaps.filter((g) => g.status === "failed")), ...order(gaps.filter((g) => g.status === "not_tested"))];

  if (!DECISIONS.has(data.decision)) errors.push("decision يجب أن يكون run أو fix_first أو dont_run");
  else if (data.decision !== computed) errors.push(`decision «${data.decision}» لا يطابق القرار المحسوب «${computed}»`);

  return {
    valid: errors.length === 0,
    computed_decision: computed,
    stated_decision: data.decision ?? null,
    reasons,
    fix_order: fixOrder,
    kills,
    blockers,
    gaps,
    evidence_split: split,
    errors,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("الاستخدام: node scripts/evaluate-campaign.mjs <campaign.json|->");
    process.exit(2);
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(inputPath === "-" ? 0 : inputPath, "utf8"));
  } catch (error) {
    console.error(`تعذر قراءة JSON: ${error.message}`);
    process.exit(2);
  }
  const result = evaluateCampaign(data);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid ? 0 : 1);
}
