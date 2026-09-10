#!/usr/bin/env node
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("الاستخدام: node scripts/validate-compliance-audit.mjs <audit.json>");
  process.exit(2);
}

const x = JSON.parse(fs.readFileSync(file, "utf8"));
const errors = [];
const stripInvisible = value => String(value ?? "")
  .normalize("NFKC")
  .replace(/[\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/gu, "");
const cleanText = value => stripInvisible(value).trim();
const nonBlank = value => typeof value === "string" && cleanText(value).length > 0;
const visibleIdentifier = value => nonBlank(value) && value === value.trim() && stripInvisible(value) === value && !/[\p{Cc}\p{Cf}]/u.test(value);
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
const validHttps = value => {
  if (typeof value !== "string" || value !== value.trim() || /[\r\n\t]/u.test(value) || stripInvisible(value) !== value) return false;
  try {
    const url = new URL(value);
    const sensitive = [...url.searchParams.keys()].some(key => /(?:^|_)(?:api_?key|access_?token|token|secret|password|signature|auth)(?:$|_)/i.test(key));
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password && !sensitive;
  } catch {
    return false;
  }
};
const validRef = value => {
  if (validHttps(value)) return true;
  if (typeof value !== "string" || stripInvisible(value) !== value || /[\u0000-\u001F\u007F]/u.test(value) || /%2e|%2f|%5c/iu.test(value)) return false;
  const [base] = value.split("#");
  if (!base || base !== base.trim() || base.startsWith("/") || base.includes("\\")) return false;
  if (base.split("/").some(part => !part || part === "." || part === "..")) return false;
  return !/[\r\n]/u.test(value);
};
const normalizeArabic = value => String(value || "")
  .normalize("NFKC")
  .replace(/[\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/gu, "")
  .replace(/[\u0640\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")
  .replace(/[\s،,؛;:.!؟?]+/gu, " ")
  .trim()
  .toLowerCase();

const allowedTop = new Set(["schema_version", "status", "audit_date", "jurisdiction", "source_register", "requirements", "gaps", "policy_drafts", "manual_review"]);
for (const key of Object.keys(x)) if (!allowedTop.has(key)) errors.push(`حقل علوي غير معروف: ${key}`);
if (x.schema_version !== 1) errors.push("schema_version يجب أن يساوي 1");
if (!["draft", "ready_for_specialist_review"].includes(x.status)) errors.push("status غير صالح");

const today = new Date().toISOString().slice(0, 10);
if (!validDate(x.audit_date) || x.audit_date > today) errors.push("audit_date غير صالح أو مستقبلي");
const auditAt = Date.parse(`${x.audit_date}T23:59:59Z`);
const market = x.jurisdiction?.country_code;
const productScope = asArray(x.jurisdiction?.product_scope, "jurisdiction.product_scope");
const salesChannels = asArray(x.jurisdiction?.sales_channels, "jurisdiction.sales_channels");
if (!/^[A-Z]{2}$/.test(market || "") || !nonBlank(x.jurisdiction?.seller_entity_ref) || !productScope.length || !salesChannels.length || productScope.some(v => !nonBlank(v)) || salesChannels.some(v => !nonBlank(v))) {
  errors.push("نطاق الولاية والكيان والمنتج والقنوات مطلوب بقيم غير فارغة");
}

const sourceList = asArray(x.source_register, "source_register");
const requirementList = asArray(x.requirements, "requirements");
const gapList = asArray(x.gaps, "gaps");
const draftList = asArray(x.policy_drafts, "policy_drafts");
const officialTypes = new Set(["official_law", "official_regulation", "official_guidance", "official_service"]);
const officialDomainsByMarket = {
  SA: new Map([
    ["وزارة التجارة", new Set(["mc.gov.sa"])],
    ["المركز السعودي للأعمال", new Set(["business.sa"])],
    ["الهيئة السعودية للبيانات والذكاء الاصطناعي", new Set(["sdaia.gov.sa"])],
    ["هيئة الزكاة والضريبة والجمارك", new Set(["zatca.gov.sa"])],
    ["الهيئة السعودية للمواصفات والمقاييس والجودة", new Set(["saso.gov.sa"])],
    ["الهيئة العامة للغذاء والدواء", new Set(["sfda.gov.sa"])],
    ["هيئة الاتصالات والفضاء والتقنية", new Set(["cst.gov.sa"])],
    ["الهيئة السعودية للملكية الفكرية", new Set(["saip.gov.sa"])],
    ["هيئة الخبراء بمجلس الوزراء", new Set(["boe.gov.sa"])],
  ]),
  AE: new Map([
    ["وزارة الاقتصاد والسياحة", new Set(["moet.gov.ae"])],
    ["حكومة الإمارات العربية المتحدة", new Set(["u.ae"])],
    ["Ministry of Economy and Tourism", new Set(["moet.gov.ae"])],
    ["UAE Government", new Set(["u.ae"])],
  ]),
  BH: new Map([
    ["وزارة الصناعة والتجارة", new Set(["moic.gov.bh"])],
    ["Ministry of Industry and Commerce", new Set(["moic.gov.bh"])],
  ]),
};

const sources = new Map();
for (const source of sourceList) {
  if (!visibleIdentifier(source?.id) || sources.has(source.id)) errors.push(`مصدر مكرر أو بلا معرف: ${source?.id || "بدون معرف"}`);
  if (visibleIdentifier(source?.id)) sources.set(source.id, source);
  if (!nonBlank(source?.type) || !nonBlank(source?.authority) || !validRef(source?.url_or_path) || !validDate(source?.observed_at) || Date.parse(`${source?.observed_at}T23:59:59Z`) > auditAt || !nonBlank(source?.scope)) {
    errors.push(`${source?.id || "source"}: سجل مصدر ناقص أو غير صالح أو مستقبلي`);
  }
  if (source?.market !== market) errors.push(`${source?.id || "source"}: سوق المصدر لا يطابق نطاق المراجعة`);
  if (officialTypes.has(source?.type)) {
    const allowed = officialDomainsByMarket[market]?.get(source.authority);
    let host = "";
    try { host = new URL(source.url_or_path).hostname.toLowerCase(); } catch {}
    if (!allowed || ![...allowed].some(domain => host === domain || host.endsWith(`.${domain}`))) {
      errors.push(`${source?.id || "source"}: نطاق المصدر لا يطابق السلطة الرسمية المسجلة`);
    }
  }
}

const sellerSource = sources.get(x.jurisdiction?.seller_entity_ref);
const sellerEntityTypes = new Set(["merchant_record", "merchant_settings", "merchant_entity"]);
if (!sellerSource || !sellerEntityTypes.has(sellerSource.type)) errors.push("seller_entity_ref لا يشير إلى سجل كيان التاجر");

const topics = new Set(["identity", "contract", "pricing", "payment", "delivery", "return_refund", "privacy", "complaints", "advertising", "invoice", "regulated_product"]);
const applicability = new Set(["applicable", "not_applicable", "specialist_review"]);
const evidenceStates = new Set(["verified", "missing", "conflicting", "not_tested"]);
const requiredTopics = new Set(["identity", "contract", "pricing", "payment", "delivery", "return_refund", "privacy", "complaints", "advertising", "invoice"]);
const requirements = new Map();
for (const requirement of requirementList) {
  if (!visibleIdentifier(requirement?.id) || requirements.has(requirement.id) || !topics.has(requirement?.topic)) errors.push(`متطلب مكرر أو ناقص: ${requirement?.id || "بدون معرف"}`);
  if (visibleIdentifier(requirement?.id)) requirements.set(requirement.id, requirement);
  if (!applicability.has(requirement?.applicability) || !nonBlank(requirement?.applicability_reason)) errors.push(`${requirement?.id}: التطبيق وسببه مطلوبان`);
  const reason = normalizeArabic(requirement?.applicability_reason);
  if (requirement?.applicability === "not_applicable" && /(مفقود|غير موجود|لم نجد|لم نعثر|لم يتوفر|لم تتوفر|لا يوجد|غير مثبت|غير معروف|غير متاح|غير متوفر|غير متوفرة|لم تصل|لم يقدم|لم يقدّم|لم يرسل|لم يزود|لم يزوّد|المعلومة المطلوبة غير|المستندات المطلوبة|الوثائق المطلوبة|missing|unknown|not found|unavailable|not provided|no evidence|no documents|documents? (?:did not|didn.t) arrive)/i.test(reason)) {
    errors.push(`${requirement.id}: غياب الدليل أو المستند ليس سببًا لعدم الانطباق`);
  }
  const sourceRefs = asArray(requirement?.source_refs, `${requirement?.id}.source_refs`);
  if (!sourceRefs.length || sourceRefs.some(id => !visibleIdentifier(id)) || new Set(sourceRefs).size !== sourceRefs.length) errors.push(`${requirement?.id}: مصدر رسمي ظاهر وفريد مطلوب`);
  for (const id of sourceRefs) {
    const source = sources.get(id);
    if (!source || !officialTypes.has(source.type)) errors.push(`${requirement?.id}: ${id} ليس مصدر سلطة رسميًا`);
    else if (source.market !== market) errors.push(`${requirement?.id}: مصدر من سوق مختلف`);
  }
  if (!evidenceStates.has(requirement?.evidence_status)) errors.push(`${requirement?.id}: evidence_status غير صالح`);
  if (requirement?.applicability === "verified") errors.push(`${requirement.id}: خلط بين applicability وevidence_status`);
  if (requirement?.applicability === "not_applicable" && requirement?.evidence_status === "verified") errors.push(`${requirement.id}: غير المنطبق لا يسجل verified`);
  const evidenceList = asArray(requirement?.evidence ?? [], `${requirement?.id}.evidence`);
  if (requirement?.evidence_status === "verified") {
    if (!evidenceList.length) errors.push(`${requirement.id}: verified بلا دليل`);
    for (const item of evidenceList) {
      const finding = normalizeArabic(item?.finding);
      if (!validRef(item?.reference) || !validDate(item?.observed_at) || Date.parse(`${item?.observed_at}T23:59:59Z`) > auditAt || !nonBlank(item?.finding) || /(غير موجود|مفقود|لا تظهر|لا تحتوي|لا تتضمن|لم يظهر|لم نعثر|لم نجد|لم يتحقق|غير متحقق|غير مثبت|الصفحة خالية|صفحة خالية|خالية من|دون بيانات|missing|absent|not found|not verified|empty page|contains? no|does not contain|lacks?\b|could not find|found nothing)/i.test(finding)) {
        errors.push(`${requirement.id}: دليل تنفيذ ناقص أو سلبي أو مستقبلي`);
      }
    }
  }
}
for (const topic of requiredTopics) if (!requirementList.some(r => r?.topic === topic)) errors.push(`موضوع أساسي مفقود: ${topic}`);

const gapIds = new Set();
const gappedRequirements = new Set();
for (const gap of gapList) {
  if (!visibleIdentifier(gap?.id) || gapIds.has(gap.id) || !visibleIdentifier(gap?.requirement_ref)) errors.push(`فجوة مكررة أو بلا معرف أو مرجع ظاهر: ${gap?.id || "بدون معرف"}`);
  if (visibleIdentifier(gap?.id)) gapIds.add(gap.id);
  const requirement = requirements.get(gap?.requirement_ref);
  if (!requirement) errors.push(`${gap?.id}: متطلب غير موجود`);
  else {
    gappedRequirements.add(gap.requirement_ref);
    if (requirement.applicability === "not_applicable" || requirement.evidence_status === "verified") errors.push(`${gap.id}: فجوة مرتبطة بمتطلب غير منطبق أو متحقق`);
  }
  if (!["critical", "high", "medium", "low"].includes(gap?.severity) || !nonBlank(gap?.owner) || !nonBlank(gap?.action) || !validDate(gap?.due_at) || Date.parse(`${gap?.due_at}T23:59:59Z`) < auditAt) {
    errors.push(`${gap?.id}: الشدة والمالك والإجراء والموعد الحالي أو المستقبلي مطلوبة`);
  }
}
for (const requirement of requirementList) {
  if (((requirement?.applicability === "applicable" && requirement?.evidence_status !== "verified") || requirement?.applicability === "specialist_review") && !gappedRequirements.has(requirement?.id)) {
    errors.push(`${requirement?.id}: يحتاج فجوة مرتبطة`);
  }
}

const draftIds = new Set();
for (const draft of draftList) {
  if (!visibleIdentifier(draft?.id) || draftIds.has(draft.id) || !nonBlank(draft?.policy_type) || !nonBlank(draft?.text)) errors.push(`مسودة سياسة مكررة أو ناقصة: ${draft?.id || "بدون معرف"}`);
  if (visibleIdentifier(draft?.id)) draftIds.add(draft.id);
  const requirementRefs = asArray(draft?.requirement_refs, `${draft?.id}.requirement_refs`);
  const sourceRefs = asArray(draft?.source_refs, `${draft?.id}.source_refs`);
  const commitmentRefs = asArray(draft?.merchant_commitment_refs, `${draft?.id}.merchant_commitment_refs`);
  const variables = asArray(draft?.variables, `${draft?.id}.variables`);
  if (!requirementRefs.length) errors.push(`${draft?.id}: requirement_refs مطلوبة`);
  if (requirementRefs.some(id => !visibleIdentifier(id)) || new Set(requirementRefs).size !== requirementRefs.length) errors.push(`${draft?.id}: requirement_refs يجب أن تكون ظاهرة وفريدة`);
  for (const id of requirementRefs) if (!requirements.has(id)) errors.push(`${draft?.id}: متطلب غير موجود ${id}`);
  if (!sourceRefs.length) errors.push(`${draft?.id}: مصدر رسمي للمسودة مطلوب`);
  if (sourceRefs.some(id => !visibleIdentifier(id)) || new Set(sourceRefs).size !== sourceRefs.length) errors.push(`${draft?.id}: source_refs يجب أن تكون ظاهرة وفريدة`);
  for (const id of sourceRefs) if (!sources.has(id) || !officialTypes.has(sources.get(id)?.type)) errors.push(`${draft?.id}: مصدر سياسة غير رسمي ${id}`);
  const merchantCommitmentTypes = new Set(["merchant_record", "merchant_entity", "merchant_policy", "merchant_settings", "merchant_config", "contact_settings", "payment_settings", "carrier_settings", "catalog_export"]);
  const commitmentTypesByPolicy = {
    complaints: new Set(["merchant_record", "merchant_entity", "merchant_policy", "merchant_settings", "merchant_config", "contact_settings"]),
    payment: new Set(["merchant_policy", "merchant_settings", "merchant_config", "payment_settings"]),
    delivery: new Set(["merchant_policy", "merchant_settings", "merchant_config", "carrier_settings"]),
    return_refund: new Set(["merchant_policy", "merchant_settings", "merchant_config"]),
    privacy: new Set(["merchant_policy", "merchant_settings", "merchant_config"]),
  };
  if (!commitmentRefs.length) errors.push(`${draft?.id}: التزامات التاجر مطلوبة`);
  for (const id of commitmentRefs) {
    const source = sources.get(id);
    const allowedForPolicy = commitmentTypesByPolicy[draft?.policy_type] || merchantCommitmentTypes;
    if (!source || !merchantCommitmentTypes.has(source.type) || !allowedForPolicy.has(source.type)) errors.push(`${draft?.id}: مرجع التزام التاجر غير صالح أو غير مرتبط بنوع السياسة ${id}`);
  }
  const requirementSources = new Set(requirementRefs.flatMap(id => Array.isArray(requirements.get(id)?.source_refs) ? requirements.get(id).source_refs : []));
  for (const id of sourceRefs) if (!requirementSources.has(id)) errors.push(`${draft?.id}: مصدر السياسة لا يطابق مصادر المتطلبات المشار إليها ${id}`);
  const normalizedPolicyText = String(draft?.text || "").normalize("NFKC");
  const placeholders = [...normalizedPolicyText.matchAll(/\[([^\]]*)\]/g)].map(match => cleanText(match[1]));
  const bracketResidue = normalizedPolicyText.replace(/\[[^\]]*\]/g, "");
  if (/[\[\]]/u.test(bracketResidue)) errors.push(`${draft?.id}: أقواس متغيرات غير مكتملة`);
  if (placeholders.some(value => !nonBlank(value)) || variables.some(value => !nonBlank(value)) || new Set(placeholders).size !== placeholders.length || new Set(variables).size !== variables.length || placeholders.length !== variables.length || placeholders.some(value => !variables.includes(value))) {
    errors.push(`${draft?.id}: variables لا تطابق المتغيرات المسماة الظاهرة في النص`);
  }
}

const reviewerRole = normalizeArabic(x.manual_review?.reviewer_role);
const reviewerLooksLikeRole = /(مسؤول|مختص|مستشار|محام|مراجع|امتثال|قانون|خصوصية|compliance|legal|counsel|reviewer|officer|specialist)/i.test(reviewerRole);
if (x.manual_review?.required !== true || !nonBlank(x.manual_review?.reviewer_role) || !reviewerLooksLikeRole || !nonBlank(x.manual_review?.scope)) errors.push("مراجعة بشرية محددة بدور مهني ونطاق واضح مطلوبة");
if (x.status === "ready_for_specialist_review" && requirementList.some(r => r?.applicability === "specialist_review")) errors.push("ready_for_specialist_review لا يسمح بتطبيق غير محسوم");

const authoredNarrative = [
  ...requirementList.map(r => r?.applicability_reason),
  ...requirementList.flatMap(r => Array.isArray(r?.evidence) ? r.evidence.map(e => e?.finding) : []),
  ...gapList.flatMap(g => [g?.action]),
  ...draftList.map(d => d?.text),
  x.manual_review?.scope,
].map(normalizeArabic).join(" ");
if (/(?:المتجر )?ممتثل(?: قانونيا)?|معتمد قانوني|يضمن الامتثال|(?:المتجر )?ملتزم (?:بجميع|بكافة) (?:المتطلبات القانونية|ال[اأإآ]نظمة|القوانين)|(?:المتجر )?متوافق (?:قانونيا|مع (?:جميع|كافة) (?:ال[اأإآ]نظمة|القوانين))|امتثال (?:كامل|تام)|(?:تم )?استيفاء (?:كافة|جميع|المتطلبات القانونية)|مستوف(?:ي|ى)? (?:لكافة|لجميع) (?:ال[اأإآ]نظمة|القوانين|المتطلبات القانونية)|legally compliant|fully compliant|complies? with (?:all|every) (?:applicable )?laws?|all (?:applicable )?laws? (?:are )?complied with/i.test(authoredNarrative)) {
  errors.push("لا يجوز إعلان امتثال قانوني نهائي");
}

const unresolved = requirementList.filter(r => r?.applicability === "applicable" && r?.evidence_status !== "verified").length;
const assessment = requirementList.some(r => r?.applicability === "specialist_review") ? "undetermined" : unresolved ? "gaps_found" : "evidence_complete_for_review";
console.log(JSON.stringify({ valid: !errors.length, errors, status: x.status, assessment, requirement_count: requirementList.length, gap_count: gapList.length }, null, 2));
if (errors.length) process.exit(1);
