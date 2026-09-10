#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.dirname(scriptDir);
const validator = path.join(scriptDir, "validate-research-round.mjs");
const base = JSON.parse(fs.readFileSync(path.join(skillDir, "examples/example-research.json"), "utf8"));
const clone = () => structuredClone(base);

const cases = [
  { name: "valid example", mutate: () => {}, status: 0, includes: '"valid": true' },
  { name: "valid excluded log", mutate: (data) => { data.excluded_sessions = [{ participant_id: "P-03", date: "2026-07-30", exclusion_reason: "لم ينفذ طلب عبوات خلال الفترة المطلوبة" }]; }, status: 0, includes: '"excluded_sessions": 1' },
  { name: "malformed root", make: () => [], mutate: () => {}, status: 1, includes: "الجذر" },
  { name: "missing consent", mutate: (data) => { data.consent.confirmed = false; }, status: 1, includes: "موافقة" },
  { name: "missing discussion guide", mutate: (data) => { data.discussion_guide = ["سؤال واحد"]; }, status: 1, includes: "أربعة أسئلة" },
  { name: "direct PII in session", mutate: (data) => { data.sessions[0].observed_behavior = "راسل test@example.com لطلب الكمية"; }, status: 1, includes: "اسمًا أو بريدًا" },
  { name: "direct PII in claim", mutate: (data) => { data.claims[0].statement = "أكد test@example.com أن النقص يتكرر أسبوعيًا"; }, status: 1, includes: "اسمًا أو بريدًا" },
  { name: "explicit name in claim", mutate: (data) => { data.claims[0].statement = "قال عميل-اختبار إن النقص يتكرر أسبوعيًا"; }, status: 1, includes: "اسمًا أو بريدًا" },
  { name: "formatted phone", mutate: (data) => { data.claims[0].limitation = "راجع الرقم +966 55 123 4567 قبل الجولة التالية"; }, status: 1, includes: "رقم جوال" },
  { name: "national identity field", mutate: (data) => { data.sessions[0].national_id = "1234567890"; }, status: 1, includes: "حقل اتصال مباشر" },
  { name: "future intent as behavior", mutate: (data) => { data.sessions[0].observed_behavior = "سوف يشتري اشتراكًا إذا توفر مستقبلًا"; }, status: 1, includes: "نية مستقبلية" },
  { name: "attached future intent", mutate: (data) => { data.sessions[0].observed_behavior = "العميل سيشتري اشتراك التوريد إذا توفر"; data.sessions[1].observed_behavior = "العميل سيشتري اشتراك التوريد إذا توفر"; data.claims[0].statement = "العملاء سيشترون اشتراك التوريد إذا توفر"; data.next_decision = "handoff_to_idea_validation"; data.decision_claim_ids = ["claim-reorder-trigger"]; }, status: 1, includes: "نية مستقبلية" },
  { name: "leading sales guide", mutate: (data) => { data.discussion_guide = ["هل ستشتري اشتراكنا؟", "هل يعجبك الحل؟", "كم ستدفع؟", "لو وفرنا تنبيهًا هل ستستخدمه؟"]; }, status: 1, includes: "سؤال بيع" },
  { name: "false repeated pattern", mutate: (data) => { data.claims[0].supporting_participant_ids = ["P-01"]; }, status: 1, includes: "مصدرين مستقلين" },
  { name: "missing contradiction", mutate: (data) => { data.claims[0].classification = "contradicted"; }, status: 1, includes: "مؤيدة ومعارضة" },
  { name: "overlapping evidence", mutate: (data) => { data.claims[0].classification = "contradicted"; data.claims[0].contradicting_participant_ids = ["P-01"]; }, status: 1, includes: "مؤيدًا ومعارضًا" },
  { name: "repeated with opposing evidence", mutate: (data) => { data.claims[0].contradicting_participant_ids = ["P-02"]; }, status: 1, includes: "استخدم contradicted" },
  { name: "handoff from one signal", mutate: (data) => { data.claims[0].classification = "single_signal"; data.claims[0].supporting_participant_ids = ["P-01"]; data.next_decision = "handoff_to_idea_validation"; data.decision_claim_ids = ["claim-reorder-trigger"]; }, status: 1, includes: "كل ادعاء قرار" },
  { name: "handoff cannot hide primary contradiction", mutate: (data) => { data.claims[0].classification = "contradicted"; data.claims[0].contradicting_participant_ids = ["P-02"]; data.claims.push({ ...structuredClone(data.claims[0]), id: "claim-unrelated", statement: "ظهر سلوك آخر غير مرتبط بالقرار في الجلستين", decision_relevance: "لا يغير قرار اختبار توقيت إعادة الطلب", classification: "repeated_observation", contradicting_participant_ids: [] }); data.next_decision = "handoff_to_idea_validation"; data.decision_claim_ids = ["claim-reorder-trigger"]; }, status: 1, includes: "كل ادعاء قرار" },
  { name: "future session", mutate: (data) => { data.sessions[0].date = "2099-01-01"; }, status: 1, includes: "المستقبل" },
  { name: "impossible calendar date", mutate: (data) => { data.sessions[0].date = "2026-02-30"; }, status: 1, includes: "تقويميًا" },
  { name: "unqualified participant", mutate: (data) => { data.sessions[0].qualified = false; }, status: 1, includes: "excluded_sessions" },
  { name: "weak source reference", mutate: (data) => { data.sessions[0].source_ref = "none"; }, status: 1, includes: "source_ref" },
  { name: "fake short internal reference", mutate: (data) => { data.sessions[0].source_ref = "abc#def"; }, status: 1, includes: "source_ref" },
  { name: "sessions wrong container", mutate: (data) => { data.sessions = {}; }, status: 1, includes: "جلسة مؤهلة" },
  { name: "claims wrong container", mutate: (data) => { data.claims = {}; }, status: 1, includes: "ادعاءً بحثيًا" },
];

for (const testCase of cases) {
  const data = testCase.make ? testCase.make() : clone();
  testCase.mutate(data);
  const result = spawnSync(process.execPath, [validator, "-"], {
    input: JSON.stringify(data),
    encoding: "utf8",
  });
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.status !== testCase.status || !output.includes(testCase.includes)) {
    console.error(`FAIL ${testCase.name}\n${output}`);
    process.exit(1);
  }
  console.log(`PASS ${testCase.name}`);
}
