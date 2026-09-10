#!/usr/bin/env node
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("الاستخدام: node scripts/validate-trust-center.mjs <trust-center.json>");
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
const normalize = value => String(value || "")
  .normalize("NFKC")
  .replace(/[\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/gu, "")
  .replace(/[\u0640\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")
  .replace(/[\s،,؛;:.!؟?]+/gu, " ")
  .trim()
  .toLowerCase();

const allowedTop = new Set(["schema_version", "status", "audit_date", "source_register", "compliance_artifact", "brand_system", "verified_facts", "placements", "assets", "blockers"]);
for (const key of Object.keys(x)) if (!allowedTop.has(key)) errors.push(`حقل علوي غير معروف: ${key}`);
if (x.schema_version !== 1) errors.push("schema_version يجب أن يساوي 1");
if (!["draft", "review_ready"].includes(x.status)) errors.push("status غير صالح");
const today = new Date().toISOString().slice(0, 10);
if (!validDate(x.audit_date) || x.audit_date > today) errors.push("audit_date غير صالح أو مستقبلي");
const auditAt = Date.parse(`${x.audit_date}T23:59:59Z`);

const sourceList = asArray(x.source_register, "source_register");
const factList = asArray(x.verified_facts, "verified_facts");
const placementList = asArray(x.placements, "placements");
const assetList = asArray(x.assets, "assets");
const blockers = asArray(x.blockers, "blockers");
const officialServiceDomains = new Set([
  "business.sa", "mc.gov.sa", "zatca.gov.sa", "sdaia.gov.sa", "sfda.gov.sa", "saso.gov.sa", "cst.gov.sa", "saip.gov.sa", "boe.gov.sa",
  "u.ae", "moet.gov.ae", "moic.gov.bh",
]);
const officialMarketByDomain = new Map([
  ["business.sa", "SA"], ["mc.gov.sa", "SA"], ["zatca.gov.sa", "SA"], ["sdaia.gov.sa", "SA"], ["sfda.gov.sa", "SA"], ["saso.gov.sa", "SA"], ["cst.gov.sa", "SA"], ["saip.gov.sa", "SA"], ["boe.gov.sa", "SA"],
  ["u.ae", "AE"], ["moet.gov.ae", "AE"], ["moic.gov.bh", "BH"],
]);
const officialHostMarket = value => {
  if (!validHttps(value)) return null;
  const host = new URL(value).hostname.toLowerCase();
  for (const [domain, market] of officialMarketByDomain) if (host === domain || host.endsWith(`.${domain}`)) return market;
  return null;
};
const isOfficialServiceRef = value => {
  if (!validHttps(value)) return false;
  const host = new URL(value).hostname.toLowerCase();
  return [...officialServiceDomains].some(domain => host === domain || host.endsWith(`.${domain}`));
};

const sources = new Map();
for (const source of sourceList) {
  if (!visibleIdentifier(source?.id) || sources.has(source.id)) errors.push(`مصدر مكرر أو بلا معرف: ${source?.id || "بدون معرف"}`);
  if (visibleIdentifier(source?.id)) sources.set(source.id, source);
  if (!nonBlank(source?.type) || !validRef(source?.url_or_path) || !validDate(source?.observed_at) || Date.parse(`${source?.observed_at}T23:59:59Z`) > auditAt || !nonBlank(source?.scope)) {
    errors.push(`${source?.id || "source"}: مصدر ناقص أو غير صالح أو مستقبلي`);
  }
  if (source?.type === "official_service" && !isOfficialServiceRef(source?.url_or_path)) errors.push(`${source?.id}: official_service يحتاج نطاق جهة رسمية موثوقًا`);
  if (source?.type === "official_service") {
    const hostMarket = officialHostMarket(source?.url_or_path);
    if (!/^(SA|AE|BH)$/.test(source?.market || "") || source.market !== hostMarket) errors.push(`${source?.id}: سوق الخدمة الرسمية مفقود أو لا يطابق نطاقها`);
  }
}

const complianceSource = sources.get(x.compliance_artifact?.artifact_ref);
const brandSource = sources.get(x.brand_system?.artifact_ref);
if (!complianceSource || complianceSource.type !== "internal_artifact") errors.push("مرجع ملف الامتثال غير موجود أو ليس أثرًا داخليًا");
if (!brandSource || brandSource.type !== "internal_artifact") errors.push("مرجع نظام العلامة غير موجود أو ليس أثرًا داخليًا");
if (x.status === "review_ready" && x.compliance_artifact?.review_status !== "approved_for_copy") errors.push("review_ready يحتاج ملف امتثال approved_for_copy");
if (x.status === "review_ready" && x.brand_system?.status !== "review_ready") errors.push("review_ready يحتاج نظام علامة review_ready");

const factTypes = new Set(["identity", "payment_method", "shipping_method", "delivery", "return_refund", "warranty", "privacy", "contact", "verification_badge", "review_metric"]);
const facts = new Map();
for (const fact of factList) {
  if (!visibleIdentifier(fact?.id) || facts.has(fact.id) || !factTypes.has(fact?.type)) errors.push(`حقيقة مكررة أو ناقصة: ${fact?.id || "بدون معرف"}`);
  if (visibleIdentifier(fact?.id)) facts.set(fact.id, fact);
  if (typeof fact?.active !== "boolean" || typeof fact?.critical !== "boolean") errors.push(`${fact?.id}: active وcritical مطلوبان`);
  const source = sources.get(fact?.source_ref);
  if (!visibleIdentifier(fact?.source_ref) || !source) errors.push(`${fact?.id}: مصدر غير موجود`);
  if (!validDate(fact?.observed_at) || Date.parse(`${fact?.observed_at}T23:59:59Z`) > auditAt) errors.push(`${fact?.id}: observed_at غير صالح أو مستقبلي`);
  const approvedCopy = asArray(fact?.approved_copy, `${fact?.id}.approved_copy`);
  if (!approvedCopy.length || approvedCopy.some(value => !nonBlank(value)) || new Set(approvedCopy.map(normalize)).size !== approvedCopy.length) errors.push(`${fact?.id}: approved_copy مطلوبة وفريدة وغير فارغة`);
  if (Object.hasOwn(fact || {}, "valid_until") && fact.valid_until !== null && !validDate(fact.valid_until)) errors.push(`${fact?.id}: valid_until غير صالح`);
  if (fact?.active && fact?.valid_until && Date.parse(fact.valid_until) < Date.parse(x.audit_date)) errors.push(`${fact.id}: حقيقة منتهية لا يمكن أن تكون فعالة`);
  if (fact?.type === "verification_badge" && (source?.type !== "official_service" || !fact.valid_until || !/(توثيق|تحقق|ترخيص|اعتماد|verification|verify|license|registration)/i.test(normalize(`${source?.scope || ""} ${source?.url_or_path || ""}`)))) errors.push(`${fact.id}: شارة التوثيق تحتاج خدمة تحقق رسمية محددة وصلاحية`);
  if ((fact?.type === "review_metric" || /\d(?:[.,]\d)?\s*(?:\/|من)\s*5|\d+\s*(?:تقييم|مراجعة)|خمس\s+نجوم/i.test(approvedCopy.join(" "))) && source?.type !== "review_platform_export") errors.push(`${fact?.id}: مقياس التقييم يحتاج تصدير منصة تقييمات`);
  if (fact?.type === "payment_method" && source?.type !== "payment_settings") errors.push(`${fact.id}: وسيلة الدفع تحتاج إعدادات دفع فعلية`);
  if (fact?.type === "shipping_method" && source?.type !== "carrier_settings") errors.push(`${fact.id}: وسيلة الشحن تحتاج إعدادات ناقل فعلية`);
  const factSourceRules = {
    identity: new Set(["merchant_settings", "merchant_record"]),
    delivery: new Set(["merchant_policy"]),
    return_refund: new Set(["merchant_policy"]),
    warranty: new Set(["merchant_policy"]),
    privacy: new Set(["merchant_policy"]),
    contact: new Set(["contact_settings"]),
  };
  if (factSourceRules[fact?.type] && !factSourceRules[fact.type].has(source?.type)) errors.push(`${fact?.id}: نوع المصدر لا يثبت حقيقة ${fact?.type}`);
  if (fact?.active && fact?.type === "contact" && fact?.critical !== true) errors.push(`${fact.id}: حقيقة التواصل الفعالة يجب أن تكون حرجة`);
  const copyText = normalize(approvedCopy.join(" "));
  if (/(تقييم|مراجعات?|نجوم|نجمة|review|rating|stars?)/i.test(copyText) && fact?.type !== "review_metric") errors.push(`${fact?.id}: نص تقييم مصنف كنوع حقيقة غير صحيح`);
  if (/(شحن|ناقل|سمسا|ارامكس|أرامكس|aramex|dhl|fedex|ups|carrier)/i.test(copyText) && !["shipping_method", "delivery"].includes(fact?.type)) errors.push(`${fact?.id}: نص شحن مصنف كنوع حقيقة غير صحيح`);
  if (/(مدى|mada|visa|mastercard|apple\s*pay|ابل\s*باي|أبل\s*باي|بطاقات? بنكية|وسيلة الدفع|الدفع عبر)/i.test(copyText) && fact?.type !== "payment_method") errors.push(`${fact?.id}: نص دفع مصنف كنوع حقيقة غير صحيح`);
  if (/(واتساب|whatsapp|اتصل|تواصل معنا|البريد الإلكتروني|هاتف)/i.test(copyText) && fact?.type !== "contact") errors.push(`${fact?.id}: نص تواصل مصنف كنوع حقيقة غير صحيح`);
  if (/(خصوصيت|privacy|حماية البيانات)/i.test(copyText) && fact?.type !== "privacy") errors.push(`${fact?.id}: نص خصوصية مصنف كنوع حقيقة غير صحيح`);
}
if (x.status === "review_ready") {
  for (const type of ["identity", "delivery", "return_refund", "contact"]) {
    const core = [...facts.values()].filter(fact => fact.type === type && fact.active);
    if (!core.length) errors.push(`حقيقة أساسية فعالة مفقودة: ${type}`);
    else if (!core.some(fact => fact.critical === true)) errors.push(`الحقيقة الأساسية يجب أن تكون حرجة: ${type}`);
  }
}

const assets = new Map();
for (const asset of assetList) {
  if (!visibleIdentifier(asset?.id) || assets.has(asset.id) || !visibleIdentifier(asset?.source_ref) || !sources.has(asset?.source_ref) || !validHttps(asset?.url) || !nonBlank(asset?.alt_text)) errors.push(`أصل مكرر أو ناقص: ${asset?.id || "بدون معرف"}`);
  if (visibleIdentifier(asset?.id)) assets.set(asset.id, asset);
}

const surfaces = new Set(["trust_center", "home", "product", "cart", "checkout", "footer", "contact"]);
const components = new Set(["identity", "policy_summary", "method_list", "contact_card", "badge", "metric", "faq_link"]);
const placementIds = new Set();
const placedFacts = new Map();
for (const placement of placementList) {
  if (!visibleIdentifier(placement?.id) || placementIds.has(placement.id) || !surfaces.has(placement?.surface) || !components.has(placement?.component) || !nonBlank(placement?.heading)) errors.push(`موضع مكرر أو ناقص: ${placement?.id || "بدون معرف"}`);
  if (visibleIdentifier(placement?.id)) placementIds.add(placement.id);
  const statements = asArray(placement?.statements, `${placement?.id}.statements`);
  if (!statements.length) errors.push(`${placement?.id}: statements مطلوبة`);
  const statementFacts = [];
  for (const statement of statements) {
    const fact = facts.get(statement?.fact_ref);
    if (!visibleIdentifier(statement?.fact_ref) || !nonBlank(statement?.text) || !fact) errors.push(`${placement?.id}: statement ناقص أو fact_ref غير موجود`);
    else {
      statementFacts.push(fact);
      if (!fact.active) errors.push(`${placement.id}: يستخدم حقيقة غير فعالة ${fact.id}`);
      if (!asArray(fact.approved_copy, `${fact.id}.approved_copy`).map(normalize).includes(normalize(statement.text))) errors.push(`${placement.id}: النص لا يطابق approved_copy للحقيقة ${fact.id}`);
      const used = placedFacts.get(fact.id) || new Set();
      used.add(placement.surface);
      placedFacts.set(fact.id, used);
    }
  }
  const heading = normalize(placement?.heading);
  const asset = assets.get(placement?.asset_ref);
  const assetText = normalize(`${asset?.id || ""} ${asset?.alt_text || ""}`);
  const context = `${heading} ${assetText}`;
  const hasFact = type => statementFacts.some(fact => fact.type === type && fact.active);
  if (Object.hasOwn(placement || {}, "visual_kind") && !["none", "logo", "illustration", "icon"].includes(placement.visual_kind)) errors.push(`${placement?.id}: visual_kind غير صالح`);
  if (/(موثق|توثيق|معتمد|مرخص|مرخّص|ترخيص)(?:\s+حكومي|\s+رسميا|\s+رسمي|\s+ساري)?|officially\s+(?:verified|certified|licensed)|licensed\s+officially/i.test(heading) && !hasFact("verification_badge")) errors.push(`${placement?.id}: عنوان توثيق رسمي بلا حقيقة شارة موثقة`);
  if (placement?.component === "badge" && !hasFact("verification_badge")) errors.push(`${placement?.id}: مكوّن الشارة يحتاج حقيقة توثيق فعالة`);
  if (/(مدى|mada|visa|mastercard|apple\s*pay|ابل\s*باي|أبل\s*باي|بطاقات?(?:\s+بنكية)?|وسائل?\s+(?:الدفع|السداد)|الدفع\s+متاح|السداد)/i.test(context) && !hasFact("payment_method")) errors.push(`${placement?.id}: عرض وسيلة دفع يحتاج حقيقة دفع فعالة`);
  if (/(شحن|ناقل|سمسا|ارامكس|أرامكس|aramex|dhl|fedex|ups|carrier)/i.test(context) && !hasFact("shipping_method")) errors.push(`${placement?.id}: عرض ناقل أو شحن يحتاج حقيقة شحن فعالة`);
  if (/[0-9٠-٩۰-۹](?:[.,٫][0-9٠-٩۰-۹])?\s*(?:\/|من)\s*[5٥۵]|[0-9٠-٩۰-۹]+\s*(?:تقييم|مراجعة)|(?:أربع|اربعة|أربعة|خمس)\s+(?:نجوم|نجمات)|(?:نجمة|نجوم|نجمات|تقييم|مراجعات?|review|rating|stars?)/i.test(heading) && !hasFact("review_metric")) errors.push(`${placement?.id}: عنوان التقييم يحتاج حقيقة تقييم موثقة`);
  if (/(خصوصية|خصوصيتك|بياناتك\s+محمية|حماية\s+البيانات|privacy)/i.test(heading) && !hasFact("privacy")) errors.push(`${placement?.id}: ادعاء الخصوصية يحتاج حقيقة خصوصية فعالة`);
  if (placement?.component === "contact_card" && !hasFact("contact")) errors.push(`${placement?.id}: بطاقة التواصل تحتاج حقيقة تواصل فعالة`);
  if (placement?.asset_ref && /(وزارة|هيئة|حكومة|government|authority|official)/i.test(assetText) && !hasFact("verification_badge")) errors.push(`${placement?.id}: شعار جهة رسمية يحتاج حقيقة توثيق موثقة`);
  const brandPairs = [[/\bvisa\b/i, /\bvisa\b/i], [/mastercard/i, /mastercard/i], [/(?:مدى|mada)/i, /(?:مدى|mada)/i], [/(?:apple\s*pay|ابل\s*باي|أبل\s*باي)/i, /(?:apple\s*pay|ابل\s*باي|أبل\s*باي)/i], [/(?:سمسا)/i, /(?:سمسا)/i], [/(?:ارامكس|أرامكس|aramex)/i, /(?:ارامكس|أرامكس|aramex)/i]];
  for (const [claimPattern, assetPattern] of brandPairs) if (claimPattern.test(heading) && placement?.visual_kind === "logo" && !assetPattern.test(assetText)) errors.push(`${placement?.id}: الشعار لا يطابق العلامة المذكورة في العنوان`);
  if (placement?.detail_link && !validHttps(placement.detail_link)) errors.push(`${placement.id}: detail_link يجب أن يكون HTTPS صالحًا`);
  if (["policy_summary", "faq_link"].includes(placement?.component) && !placement?.detail_link) errors.push(`${placement?.id}: رابط التفاصيل مطلوب`);
  if (placement?.asset_ref && !assets.has(placement.asset_ref)) errors.push(`${placement.id}: أصل غير موجود ${placement.asset_ref}`);
  if (nonBlank(placement?.visual_kind) && placement.visual_kind !== "none" && !placement?.asset_ref) errors.push(`${placement?.id}: العرض البصري يحتاج asset_ref`);
  if (placement?.visual_kind === "logo" && assets.has(placement.asset_ref) && sources.get(assets.get(placement.asset_ref)?.source_ref)?.type !== "asset_library") errors.push(`${placement.id}: الشعار يحتاج أصلًا من asset_library`);
}

if (x.status === "review_ready" && !placementIds.size) errors.push("موضع واحد على الأقل مطلوب");
if (x.status === "review_ready" && !placementList.some(p => p?.surface === "trust_center")) errors.push("صفحة مركز الثقة مطلوبة");
if (x.status === "review_ready" && !placementList.some(p => ["product", "cart", "checkout"].includes(p?.surface) && Array.isArray(p?.statements) && p.statements.some(statement => ["payment_method", "shipping_method", "delivery", "return_refund", "warranty", "privacy"].includes(facts.get(statement?.fact_ref)?.type)))) errors.push("مقتطف مفيد لاتخاذ القرار مطلوب قرب المنتج أو السلة أو الدفع");
for (const fact of facts.values()) if (fact.critical && fact.active && !placedFacts.has(fact.id)) errors.push(`${fact.id}: حقيقة حرجة بلا موضع`);
for (const fact of facts.values()) if (fact.critical && fact.active && ["identity", "contact", "delivery", "return_refund"].includes(fact.type) && !placedFacts.get(fact.id)?.has("trust_center")) errors.push(`${fact.id}: الحقيقة الأساسية الحرجة يجب أن تظهر داخل مركز الثقة`);
for (const fact of facts.values()) {
  if (fact.active && ["identity", "contact", "delivery", "return_refund"].includes(fact.type)) {
    const used = placedFacts.get(fact.id) || new Set();
    if (used.size && [...used].every(surface => surface === "footer")) errors.push(`${fact.id}: لا يكفي عرضه في الفوتر وحده`);
  }
}
const promiseText = normalize(JSON.stringify({ facts: factList.map(f => f?.approved_copy), placements: placementList }));
if (/(مضمون(?:ة)? 100 ?%|[اأإآ]من 100 ?%|[اأإآ]مان كامل|حماية كاملة|ال[اأإآ]فضل على ال[اأإآ]طلاق|بلا [اأإآ]ي مخاطر|دون [اأإآ]ي مخاطر|محمية لل[اأإآ]بد|محمي لل[اأإآ]بد|حماية [اأإآ]بدية|استردادك مضمون دائما|استرداد مضمون دائما|risk[ -]?free|100 ?% secure|secure forever|forever protected|always guaranteed|guaranteed forever)/i.test(promiseText)) errors.push("وعد ثقة مطلق محظور");

const blockerValid = blocker => nonBlank(blocker) || (blocker && typeof blocker === "object" && nonBlank(blocker.code) && nonBlank(blocker.owner) && nonBlank(blocker.action));
if (blockers.some(blocker => !blockerValid(blocker))) errors.push("blockers يجب أن تكون قائمة موانع واضحة");
if (x.status === "review_ready" && blockers.length) errors.push("review_ready لا يسمح بموانع");
const upstreamBlocked = x.compliance_artifact?.review_status !== "approved_for_copy" || x.brand_system?.status !== "review_ready";
const draftIncomplete = !facts.size || !placementIds.size;
if (x.status === "draft" && (upstreamBlocked || draftIncomplete) && !blockers.length) errors.push("المسودة غير المكتملة أو ذات المصدر غير المعتمد تحتاج مانعًا واضحًا");

console.log(JSON.stringify({ valid: !errors.length, errors, status: x.status, fact_count: facts.size, placement_count: placementList.length }, null, 2));
if (errors.length) process.exit(1);
