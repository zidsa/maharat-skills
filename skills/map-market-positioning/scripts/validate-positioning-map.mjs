#!/usr/bin/env node

import fs from "node:fs";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("الاستخدام: node scripts/validate-positioning-map.mjs <market.json|->");
  process.exit(2);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(inputPath === "-" ? 0 : inputPath, "utf8"));
} catch (error) {
  console.error(`تعذر قراءة JSON: ${error.message}`);
  process.exit(2);
}

const errors = [];
const today = new Date().toISOString().slice(0, 10);
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const requiredText = (value, label, min = 4) => {
  if (typeof value !== "string" || value.trim().length < min) errors.push(`${label} مفقود أو مختصر جدًا`);
};
const parseCalendarDate = (value, label) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) {
    errors.push(`${label} ليس تاريخًا صالحًا`);
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    errors.push(`${label} ليس تاريخًا تقويميًا صالحًا`);
    return null;
  }
  return value;
};
const validObservedDate = (value, label) => {
  const parsed = parseCalendarDate(value, label);
  if (parsed && parsed > today) errors.push(`${label} يقع في المستقبل`);
};
const validDueDate = (value, label) => {
  const parsed = parseCalendarDate(value, label);
  if (parsed && parsed < today) errors.push(`${label} موعد اختبار منقضٍ`);
};
const validUrl = (value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};
const validEvidenceRef = (value) => {
  if (validUrl(value)) return true;
  if (typeof value !== "string") return false;
  const [resource, anchor, ...rest] = value.split("#");
  return rest.length === 0 && resource?.includes("/") && resource.trim().length >= 5 && anchor?.trim().length >= 3;
};
const requireEvidenceRefs = (value, label) => {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${label} مطلوب`);
    return;
  }
  for (const [index, ref] of value.entries()) {
    if (!validEvidenceRef(ref)) errors.push(`${label}[${index}] يجب أن يكون رابط HTTPS أو مرجعًا داخليًا مع #`);
  }
};
const storeEvidenceDomains = Array.isArray(data?.market_scope?.store_evidence_domains)
  ? data.market_scope.store_evidence_domains.map((domain) => String(domain).trim().toLowerCase())
  : [];
const validStoreDomain = (domain) => /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain);
const isStoreEvidenceRef = (value) => {
  if (typeof value !== "string") return false;
  if (value.startsWith("store/")) return validEvidenceRef(value);
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return storeEvidenceDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
};
const requireStoreEvidenceRefs = (value, label) => {
  requireEvidenceRefs(value, label);
  if (Array.isArray(value)) {
    for (const [index, ref] of value.entries()) {
      if (validEvidenceRef(ref) && !isStoreEvidenceRef(ref)) errors.push(`${label}[${index}] ليس من نطاقات دليل المتجر ولا يبدأ بـ store/`);
    }
  }
};
const unknownSentinels = new Set(["unknown", "غير معروف", "غير متاح", ""]);
const isKnownValue = (value) => {
  if (value === null || value === undefined) return false;
  return !unknownSentinels.has(String(value).trim().toLowerCase());
};
const superlativePattern = /(?:ال)?(?:أفضل|أرخص|أسرع|أوفر|أثبت|وحيد|أقوى|أضمن|أكثر)|أعلى\s+جودة|رقم\s*[1١]/gi;
const exclusiveClaimPattern = /الخيار\s+الأول|بلا\s+منافس|لا\s+يضاهى|لا\s+مثيل|لا\s+بديل|الأول\s+في\s+السوق/;
const containsUnsupportedSuperlative = (text) => {
  if (typeof text !== "string") return false;
  const withoutQuantitativeComparisons = text.replace(/أكثر\s+من\s+[0-9٠-٩]+/g, "");
  if (exclusiveClaimPattern.test(withoutQuantitativeComparisons)) return true;
  for (const match of withoutQuantitativeComparisons.matchAll(superlativePattern)) {
    const prefix = text.slice(Math.max(0, match.index - 45), match.index);
    const negated = /(?:لا\s+(?:ننافس|ندعي|نعد|نعتمد|تبحث|نبحث|تختار|نختار)(?:\s+بأننا)?(?:\s+(?:على|عن))?|لسنا)\s*$/i.test(prefix);
    if (!negated) return true;
  }
  return false;
};

if (!isObject(data)) {
  console.error("- الجذر يجب أن يكون كائن JSON يمثل خريطة سوق");
  process.exit(1);
}

if (!isObject(data.market_scope)) errors.push("market_scope يجب أن يكون كائنًا");
for (const key of ["country", "segment", "job_or_occasion"]) requiredText(data.market_scope?.[key], `market_scope.${key}`);
requiredText(data.market_scope?.currency, "market_scope.currency", 3);
requiredText(data.market_scope?.price_basis, "market_scope.price_basis", 8);
if (storeEvidenceDomains.length === 0 || storeEvidenceDomains.some((domain) => !validStoreDomain(domain))) errors.push("market_scope.store_evidence_domains يجب أن يحتوي نطاق متجر صالحًا واحدًا على الأقل دون https://");
validObservedDate(data.market_scope?.observed_at, "market_scope.observed_at");

const criteria = Array.isArray(data.criteria) ? data.criteria : [];
const alternatives = Array.isArray(data.alternatives) ? data.alternatives : [];
const comparisons = Array.isArray(data.comparisons) ? data.comparisons : [];

if (!Array.isArray(data.criteria) || criteria.length < 2) errors.push("أضف معيارين على الأقل مشتقين من دليل عميل");
const criterionIds = new Set();
for (const [index, criterion] of criteria.entries()) {
  const label = `المعيار ${index + 1}`;
  if (!isObject(criterion)) {
    errors.push(`${label}: يجب أن يكون كائنًا`);
    continue;
  }
  requiredText(criterion.id, `${label}.id`);
  requiredText(criterion.label, `${label}.label`);
  requiredText(criterion.why_it_matters, `${label}.why_it_matters`, 8);
  if (!validEvidenceRef(criterion.evidence_ref)) errors.push(`${label}.evidence_ref يجب أن يكون رابط HTTPS أو مرجعًا داخليًا مع #`);
  if (criterionIds.has(criterion.id)) errors.push(`${label}: id مكرر`);
  criterionIds.add(criterion.id);
}

if (!Array.isArray(data.alternatives) || alternatives.length < 2) errors.push("أضف بديلين على الأقل بدل بناء تموضع من مقارنة واحدة");
const alternativeIds = new Set();
const types = new Set(["direct", "indirect", "do_nothing"]);
for (const [index, alternative] of alternatives.entries()) {
  const label = `البديل ${index + 1}`;
  if (!isObject(alternative)) {
    errors.push(`${label}: يجب أن يكون كائنًا`);
    continue;
  }
  requiredText(alternative.id, `${label}.id`);
  requiredText(alternative.name, `${label}.name`);
  requiredText(alternative.offer, `${label}.offer`, 8);
  if (!types.has(alternative.type)) errors.push(`${label}.type يجب أن يكون direct أو indirect أو do_nothing`);
  if (alternative.type !== "do_nothing" && !validUrl(alternative.source_url)) errors.push(`${label}.source_url يجب أن يكون رابط HTTPS للبديل`);
  if (alternative.type === "do_nothing" && alternative.source_url && !validUrl(alternative.source_url)) errors.push(`${label}.source_url إن وجد يجب أن يكون رابط HTTPS`);
  validObservedDate(alternative.observed_at, `${label}.observed_at`);
  if (alternativeIds.has(alternative.id)) errors.push(`${label}: id مكرر`);
  alternativeIds.add(alternative.id);
  requireEvidenceRefs(alternative.proof_refs, `${label}.proof_refs`);
  if (!Array.isArray(alternative.limitations) || alternative.limitations.length === 0) {
    errors.push(`${label}: اكتب ما لا يمكن للمصدر إثباته`);
  } else {
    alternative.limitations.forEach((item, itemIndex) => requiredText(item, `${label}.limitations[${itemIndex}]`, 6));
  }
  if (alternative.price) {
    if (!isObject(alternative.price) || !Number.isFinite(alternative.price.value) || alternative.price.value < 0) errors.push(`${label}.price.value غير صالح`);
    requiredText(alternative.price?.currency, `${label}.price.currency`, 3);
    requiredText(alternative.price?.basis, `${label}.price.basis`);
    if (alternative.price?.currency !== data.market_scope?.currency) errors.push(`${label}.price.currency لا يطابق عملة نطاق السوق؛ وحّد العملة قبل المقارنة`);
    if (alternative.price?.basis !== data.market_scope?.price_basis) errors.push(`${label}.price.basis لا يطابق أساس السعر الموحّد في نطاق السوق`);
  }
}
if (!alternatives.some((item) => isObject(item) && item.type !== "direct")) errors.push("أضف بديلًا غير مباشر أو عدم الفعل حتى لا تنحصر الخريطة في المنافسين المباشرين");

if (!Array.isArray(data.comparisons) || comparisons.length === 0) errors.push("أضف مقارنات مرتبطة بالبدائل والمعايير");
const comparisonCells = new Set();
for (const [index, comparison] of comparisons.entries()) {
  const label = `المقارنة ${index + 1}`;
  if (!isObject(comparison)) {
    errors.push(`${label}: يجب أن تكون كائنًا`);
    continue;
  }
  if (!alternativeIds.has(comparison.alternative_id)) errors.push(`${label}: alternative_id غير موجود`);
  if (!criterionIds.has(comparison.criterion_id)) errors.push(`${label}: criterion_id غير موجود`);
  const cell = `${comparison.alternative_id}::${comparison.criterion_id}`;
  if (comparisonCells.has(cell)) errors.push(`${label}: خلية مقارنة مكررة`);
  comparisonCells.add(cell);
  if (!["observed", "unknown"].includes(comparison.status)) errors.push(`${label}.status يجب أن يكون observed أو unknown`);
  if (comparison.status === "observed") {
    if (!isKnownValue(comparison.own_value) || !isKnownValue(comparison.alternative_value)) errors.push(`${label}: المقارنة المرصودة تحتاج قيمتي المتجر والبديل`);
    requireStoreEvidenceRefs(comparison.own_evidence_refs, `${label}.own_evidence_refs`);
    requireEvidenceRefs(comparison.alternative_evidence_refs, `${label}.alternative_evidence_refs`);
  }
  if (comparison.status === "unknown") {
    if (isKnownValue(comparison.own_value) || isKnownValue(comparison.alternative_value)) errors.push(`${label}: لا تملأ قيمة معلومة مع status=unknown`);
    for (const field of ["own_evidence_refs", "alternative_evidence_refs"]) {
      const refs = Array.isArray(comparison[field]) ? comparison[field] : [];
      if (comparison[field] !== undefined && !Array.isArray(comparison[field])) errors.push(`${label}.${field} يجب أن تكون مصفوفة`);
      for (const [refIndex, ref] of refs.entries()) {
        if (!validEvidenceRef(ref)) errors.push(`${label}.${field}[${refIndex}] مرجع غير صالح`);
      }
    }
  }
}
for (const alternativeId of alternativeIds) {
  for (const criterionId of criterionIds) {
    if (!comparisonCells.has(`${alternativeId}::${criterionId}`)) errors.push(`مصفوفة المقارنة ناقصة: ${alternativeId} × ${criterionId}`);
  }
}

const positioning = isObject(data.positioning) ? data.positioning : {};
if (!isObject(data.positioning)) errors.push("positioning يجب أن يكون كائنًا");
for (const key of ["statement", "target_segment", "frame_of_reference", "reason_to_choose", "counterevidence"]) {
  requiredText(positioning[key], `positioning.${key}`, 8);
}
if (
  containsUnsupportedSuperlative(positioning.statement)
  || containsUnsupportedSuperlative(positioning.reason_to_choose)
  || containsUnsupportedSuperlative(positioning.frame_of_reference)
) {
  errors.push("أطروحة التموضع أو سبب الاختيار يحتوي ادعاء تفوق مطلقًا غير مدعوم");
}
if (String(positioning.target_segment ?? "").trim() !== String(data.market_scope?.segment ?? "").trim()) errors.push("positioning.target_segment يجب أن يطابق شريحة نطاق السوق دون تبديل صامت");
if (/^(?:لا\s+يوجد|لا\s+شيء|غير\s+معروف|unknown)/i.test(String(positioning.counterevidence ?? "").trim())) errors.push("positioning.counterevidence يجب أن يذكر ظرفًا حقيقيًا يجعل البديل أقوى");
requireStoreEvidenceRefs(positioning.proof_refs, "positioning.proof_refs");
if (!Array.isArray(positioning.unproven_assumptions) || positioning.unproven_assumptions.length === 0) {
  errors.push("أضف افتراضًا غير مثبت واحدًا على الأقل لاختباره");
} else {
  positioning.unproven_assumptions.forEach((item, index) => requiredText(item, `positioning.unproven_assumptions[${index}]`, 8));
}

const nextTest = isObject(data.next_test) ? data.next_test : {};
if (!isObject(data.next_test)) errors.push("next_test يجب أن يكون كائنًا بعقد اختبار قابل للمراجعة");
for (const key of ["hypothesis", "material", "metric", "decision_rule", "owner"]) {
  requiredText(nextTest[key], `next_test.${key}`, key === "decision_rule" ? 12 : 6);
}
if (typeof nextTest.decision_rule === "string") {
  const westernDigits = nextTest.decision_rule.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  const numbers = [...westernDigits.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  if (numbers.length === 0 || numbers.every((number) => number <= 0)) errors.push("next_test.decision_rule يجب أن يحتوي حدًا رقميًا موجبًا واضحًا");
}
validDueDate(nextTest.due_date, "next_test.due_date");

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  valid: true,
  alternatives: alternatives.length,
  criteria: criteria.length,
  comparison_cells: comparisons.length,
  observed_comparisons: comparisons.filter((item) => item.status === "observed").length,
  unknown_comparisons: comparisons.filter((item) => item.status === "unknown").length,
  positioning_statement: positioning.statement,
  next_test_due_date: nextTest.due_date,
}, null, 2));
