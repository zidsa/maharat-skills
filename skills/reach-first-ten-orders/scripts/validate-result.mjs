#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const [resultPath] = process.argv.slice(2);
if (!resultPath) {
  console.error("Usage: node validate-result.mjs <result.json>");
  process.exit(2);
}

const result = JSON.parse(await readFile(resultPath, "utf8"));
const errors = [];
const statuses = new Set(["active", "blocked", "not_assessed", "complete"]);

if (result.valid !== true) errors.push("result.valid يجب أن يكون true");
if (!statuses.has(result.status)) errors.push("status غير صالح");
if (!Number.isInteger(result.verified_order_count) || result.verified_order_count < 0) errors.push("عداد الطلبات غير صالح");
if (result.verified_order_count > 10 && result.status !== "complete") errors.push("عند تجاوز 10 يجب أن تكون الرحلة مكتملة");
if (typeof result.evidence !== "string" || !result.evidence.trim()) errors.push("الدليل مفقود");
if (typeof result.next_action !== "string" || !result.next_action.trim()) errors.push("الخطوة التالية مفقودة");
if (!result.observed_at || Number.isNaN(Date.parse(result.observed_at))) errors.push("تاريخ الرصد مفقود");
if (!["mcp", "public_url", "manual"].includes(result.source)) errors.push("مصدر الرصد غير صالح");

if (result.status === "active") {
  const experiment = result.experiment;
  if (!experiment) errors.push("التجربة مطلوبة للحالة النشطة");
  for (const key of ["variable", "metric", "guardrail", "review_when"]) {
    if (typeof experiment?.[key] !== "string" || !experiment[key].trim()) errors.push(`experiment.${key} مفقود`);
  }
}

if (result.status !== "active" && result.experiment !== null) errors.push("لا تعرض تجربة قبل إزالة المانع أو بعد اكتمال الرحلة");
if (result.status === "complete" && result.handoff !== "grow-store-to-hundred-orders") errors.push("التسليم بعد 10 طلبات غير صحيح");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("✓ النتيجة مطابقة لعقد رحلة أول 10 طلبات.");
