#!/usr/bin/env node
import fs from "node:fs";

const file = process.argv[2];
if (!file) { console.error("الاستخدام: node scripts/validate-brand-system.mjs <input.json>"); process.exit(2); }
const x = JSON.parse(fs.readFileSync(file, "utf8"));
const errors = [];
const refPattern = /^(https:\/\/[^\s]+|[A-Za-z0-9._-]+\/[A-Za-z0-9_./-]+#[A-Za-z0-9_.:/-]+)$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const sourceIds = new Set();
for (const s of x.source_register || []) {
  if (!s.id || sourceIds.has(s.id)) errors.push(`مصدر مكرر أو بلا معرف: ${s.id || "بدون معرف"}`);
  sourceIds.add(s.id);
  if (!refPattern.test(s.url_or_path || "")) errors.push(`${s.id}: رابط أو مسار المصدر غير صالح`);
  if (!datePattern.test(s.observed_at || "") || Number.isNaN(Date.parse(s.observed_at))) errors.push(`${s.id}: observed_at غير صالح`);
  if (!s.scope) errors.push(`${s.id}: نطاق المصدر مفقود`);
}
if (x.schema_version !== 2) errors.push("schema_version يجب أن يساوي 2");
if (!x.market || !x.language || !["rtl","ltr"].includes(x.direction)) errors.push("market وlanguage وdirection مطلوبة");
if (!["draft","review_ready"].includes(x.status)) errors.push("status غير صالح");
const owner = x.brand_owner || {};
if (!owner.name || !["merchant_owned","licensed","platform_owned"].includes(owner.relationship)) errors.push("brand_owner.name وrelationship صالحان مطلوبان");
if (!owner.authorization_ref || !sourceIds.has(owner.authorization_ref)) errors.push("brand_owner.authorization_ref يجب أن يشير إلى مصدر موجود");
for (const key of ["segment","category","alternative"]) if (!x.positioning?.[key]) errors.push(`positioning.${key} مطلوب`);
for (const r of x.positioning?.source_refs || []) if (!sourceIds.has(r)) errors.push(`مرجع تموضع غير موجود: ${r}`);
if (!(x.positioning?.source_refs || []).length) errors.push("التموضع يحتاج مصدرًا معتمدًا");

const claims = new Map();
for (const c of x.approved_claims || []) {
  if (!c.id || claims.has(c.id)) errors.push(`ادعاء مكرر أو بلا معرف: ${c.id || "بدون معرف"}`);
  claims.set(c.id, c);
  if (!c.text) errors.push(`${c.id}: نص الادعاء مفقود`);
  if (!(c.evidence_refs || []).length) errors.push(`${c.id}: الادعاء بلا دليل`);
  for (const r of c.evidence_refs || []) if (!sourceIds.has(r)) errors.push(`${c.id}: مرجع دليل غير موجود ${r}`);
}
if (!claims.size) errors.push("approved_claims مطلوبة");
const checkClaimRefs = (owner, refs = []) => { for (const r of refs) if (!claims.has(r)) errors.push(`${owner}: مرجع ادعاء غير موجود ${r}`); };
if (!x.brand_promise?.text) errors.push("brand_promise.text مطلوب");
if (!(x.brand_promise?.claim_refs || []).length) errors.push("وعد العلامة يحتاج ادعاءً معتمدًا");
checkClaimRefs("brand_promise", x.brand_promise?.claim_refs);

const messages = x.message_hierarchy || [];
const roles = new Set(messages.map(m => m.role));
for (const role of ["primary","proof","cta"]) if (!roles.has(role)) errors.push(`هرم الرسائل يفتقد الدور ${role}`);
const banned = /(الأفضل|الأرخص|رقم\s*1|الأول\s+بلا|مضمون(?:ة)?\s*100\s*%|لا\s+مثيل|بلا\s+منافس)/i;
const normalize = value => String(value || "").replace(/[\s،,؛;:.!؟?]+/g," ").trim().toLowerCase();
const hasApprovedAbsolute = (text, refs = []) => {
  const normalized = normalize(text);
  return refs.some(id => {
    const claim = claims.get(id);
    const allowed = [claim?.text,...(claim?.approved_copy || [])].filter(Boolean);
    return allowed.some(copy => normalize(copy) === normalized && banned.test(copy));
  });
};
for (const m of messages) {
  if (!m.id || !m.text || !["primary","supporting","proof","cta"].includes(m.role)) errors.push("رسالة ناقصة أو بدور غير صالح");
  checkClaimRefs(m.id || "message", m.claim_refs);
  if (banned.test(m.text) && !hasApprovedAbsolute(m.text,m.claim_refs)) errors.push(`${m.id}: ادعاء مطلق غير معتمد بالنص نفسه`);
  if (m.role === "proof" && !(m.claim_refs || []).length) errors.push(`${m.id}: رسالة الإثبات بلا ادعاء معتمد`);
}
if (banned.test(x.brand_promise?.text || "") && !hasApprovedAbsolute(x.brand_promise.text,x.brand_promise?.claim_refs)) errors.push("وعد العلامة يحتوي ادعاءً مطلقًا غير معتمد بالنص نفسه");

const traits = x.voice_traits || [];
if (traits.length < 3 || traits.length > 5) errors.push("voice_traits يجب أن تحتوي 3–5 سمات");
const traitNames = new Set();
for (const t of traits) {
  if (!t.trait || traitNames.has(t.trait)) errors.push(`سمة نبرة مكررة أو بلا اسم: ${t.trait || "بدون اسم"}`);
  traitNames.add(t.trait);
  for (const k of ["do","dont","approved_example","avoid_example"]) if (!t[k]) errors.push(`${t.trait || "سمة"}: ${k} مطلوب`);
}

const hex = /^#[0-9A-Fa-f]{6}$/;
const visual = x.visual_system || {};
if (!["existing","proposed"].includes(visual.mode)) errors.push("visual_system.mode غير صالح");
if (!visual.identity_owner || visual.identity_owner !== owner.name) errors.push("visual_system.identity_owner يجب أن يطابق مالك العلامة");
if (!(visual.decision_basis_refs || []).length) errors.push("النظام المرئي يحتاج أساس قرار");
for (const r of visual.decision_basis_refs || []) if (!sourceIds.has(r)) errors.push(`مرجع قرار بصري غير موجود: ${r}`);
for (const c of visual.colors || []) {
  if (!c.role || !hex.test(c.value || "")) errors.push("لون بلا دور أو قيمة HEX صالحة");
  if (!sourceIds.has(c.source_ref)) errors.push(`${c.role || "لون"}: source_ref غير موجود`);
}
if ((visual.colors || []).length < 2) errors.push("يلزم لونان بدورين على الأقل");
const normalizedOwner = normalize(owner.name).replace(/\s/g,"");
const colorValues = new Set((visual.colors || []).map(c => String(c.value || "").toUpperCase()));
const matchesZidCorePalette = colorValues.has("#1F0433") && colorValues.has("#AE72FF");
if (matchesZidCorePalette && !["زد","zid"].includes(normalizedOwner)) errors.push("لوحة ألوان زد المحمية لا يجوز نسبها إلى علامة مستقلة");
const luminance = value => {
  const rgb = value.slice(1).match(/../g).map(v => parseInt(v,16)/255).map(v => v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4);
  return 0.2126*rgb[0] + 0.7152*rgb[1] + 0.0722*rgb[2];
};
for (const c of visual.contrast_checks || []) {
  if (!hex.test(c.foreground || "") || !hex.test(c.background || "") || !["normal_text","large_text","ui"].includes(c.context)) { errors.push("فحص تباين غير صالح"); continue; }
  const a=luminance(c.foreground), b=luminance(c.background), ratio=(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
  const min = c.context === "normal_text" ? 4.5 : 3;
  if (ratio < min) errors.push(`فشل التباين ${c.foreground}/${c.background}: ${ratio.toFixed(2)} أقل من ${min}`);
}
if (!(visual.contrast_checks || []).length) errors.push("يلزم فحص تباين واحد على الأقل");
for (const k of ["heading","body","source_ref"]) if (!visual.typography?.[k]) errors.push(`typography.${k} مطلوب`);
if (visual.typography?.source_ref && !sourceIds.has(visual.typography.source_ref)) errors.push("مرجع الخط غير موجود");
if (!(visual.imagery_rules || []).length || !(visual.component_principles || []).length) errors.push("قواعد الصور والمكونات مطلوبة");

const surfaces = new Set();
for (const a of x.applications || []) {
  surfaces.add(a.surface);
  if (!a.copy) errors.push(`${a.surface}: نص التطبيق مفقود`);
  checkClaimRefs(a.surface || "application", a.claim_refs);
  if (banned.test(a.copy || "") && !hasApprovedAbsolute(a.copy,a.claim_refs)) errors.push(`${a.surface}: ادعاء مطلق غير معتمد بالنص نفسه`);
  for (const t of a.voice_traits || []) if (!traitNames.has(t)) errors.push(`${a.surface}: سمة نبرة غير موجودة ${t}`);
}
for (const s of ["home","product","customer_service"]) if (!surfaces.has(s)) errors.push(`تطبيق مطلوب مفقود: ${s}`);
if (x.status === "review_ready" && (x.unknowns || []).length) errors.push("review_ready لا يسمح بمجهولات");
console.log(JSON.stringify({valid:!errors.length,errors,status:x.status},null,2));
if (errors.length) process.exit(1);
