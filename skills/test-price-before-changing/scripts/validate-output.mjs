#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown) {
  const errors = [];
  const headings = ["## النطاق والحقائق", "## معادلة الهامش الحالية", "## سيناريوهات القرار", "## ما لا يثبت السعر وحده", "## تجربة محدودة قبل التعميم", "## ما لم يُنفذ"];
  for (const heading of headings) if (!markdown.includes(heading)) errors.push(`قسم مفقود: ${heading}`);
  if (!/\| بند \| القيمة \| المصدر \|/.test(markdown)) errors.push("معادلة الهامش بلا جدول مصادر");
  if (!/(شرط التوقف|الحارس)/.test(markdown)) errors.push("تجربة السعر بلا حارس أو شرط توقف");
  if (/التكلفة[^\n]*غير متاح[\s\S]{0,480}(?:سعر مقترح|[0-9]+\s*ريال)/.test(markdown)) errors.push("اقتراح سعر رقمي رغم غياب التكلفة");
  if (/(تم تعديل السعر|تم تفعيل العرض|سيزيد المبيعات حتمًا)/.test(markdown)) errors.push("ادعاء تنفيذ أو نتيجة سعر غير مسموح");
  if (!/لم يتغير|لم يُنفذ|لم ينفذ/.test(markdown)) errors.push("حالة التنفيذ غير مصرح بها");
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const errors = validate(fs.readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
