#!/usr/bin/env node
import fs from "node:fs";
export function validate(markdown) {
  const errors = [];
  const headings = ["## النطاق وتعريف الترك", "## الأهلية والاستبعادات", "## تسلسل الرسائل", "## العرض والوجهة", "## التوقف ومنع التكرار", "## القياس والحراس", "## المجهولات وما لم يُنفذ"];
  for (const h of headings) if (!markdown.includes(h)) errors.push(`قسم مفقود: ${h}`);
  if (!/(موافقة|opt-in)/.test(markdown)) errors.push("موافقة التواصل مفقودة");
  if (!/(شراء|purchase).*(توقف|استبعاد)|(?:توقف|استبعاد).*(?:شراء|purchase)/s.test(markdown)) errors.push("التوقف بعد الشراء مفقود");
  if (!/(منع التكرار|idempotency)/.test(markdown)) errors.push("منع التكرار مفقود");
  if (/(050\d{7}|\+9665\d{8}|تم الإرسال|خصم مضمون)/.test(markdown)) errors.push("بيانات شخصية أو تنفيذ/عرض غير مسموح");
  return errors;
}
if (process.argv[1]?.endsWith("validate-output.mjs")) { const errors = validate(fs.readFileSync(process.argv[2], "utf8")); console.log(JSON.stringify({valid:!errors.length,errors},null,2)); if(errors.length) process.exit(1); }
