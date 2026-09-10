#!/usr/bin/env node

import fs from "node:fs";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("الاستخدام: node scripts/validate-research-round.mjs <research.json|->");
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
const requiredText = (value, label, min = 8) => {
  if (typeof value !== "string" || value.trim().length < min) errors.push(`${label} مفقود أو مختصر جدًا`);
};
const validDate = (value, label) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) {
    errors.push(`${label} ليس تاريخًا صالحًا`);
    return;
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    errors.push(`${label} ليس تاريخًا تقويميًا صالحًا`);
  } else if (value > today) {
    errors.push(`${label} يقع في المستقبل`);
  }
};
const validSourceRef = (value) => {
  if (typeof value !== "string" || value.trim().length < 6) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    const [resource, anchor, ...rest] = value.split("#");
    return rest.length === 0 && resource?.includes("/") && resource.trim().length >= 5 && anchor?.trim().length >= 3;
  }
};
const contactPattern = /[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\s*966|0)\s*5(?:[\s-]*\d){8}/i;
const contactKeyPattern = /(?:^|_)(?:full_?name|name|email|phone|mobile|national_?id|identity_?id)(?:$|_)|اسم|بريد|هاتف|جوال|هوية/i;
const genericActors = new Set(["العميل", "العميلة", "المشارك", "المشاركة", "التاجر", "التاجرة", "المالك", "المالكة", "المدير", "المديرة", "المستخدم", "المستخدمة"]);
const explicitNameAfterCue = (text) => {
  const match = String(text).match(/(?:^|\s)(?:قال|قالت|ذكر|ذكرت|أوضح|أوضحت|اسمه|اسمها|يدعى|تدعى)\s+[«"']?([A-Zأ-ي][A-Za-zأ-ي'-]{2,})/);
  return match && !genericActors.has(match[1]);
};
const futureIntentPattern = /(?:^|\s)(?:قد|ربما|سوف|سأ(?:\s+|(?=[أ-ي]))|سن(?:\s+|(?=[أ-ي]))|سي(?:\s+|(?=[أ-ي]))|تنوي|ينوي|أرغب|نرغب|مستقبلًا|لو\s+كان|أتوقع)(?:\s|$)?/;
const leadingQuestionPattern = /هل\s+(?:ستشتري|ستستخدم|يعجبك|تريد)|كم\s+ستدفع|ألا\s+تعتقد|لو\s+وفرنا|ما\s+رأيك\s+في\s+فكرتنا/;
const scanDirectContact = (value, path = "root") => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanDirectContact(item, `${path}[${index}]`));
    return;
  }
  if (!isObject(value)) {
    if (typeof value === "string" && (contactPattern.test(value) || explicitNameAfterCue(value))) errors.push(`${path} قد يحتوي اسمًا أو بريدًا أو رقم جوال مباشرًا`);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (contactKeyPattern.test(key) && child !== null && String(child).trim() !== "") {
      errors.push(`${childPath} حقل اتصال مباشر غير مسموح في ملف التحليل`);
    }
    scanDirectContact(child, childPath);
  }
};

if (!isObject(data)) {
  console.error("- الجذر يجب أن يكون كائن JSON يمثل جولة بحث");
  process.exit(1);
}

scanDirectContact(data);
requiredText(data.research_question, "research_question");
requiredText(data.decision_context, "decision_context");
requiredText(data.segment_definition, "segment_definition");
requiredText(data.recruitment_criteria, "recruitment_criteria");

if (!Array.isArray(data.discussion_guide) || data.discussion_guide.length < 4) {
  errors.push("discussion_guide يجب أن يحتوي أربعة أسئلة محايدة على الأقل");
} else {
  data.discussion_guide.forEach((question, index) => {
    requiredText(question, `discussion_guide[${index}]`, 8);
    if (leadingQuestionPattern.test(String(question))) errors.push(`discussion_guide[${index}] سؤال بيع أو سؤال موجّه؛ اسأل عن تجربة سابقة بدل النية`);
  });
}

if (!isObject(data.consent) || data.consent.confirmed !== true) errors.push("يجب توثيق موافقة المشاركين قبل تحليل ملاحظاتهم");
requiredText(data.consent?.use_scope, "consent.use_scope");
requiredText(data.consent?.retention_and_deletion, "consent.retention_and_deletion");

const sessions = Array.isArray(data.sessions) ? data.sessions : [];
const excludedSessions = Array.isArray(data.excluded_sessions) ? data.excluded_sessions : [];
const claims = Array.isArray(data.claims) ? data.claims : [];
const openQuestions = Array.isArray(data.open_questions) ? data.open_questions : [];

if (!Array.isArray(data.sessions) || sessions.length === 0) {
  errors.push("يجب إضافة جلسة مؤهلة واحدة على الأقل، أو استخدام قالب خطة البحث بدل ادعاء النتائج");
}

const qualifiedIds = new Set();
for (const [index, session] of sessions.entries()) {
  const label = `الجلسة المؤهلة ${index + 1}`;
  if (!isObject(session)) {
    errors.push(`${label}: يجب أن تكون كائنًا`);
    continue;
  }
  if (!/^P-\d{2,}$/.test(session.participant_id ?? "")) errors.push(`${label}: participant_id يجب أن يكون مجهّلًا مثل P-01`);
  if (qualifiedIds.has(session.participant_id)) errors.push(`${label}: participant_id مكرر`);
  qualifiedIds.add(session.participant_id);
  if (session.qualified !== true) errors.push(`${label}: انقل غير المؤهل إلى excluded_sessions ولا تدخله في التحليل`);
  validDate(session.date, `${label}.date`);
  for (const key of ["problem_episode", "observed_behavior", "current_alternative", "impact"]) {
    requiredText(session[key], `${label}.${key}`, 4);
  }
  if (futureIntentPattern.test(String(session.observed_behavior ?? ""))) errors.push(`${label}.observed_behavior يصف نية مستقبلية لا سلوكًا حدث فعلًا`);
  if (!validSourceRef(session.source_ref)) errors.push(`${label}.source_ref يجب أن يكون رابط HTTPS أو مرجعًا داخليًا مع # مثل notes/P-01#episode-1`);
}

const excludedIds = new Set();
if (data.excluded_sessions !== undefined && !Array.isArray(data.excluded_sessions)) errors.push("excluded_sessions يجب أن تكون مصفوفة");
for (const [index, session] of excludedSessions.entries()) {
  const label = `الجلسة المستبعدة ${index + 1}`;
  if (!isObject(session)) {
    errors.push(`${label}: يجب أن تكون كائنًا`);
    continue;
  }
  if (!/^P-\d{2,}$/.test(session.participant_id ?? "")) errors.push(`${label}: participant_id يجب أن يكون مجهّلًا مثل P-03`);
  if (qualifiedIds.has(session.participant_id) || excludedIds.has(session.participant_id)) errors.push(`${label}: participant_id مكرر أو مستخدم في الجلسات المؤهلة`);
  excludedIds.add(session.participant_id);
  validDate(session.date, `${label}.date`);
  requiredText(session.exclusion_reason, `${label}.exclusion_reason`, 6);
}

const classifications = new Set(["single_signal", "repeated_observation", "contradicted"]);
const claimIds = new Set();
for (const [index, claim] of claims.entries()) {
  const label = `الادعاء ${index + 1}`;
  if (!isObject(claim)) {
    errors.push(`${label}: يجب أن يكون كائنًا`);
    continue;
  }
  requiredText(claim.id, `${label}.id`, 3);
  if (claimIds.has(claim.id)) errors.push(`${label}.id مكرر`);
  claimIds.add(claim.id);
  requiredText(claim.statement, `${label}.statement`);
  if (futureIntentPattern.test(String(claim.statement ?? ""))) errors.push(`${label}.statement يحوّل نية مستقبلية إلى ادعاء؛ اربطه بسلوك حدث فعلًا أو صنّفه سؤالًا مفتوحًا`);
  requiredText(claim.decision_relevance, `${label}.decision_relevance`, 8);
  requiredText(claim.limitation, `${label}.limitation`);
  if (!classifications.has(claim.classification)) errors.push(`${label}: classification غير صالح`);
  if (!Array.isArray(claim.supporting_participant_ids) || !Array.isArray(claim.contradicting_participant_ids)) {
    errors.push(`${label}: قوائم المؤيدين والمعارضين مطلوبة`);
    continue;
  }
  const supporting = [...new Set(claim.supporting_participant_ids)];
  const contradicting = [...new Set(claim.contradicting_participant_ids)];
  if (supporting.some((id) => !qualifiedIds.has(id)) || contradicting.some((id) => !qualifiedIds.has(id))) errors.push(`${label}: يحتوي مرجع مشارك غير موجود ضمن الجلسات المؤهلة`);
  if (supporting.some((id) => contradicting.includes(id))) errors.push(`${label}: لا يجوز أن يكون المشارك نفسه مؤيدًا ومعارضًا للادعاء`);
  if (claim.classification === "single_signal" && (supporting.length !== 1 || contradicting.length !== 0)) errors.push(`${label}: الإشارة المنفردة تحتاج مؤيدًا واحدًا دون معارض`);
  if (claim.classification === "repeated_observation" && (supporting.length < 2 || contradicting.length !== 0)) errors.push(`${label}: الملاحظة المتكررة تحتاج مصدرين مستقلين على الأقل ودون دليل معارض؛ استخدم contradicted عند التعارض`);
  if (claim.classification === "contradicted" && (supporting.length === 0 || contradicting.length === 0)) errors.push(`${label}: الادعاء المتعارض يحتاج أدلة مؤيدة ومعارضة`);
}

if (!Array.isArray(data.claims) || claims.length === 0) errors.push("أضف ادعاءً بحثيًا واحدًا على الأقل مرتبطًا بالأدلة");
if (!Array.isArray(data.open_questions) || openQuestions.length === 0) {
  errors.push("أضف سؤالًا مفتوحًا أو فجوة تعلم واحدة على الأقل");
} else {
  openQuestions.forEach((question, index) => requiredText(question, `open_questions[${index}]`, 8));
}

const decisions = new Set(["continue_round", "revise_research", "handoff_to_idea_validation"]);
if (!decisions.has(data.next_decision)) {
  errors.push("next_decision يجب أن يكون continue_round أو revise_research أو handoff_to_idea_validation");
}
if (data.next_decision === "handoff_to_idea_validation") {
  if (!Array.isArray(data.decision_claim_ids) || data.decision_claim_ids.length === 0) {
    errors.push("decision_claim_ids مطلوب عند التمرير إلى تحقق الفكرة");
  } else {
    const decisionClaims = data.decision_claim_ids.map((id) => claims.find((claim) => claim.id === id));
    if (decisionClaims.some((claim) => !claim)) errors.push("decision_claim_ids يحتوي ادعاءً غير موجود");
    if (decisionClaims.some((claim) => claim && claim.classification !== "repeated_observation")) errors.push("كل ادعاء قرار عند التمرير يجب أن يكون ملاحظة متكررة بلا تعارض");
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  valid: true,
  qualified_sessions: sessions.length,
  excluded_sessions: excludedSessions.length,
  claims: claims.length,
  classifications: Object.fromEntries([...classifications].map((type) => [type, claims.filter((claim) => claim.classification === type).length])),
  next_decision: data.next_decision,
}, null, 2));
