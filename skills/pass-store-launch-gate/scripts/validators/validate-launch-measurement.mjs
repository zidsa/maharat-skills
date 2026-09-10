#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("الاستخدام: node scripts/validate-launch-measurement.mjs <measurement.json>");
  process.exit(2);
}

const x = JSON.parse(fs.readFileSync(file, "utf8"));
const errors = [];
const repoRoot = fs.realpathSync(path.resolve(process.argv[3] || path.dirname(path.resolve(file))));
const stripInvisible = value => String(value ?? "").normalize("NFKC").replace(/[\p{Cf}\u2060\uFEFF]/gu, "");
const nonBlank = value => typeof value === "string" && stripInvisible(value).trim().length > 0;
const visibleIdentifier = value => nonBlank(value) && value === value.trim() && !/[\p{Cc}\p{Cf}]/u.test(value);
const asArray = (value, label) => {
  if (!Array.isArray(value)) {
    errors.push(`${label} يجب أن تكون قائمة`);
    return [];
  }
  return value;
};
const validDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};
const validTimestamp = value => {
  const match = typeof value === "string" && value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/);
  return !!match && validDate(match[1]) && Number(match[2]) < 24 && Number(match[3]) < 60 && Number(match[4]) < 60 && Number.isFinite(Date.parse(value));
};
const validHttps = value => {
  if (typeof value !== "string" || value !== value.trim() || /[\p{Cc}\p{Cf}]/u.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
};
const parseRef = value => {
  if (typeof value !== "string" || value !== value.trim() || /[\p{Cc}\p{Cf}]/u.test(value)) return null;
  if (validHttps(value)) return { remote: true };
  let decoded = value;
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return null;
    }
  }
  if (/^[a-z][a-z0-9+.-]*:/iu.test(decoded)) return null;
  const index = decoded.lastIndexOf("#");
  if (index <= 0 || index === decoded.length - 1) return null;
  const base = decoded.slice(0, index);
  const fragment = decoded.slice(index + 1);
  if (base !== base.trim() || fragment !== fragment.trim() || base.startsWith("/") || base.includes("\\") || base.split("/").some(part => !part || part === "." || part === "..")) return null;
  return { base, fragment };
};
const resolveFragment = (data, fragment) => {
  let current = data;
  for (const key of fragment.split(/[./]/).filter(Boolean)) {
    if (current === null || typeof current !== "object" || !Object.prototype.hasOwnProperty.call(current, key)) return { found: false };
    current = current[key];
  }
  return { found: true, value: current };
};
const readLocalRef = value => {
  const ref = parseRef(value);
  if (!ref || ref.remote) return null;
  const resolved = path.resolve(repoRoot, ref.base);
  if (!resolved.startsWith(`${repoRoot}${path.sep}`) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  const real = fs.realpathSync(resolved);
  if (!real.startsWith(`${repoRoot}${path.sep}`)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(real, "utf8"));
    const fragment = resolveFragment(data, ref.fragment);
    return fragment.found ? { data, value: fragment.value, resolved: real } : null;
  } catch {
    return null;
  }
};
const validRef = value => !!parseRef(value);

const allowedTop = new Set(["schema_version", "status", "build", "privacy", "source_register", "event_contracts", "metrics", "evidence_register", "validation_cases", "purchase_reconciliation", "defects", "blockers"]);
for (const key of Object.keys(x)) if (!allowedTop.has(key)) errors.push(`حقل علوي غير معروف: ${key}`);
if (x.schema_version !== 1) errors.push("schema_version يجب أن يساوي 1");
if (!["verified", "blocked"].includes(x.status)) errors.push("status غير صالح");

const build = x.build || {};
const tested = Date.parse(build.tested_at || "");
const changed = Date.parse(build.configuration_changed_at || "");
if (!validHttps(build.url) || !visibleIdentifier(build.version) || !["staging", "sandbox", "production_preview"].includes(build.environment) || !validTimestamp(build.tested_at) || !validTimestamp(build.configuration_changed_at) || tested < changed) errors.push("بيانات البناء أو حداثة الاختبار غير صالحة");
if (x.privacy?.contains_personal_data !== false || !visibleIdentifier(x.privacy?.identifier_policy)) errors.push("سياسة خصوصية غير مكتملة");

const normalizeKey = key => String(key).normalize("NFKC").replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[^\p{L}\p{N}]+/gu, "_").toLowerCase();
const sensitiveKey = /(^|_)(email|phone|mobile|contact|customer|card|pan|cvv|cvc|address|national_id|user_id|client_id|full_name|first_name|last_name)($|_)/i;
const rawEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const walkPrivacy = value => {
  if (typeof value === "string") {
    if (rawEmail.test(value)) errors.push("قيمة بريد إلكتروني خام محظورة");
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && sensitiveKey.test(item.trim())) errors.push(`معلمة شخصية محظورة: ${item}`);
      walkPrivacy(item);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (sensitiveKey.test(normalizeKey(key))) errors.push(`حقل شخصي محظور: ${key}`);
    walkPrivacy(child);
  }
};
walkPrivacy(x);

const sourceList = asArray(x.source_register, "source_register");
const eventList = asArray(x.event_contracts, "event_contracts");
const metricList = asArray(x.metrics, "metrics");
const evidenceList = asArray(x.evidence_register, "evidence_register");
const validationList = asArray(x.validation_cases, "validation_cases");
const defectList = asArray(x.defects, "defects");
const blockerList = asArray(x.blockers, "blockers");

const sourceTypes = new Set(["official_documentation", "order_system", "analytics_export", "tag_manager_config", "storefront_build"]);
const sources = new Map();
const sourceLocals = new Map();
for (const source of sourceList) {
  const observed = validDate(source?.observed_at) ? Date.parse(`${source.observed_at}T00:00:00Z`) : validTimestamp(source?.observed_at) ? Date.parse(source.observed_at) : NaN;
  const parsed = parseRef(source?.reference);
  const local = parsed?.remote ? null : readLocalRef(source?.reference);
  if (!visibleIdentifier(source?.id) || sources.has(source.id) || !sourceTypes.has(source?.type) || !validRef(source?.reference) || (!parsed?.remote && !local) || !Number.isFinite(observed) || observed > tested || !visibleIdentifier(source?.scope)) errors.push(`مصدر مكرر أو ناقص أو أحدث من الاختبار: ${source?.id || "بدون معرف"}`);
  if (visibleIdentifier(source?.id)) {
    sources.set(source.id, source);
    sourceLocals.set(source.id, local);
  }
  if (local?.value && ["order_system", "analytics_export", "tag_manager_config", "storefront_build"].includes(source?.type) && local.value.build_version !== build.version) errors.push(`${source?.id}: نسخة البناء داخل المصدر الخام لا تطابق البناء المختبر`);
}
if (!sources.size) errors.push("مصادر القياس مطلوبة");

const requiredEvents = new Map([
  ["view_item", ["items", "item_id"]],
  ["add_to_cart", ["currency", "value", "items", "item_id", "quantity"]],
  ["begin_checkout", ["currency", "value", "items"]],
  ["purchase", ["transaction_id", "currency", "value", "items"]],
]);
const events = new Map();
for (const event of eventList) {
  const source = sources.get(event?.source_of_truth_ref);
  if (!visibleIdentifier(event?.name) || events.has(event.name) || !requiredEvents.has(event?.name) || !visibleIdentifier(event?.trigger) || !source || !visibleIdentifier(event?.source_of_truth_ref) || !visibleIdentifier(event?.identifier_policy) || !["validated", "failed", "not_tested"].includes(event?.status)) errors.push(`عقد حدث مكرر أو ناقص: ${event?.name || "بدون اسم"}`);
  const parameters = asArray(event?.required_parameters, `${event?.name}.required_parameters`);
  if (parameters.some(parameter => !visibleIdentifier(parameter)) || new Set(parameters).size !== parameters.length) errors.push(`${event?.name}: required_parameters تحتوي قيمة فارغة أو مكررة`);
  const parameterSet = new Set(parameters);
  for (const parameter of requiredEvents.get(event?.name) || []) if (!parameterSet.has(parameter)) errors.push(`${event?.name}: معلمة مطلوبة مفقودة ${parameter}`);
  const runtimeTypes = event?.name === "purchase" ? new Set(["analytics_export", "tag_manager_config", "order_system"]) : new Set(["analytics_export", "tag_manager_config"]);
  if (source && !runtimeTypes.has(source.type)) errors.push(`${event?.name}: source_of_truth_ref يجب أن يشير إلى مصدر تشغيل فعلي لا إلى توثيق فقط`);
  if (visibleIdentifier(event?.name)) events.set(event.name, event);
}
for (const name of requiredEvents.keys()) if (!events.has(name)) errors.push(`حدث مطلوب مفقود: ${name}`);

const requiredMetrics = new Set(["product_view_rate", "add_to_cart_rate", "checkout_rate", "purchase_rate", "revenue"]);
const normalizeMetricText = value => stripInvisible(value).normalize("NFKC").replace(/[\s،,؛;:.!؟?]+/g, " ").trim().toLowerCase();
const metricFormulaOk = metric => {
  const numerator = normalizeMetricText(metric?.numerator);
  const denominator = normalizeMetricText(metric?.denominator);
  if (metric?.id === "product_view_rate") return /(عرض منتج|view_item)/i.test(numerator) && /((?:ال)?جلسات (?:ال)?مؤهلة|qualified sessions)/i.test(denominator);
  if (metric?.id === "add_to_cart_rate") return /add_to_cart/i.test(numerator) && /view_item/i.test(denominator);
  if (metric?.id === "checkout_rate") return /begin_checkout/i.test(numerator) && /add_to_cart/i.test(denominator);
  if (metric?.id === "purchase_rate") return /purchase/i.test(numerator) && /begin_checkout/i.test(denominator);
  if (metric?.id === "revenue") return /(purchase[._ ]value|الايراد|الإيراد)/i.test(numerator) && /^(none|لا يوجد|بدون مقام)$/i.test(denominator);
  return true;
};
const metrics = new Map();
for (const metric of metricList) {
  const source = sources.get(metric?.source_ref);
  if (!visibleIdentifier(metric?.id) || metrics.has(metric.id) || !visibleIdentifier(metric?.numerator) || !visibleIdentifier(metric?.denominator) || !visibleIdentifier(metric?.source_ref) || !source || source.type === "official_documentation" || !visibleIdentifier(metric?.owner) || !visibleIdentifier(metric?.cadence) || !visibleIdentifier(metric?.decision_threshold) || !metricFormulaOk(metric)) errors.push(`مقياس مكرر أو ناقص أو صيغته أو مصدره غير صالح: ${metric?.id || "بدون معرف"}`);
  if (visibleIdentifier(metric?.id)) metrics.set(metric.id, metric);
}
for (const id of requiredMetrics) if (!metrics.has(id)) errors.push(`مقياس مطلوب مفقود: ${id}`);

const evidenceTypes = new Set(["event_log", "order_record", "analytics_capture", "tag_manager_log"]);
const evidence = new Map();
const evidenceLocals = new Map();
for (const item of evidenceList) {
  const observed = Date.parse(item?.observed_at || "");
  const parsed = parseRef(item?.reference);
  const local = parsed?.remote ? null : readLocalRef(item?.reference);
  if (!visibleIdentifier(item?.id) || evidence.has(item.id) || !evidenceTypes.has(item?.type) || !validRef(item?.reference) || (!parsed?.remote && !local) || !validTimestamp(item?.observed_at) || observed < changed || observed > tested || item?.build_version !== build.version || !visibleIdentifier(item?.scope)) errors.push(`دليل مكرر أو ناقص أو خارج نافذة الاختبار أو من بناء مختلف: ${item?.id || "بدون معرف"}`);
  if (visibleIdentifier(item?.id)) {
    evidence.set(item.id, item);
    evidenceLocals.set(item.id, local);
  }
  if (local?.value && local.value.build_version !== build.version) errors.push(`${item?.id}: نسخة البناء داخل الدليل الخام لا تطابق البناء المختبر`);
  if (["event_log", "order_record"].includes(item?.type)) {
    const ids = item?.item_ids;
    if (!Array.isArray(ids) || !ids.length || ids.some(id => !visibleIdentifier(id)) || new Set(ids).size !== ids.length) errors.push(`${item?.id}: item_ids يجب أن تكون قائمة معرفات ظاهرة وفريدة`);
    if (!local) errors.push(`${item?.id}: دليل التشغيل يجب أن يكون ملفًا محليًا قابلاً للفحص`);
    if (local?.value) {
      const rawIds = local.value.item_ids;
      if (!Array.isArray(rawIds) || !rawIds.length || rawIds.some(id => !visibleIdentifier(id)) || new Set(rawIds).size !== rawIds.length) errors.push(`${item?.id}: item_ids داخل الدليل الخام غير صالحة أو مكررة`);
    }
  }
}

const validated = new Set();
const caseIds = new Set();
const caseEvents = new Set();
const failedCaseIds = new Set();
for (const testCase of validationList) {
  if (!visibleIdentifier(testCase?.id) || caseIds.has(testCase.id) || !visibleIdentifier(testCase?.event) || !events.has(testCase?.event) || caseEvents.has(testCase?.event) || !visibleIdentifier(testCase?.expected) || !visibleIdentifier(testCase?.actual) || !["passed", "failed", "blocked", "not_tested"].includes(testCase?.status) || !Number.isInteger(testCase?.expected_count) || testCase.expected_count < 1 || !Number.isInteger(testCase?.actual_count) || testCase.actual_count < 0 || typeof testCase?.required_parameters_present !== "boolean") errors.push(`حالة تحقق مكررة أو ناقصة أو تكرر الحدث: ${testCase?.id || "بدون معرف"}`);
  if (visibleIdentifier(testCase?.id)) caseIds.add(testCase.id);
  if (visibleIdentifier(testCase?.event)) caseEvents.add(testCase.event);
  const evidenceRefs = asArray(testCase?.evidence_refs, `${testCase?.id}.evidence_refs`);
  if (evidenceRefs.some(id => !visibleIdentifier(id)) || new Set(evidenceRefs).size !== evidenceRefs.length) errors.push(`${testCase?.id}: evidence_refs تحتوي معرفًا فارغًا أو مكررًا`);
  for (const id of evidenceRefs) if (!evidence.has(id)) errors.push(`${testCase?.id}: دليل غير موجود ${id}`);
  const eventStatus = events.get(testCase?.event)?.status;
  if (testCase?.status === "passed") {
    if (testCase.actual_count !== testCase.expected_count || testCase.required_parameters_present !== true) errors.push(`${testCase.id}: passed لا يطابق عدد الأحداث أو المعلمات`);
    if (testCase.event === "purchase" && (testCase.expected_count !== 1 || testCase.actual_count !== 1)) errors.push(`${testCase.id}: purchase يجب أن يسجل مرة واحدة فقط`);
    if (testCase.event === "purchase" && testCase.order_match !== true) errors.push(`${testCase.id}: purchase يحتاج مطابقة سجل الطلب`);
    if (eventStatus !== "validated") errors.push(`${testCase.id}: حالة الحدث لا تطابق نتيجة passed`);
    validated.add(testCase.event);
    if (!evidenceRefs.length) errors.push(`${testCase.id}: نجاح بلا دليل`);
    const types = new Set(evidenceRefs.map(id => evidence.get(id)?.type));
    if (!types.has("event_log")) errors.push(`${testCase.id}: سجل الحدث مطلوب`);
    if (testCase.event === "purchase" && !types.has("order_record")) errors.push(`${testCase.id}: سجل الطلب مطلوب للشراء`);
    const eventLogs = evidenceRefs.filter(id => evidence.get(id)?.type === "event_log");
    if (!eventLogs.some(id => Array.isArray(evidenceLocals.get(id)?.value?.events) && evidenceLocals.get(id).value.events.includes(testCase.event))) errors.push(`${testCase.id}: محتوى سجل الحدث الخام لا يثبت الحدث`);
  } else if (testCase?.status === "failed") {
    const demonstratesFailure = testCase.actual_count !== testCase.expected_count || testCase.required_parameters_present === false || (testCase.event === "purchase" && testCase.order_match === false);
    if (!demonstratesFailure) errors.push(`${testCase.id}: failed لا يصف فشلًا قابلًا للتحقق`);
    if (!evidenceRefs.length) errors.push(`${testCase.id}: فشل بلا دليل`);
    if (eventStatus !== "failed") errors.push(`${testCase.id}: حالة الحدث لا تطابق نتيجة failed`);
    if (visibleIdentifier(testCase?.id)) failedCaseIds.add(testCase.id);
  } else if (["blocked", "not_tested"].includes(testCase?.status)) {
    if (!visibleIdentifier(testCase?.reason)) errors.push(`${testCase.id}: سبب عدم الاختبار مطلوب`);
    if (eventStatus !== "not_tested") errors.push(`${testCase.id}: حالة الحدث لا تطابق نتيجة عدم الاختبار`);
    if (testCase.actual_count === testCase.expected_count && testCase.required_parameters_present === true && (testCase.event !== "purchase" || testCase.order_match === true)) errors.push(`${testCase.id}: لا يجوز وصف نتيجة مكتملة بأنها غير مختبرة`);
  }
}
if (x.status === "verified") for (const name of requiredEvents.keys()) if (!validated.has(name)) errors.push(`لا توجد حالة تحقق ناجحة للحدث: ${name}`);

const passedPurchase = validationList.some(item => item?.event === "purchase" && item?.status === "passed");
const needsReconciliation = x.status === "verified" || passedPurchase;
if (needsReconciliation) {
  const reconciliation = x.purchase_reconciliation || {};
  for (const key of ["transaction_id", "event_transaction_id", "currency", "value_basis", "order_source_ref", "order_evidence_ref", "event_evidence_ref"]) if (!visibleIdentifier(reconciliation[key])) errors.push(`purchase_reconciliation.${key} مطلوب ويجب أن يكون نصًا ظاهرًا`);
  if (reconciliation.transaction_id !== reconciliation.event_transaction_id) errors.push("معرف حدث الشراء لا يطابق معرف الطلب");
  for (const key of ["expected_value", "actual_value", "tolerance"]) if (!Number.isFinite(reconciliation[key]) || reconciliation[key] < 0) errors.push(`purchase_reconciliation.${key} رقم غير سالب مطلوب`);
  if (!/^[A-Z]{3}$/.test(reconciliation.currency || "")) errors.push("عملة المطابقة غير صالحة");
  if (reconciliation.items_match !== true) errors.push("عناصر الشراء لا تطابق الطلب");
  if (Number.isFinite(reconciliation.expected_value) && Number.isFinite(reconciliation.actual_value) && Number.isFinite(reconciliation.tolerance) && Math.abs(reconciliation.expected_value - reconciliation.actual_value) > reconciliation.tolerance) errors.push("قيمة الشراء خارج السماحية");
  if (!sources.has(reconciliation.order_source_ref) || sources.get(reconciliation.order_source_ref)?.type !== "order_system") errors.push("مصدر الطلب غير صالح");
  const orderEvidence = evidence.get(reconciliation.order_evidence_ref);
  const eventEvidence = evidence.get(reconciliation.event_evidence_ref);
  if (orderEvidence?.type !== "order_record" || orderEvidence.transaction_id !== reconciliation.transaction_id || orderEvidence.currency !== reconciliation.currency || orderEvidence.value !== reconciliation.expected_value) errors.push("سجل الطلب لا يطابق المعرف والعملة والقيمة");
  if (eventEvidence?.type !== "event_log" || eventEvidence.transaction_id !== reconciliation.event_transaction_id || eventEvidence.currency !== reconciliation.currency || eventEvidence.value !== reconciliation.actual_value) errors.push("دليل حدث الشراء لا يطابق المعرف والعملة والقيمة");
  const orderItems = Array.isArray(orderEvidence?.item_ids) ? [...orderEvidence.item_ids].sort() : [];
  const eventItems = Array.isArray(eventEvidence?.item_ids) ? [...eventEvidence.item_ids].sort() : [];
  if (!orderItems.length || JSON.stringify(orderItems) !== JSON.stringify(eventItems)) errors.push("عناصر سجل الطلب والحدث غير متطابقة");
  const rawOrder = evidenceLocals.get(reconciliation.order_evidence_ref)?.value;
  const rawEvent = evidenceLocals.get(reconciliation.event_evidence_ref)?.value;
  if (!rawOrder || rawOrder.transaction_id !== reconciliation.transaction_id || rawOrder.currency !== reconciliation.currency || rawOrder.value !== reconciliation.expected_value) errors.push("ملف الطلب الخام لا يطابق المطابقة");
  if (!rawEvent || rawEvent.transaction_id !== reconciliation.event_transaction_id || rawEvent.currency !== reconciliation.currency || rawEvent.value !== reconciliation.actual_value || !Array.isArray(rawEvent.events) || !rawEvent.events.includes("purchase")) errors.push("ملف الحدث الخام لا يثبت purchase أو لا يطابق المطابقة");
  const rawOrderItems = Array.isArray(rawOrder?.item_ids) ? [...rawOrder.item_ids].sort() : [];
  const rawEventItems = Array.isArray(rawEvent?.item_ids) ? [...rawEvent.item_ids].sort() : [];
  if (!rawOrderItems.length || JSON.stringify(rawOrderItems) !== JSON.stringify(rawEventItems) || JSON.stringify(rawOrderItems) !== JSON.stringify(orderItems)) errors.push("عناصر ملفات الطلب والحدث الخام لا تتطابق مع السجل");
}

const defectIds = new Set();
const linkedFailedCases = new Set();
for (const defect of defectList) {
  if (!visibleIdentifier(defect?.id) || defectIds.has(defect.id) || !visibleIdentifier(defect?.summary) || !visibleIdentifier(defect?.owner) || !["critical", "high", "medium", "low"].includes(defect?.severity) || !["open", "fixed_pending_retest", "closed"].includes(defect?.status)) errors.push(`عيب مكرر أو ناقص: ${defect?.id || "بدون معرف"}`);
  if (visibleIdentifier(defect?.id)) defectIds.add(defect.id);
  if (defect?.validation_case_ref !== undefined) {
    if (!visibleIdentifier(defect.validation_case_ref) || !caseIds.has(defect.validation_case_ref)) errors.push(`${defect?.id}: validation_case_ref لا يشير إلى حالة تحقق موجودة`);
    else if (!failedCaseIds.has(defect.validation_case_ref)) errors.push(`${defect?.id}: validation_case_ref يجب أن يشير إلى حالة failed`);
    if (failedCaseIds.has(defect.validation_case_ref) && defect.status !== "closed") linkedFailedCases.add(defect.validation_case_ref);
  }
}
for (const id of failedCaseIds) if (!linkedFailedCases.has(id)) errors.push(`${id}: حالة الفشل تحتاج عيبًا مفتوحًا مرتبطًا بها`);
const blockerValid = blocker => visibleIdentifier(blocker) || (blocker && typeof blocker === "object" && visibleIdentifier(blocker.code) && visibleIdentifier(blocker.owner) && visibleIdentifier(blocker.action));
if (blockerList.some(blocker => !blockerValid(blocker))) errors.push("blockers يجب أن تكون قائمة موانع واضحة");
const blockerKeys = blockerList.map(blocker => typeof blocker === "string" ? stripInvisible(blocker).trim().toLowerCase() : stripInvisible(blocker?.code).trim().toLowerCase());
if (new Set(blockerKeys).size !== blockerKeys.length) errors.push("blockers تحتوي مانعًا مكررًا");
if (x.status === "verified" && (blockerList.length || defectList.some(defect => defect?.status !== "closed") || [...events.values()].some(event => event.status !== "validated") || validationList.some(item => item?.status !== "passed"))) errors.push("verified لا يسمح بمانع أو عيب مفتوح أو حدث أو حالة تحقق غير ناجحة");
if (x.status === "blocked" && !blockerList.length && !defectList.some(defect => defect?.status !== "closed")) errors.push("blocked يحتاج مانعًا أو عيبًا مفتوحًا");

console.log(JSON.stringify({ valid: !errors.length, errors, status: x.status, event_count: events.size, metric_count: metrics.size }, null, 2));
if (errors.length) process.exit(1);
