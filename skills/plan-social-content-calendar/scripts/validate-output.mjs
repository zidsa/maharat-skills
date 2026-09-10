#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown) {
  const errors = [];
  for (const h of ["## مبادئ الفترة", "## سجل الأفكار", "## تقويم الإنتاج والنشر", "## حمل العمل", "## إعادة الاستخدام", "## المؤجل والموانع", "## ما لم يُنفذ"]) if (!markdown.includes(h)) errors.push(`قسم مفقود: ${h}`);
  for (const term of ["الدليل", "مالك الإنتاج", "المراجع", "تسليم", "نشر", "القياس", "الحالة"]) if (!markdown.includes(term)) errors.push(`حقل مفقود: ${term}`);
  if (!/\d+\/\d+/.test(markdown)) errors.push("حمل العمل غير محسوب");
  if (/(تم النشر|نُشر المحتوى|تمت الجدولة في المنصة)/.test(markdown)) errors.push("ادعاء تنفيذ غير مسموح");
  if (/30 منشور/.test(markdown) && !/القدرة/.test(markdown)) errors.push("عدد محتوى بلا فحص قدرة");
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const errors = validate(fs.readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
