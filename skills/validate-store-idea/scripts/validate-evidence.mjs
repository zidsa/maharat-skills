#!/usr/bin/env node

import fs from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("الاستخدام: node scripts/validate-evidence.mjs <evidence.json>");
  process.exit(2);
}

const data = JSON.parse(fs.readFileSync(path, "utf8"));
const errors = [];

for (const key of ["hypothesis", "riskiest_assumption", "decision_gate"]) {
  if (!data[key] || String(data[key]).trim().length < 8) errors.push(`الحقل ${key} مفقود أو مختصر جدًا`);
}

if (!["continue", "modify", "pause"].includes(data.decision)) {
  errors.push("decision يجب أن يكون continue أو modify أو pause");
}

if (!Array.isArray(data.evidence) || data.evidence.length === 0) {
  errors.push("يجب إضافة دليل واحد على الأقل");
} else {
  data.evidence.forEach((item, index) => {
    for (const key of ["type", "source", "date", "observation", "supports", "does_not_prove"]) {
      if (!item[key]) errors.push(`الدليل ${index + 1}: الحقل ${key} مفقود`);
    }
  });
}

if (!Array.isArray(data.counterevidence) || data.counterevidence.length === 0) {
  errors.push("أضف دليلًا مضادًا أو فجوة صريحة؛ لا تتركها فارغة");
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("سجل الأدلة صالح بنيويًا. ما زالت صحة الأدلة تحتاج مراجعة بشرية.");
