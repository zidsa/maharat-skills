#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown) {
  const errors = [];
  const headings = ["## النطاق وسجل الحقائق", "## اختيار الصفحات والعينة", "## جدول الحالي والمقترح", "## تعارضات يجب عدم نشرها", "## معاينة الدفعة والموافقة", "## القياس والتحقق", "## ما لم يُنفذ"];
  for (const heading of headings) if (!markdown.includes(heading)) errors.push(`قسم مفقود: ${heading}`);
  if (!/\| الصفحة \|/.test(markdown)) errors.push("جدول صفحات الدفعة مفقود");
  if (!/(مصدر الحقائق|سجل الحقائق)/.test(markdown)) errors.push("مصدر الحقائق مفقود");
  if (/(حجم بحث\s*[:=]?\s*\d|منافسة منخفضة|المركز الأول|نضمن الترتيب|تمت الفهرسة)/.test(markdown)) errors.push("ادعاء SEO غير موثق أو تنفيذ غير متحقق");
  if (!/لم تُعدّل|لم ينفذ|لم يُنفذ/.test(markdown)) errors.push("حالة التنفيذ غير مصرح بها");
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const errors = validate(fs.readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
