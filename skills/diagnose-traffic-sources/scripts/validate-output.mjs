#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown) {
  const errors = [];
  const headings = ["## نطاق التقرير وجودة البيانات", "## جدول القنوات", "## أين يتوقف العميل", "## قرار لكل قناة", "## تجربة واحدة للفترة التالية", "## ما لم يُنفذ"];
  for (const heading of headings) if (!markdown.includes(heading)) errors.push(`قسم مفقود: ${heading}`);
  if (!/\| القناة \|/.test(markdown)) errors.push("جدول القنوات مفقود");
  if (!/(أصلح|اختبر|راقب|لا تحكم)/.test(markdown)) errors.push("قرارات القنوات غير صريحة");
  if (/التكلفة[^\n]*غير متاح[\s\S]{0,280}(?:ROAS\s*[:=]?\s*\d|CAC\s*[:=]?\s*\d)/.test(markdown)) errors.push("حساب تكلفة مع غياب تكلفة موثقة");
  if (/(تم رفع الميزانية|تم إيقاف الحملة|ضاعف الميزانية)/.test(markdown)) errors.push("ادعاء تنفيذ حملات غير مسموح");
  if (!/لم تُغيّر|لم ينفذ|لم يُنفذ/.test(markdown)) errors.push("حالة التنفيذ غير مصرح بها");
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const errors = validate(fs.readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
