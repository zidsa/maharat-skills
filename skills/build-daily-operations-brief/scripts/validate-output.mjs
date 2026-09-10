#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown) {
  const errors = [];
  for (const h of ["## لقطة الوردية", "## الأولويات الثلاث", "## المراقبة", "## القرارات المطلوبة", "## التسليم بين الملاك", "## فجوات المصدر", "## ما لم يُنفذ"]) if (!markdown.includes(h)) errors.push(`قسم مفقود: ${h}`);
  const priorities = markdown.match(/## الأولويات الثلاث\n([\s\S]*?)(?=\n## )/)?.[1]?.match(/^\d+\.\s.+$/gm) ?? [];
  if (priorities.length === 0 || priorities.length > 3) errors.push("يجب أن تكون الأولويات من 1 إلى 3");
  for (const term of ["action_key", "المالك الحالي", "المالك المستلم", "موعد التحديث", "دليل الإغلاق"]) if (!markdown.includes(term)) errors.push(`حقل تسليم مفقود: ${term}`);
  if (/(تم تحديث الطلب|تم إرسال|تم إنشاء طلب شراء)/.test(markdown)) errors.push("ادعاء تنفيذ غير مسموح");
  if (/(اسم العميل|الجوال|العنوان)/.test(markdown)) errors.push("بيانات شخصية غير مسموحة");
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const errors = validate(fs.readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
