#!/usr/bin/env node
import fs from "node:fs";

const gates = ["الهدف", "العرض", "المخزون", "الوجهة", "القياس", "الأصول والسياسة", "الميزانية", "التشغيل"];

export function validate(markdown) {
  const errors = [];
  for (const h of ["## القرار النهائي", "## نسخة الفحص", "## مصفوفة البوابات", "## الموانع الحرجة", "## الإصلاحات المرتبة", "## خطة التحقق", "## ما لم يُنفذ"]) if (!markdown.includes(h)) errors.push(`قسم مفقود: ${h}`);
  if (!/(تشغيل مشروط|إيقاف|تشغيل)/.test(markdown)) errors.push("القرار النهائي غير صريح");
  for (const gate of gates) if (!markdown.includes(`| ${gate} |`)) errors.push(`بوابة مفقودة: ${gate}`);
  if (!/(اجتاز|مشروط|فشل)/.test(markdown)) errors.push("نتائج البوابات غير محددة");
  if (/(تم التفعيل|تم صرف|تم رفع الأصول)/.test(markdown)) errors.push("ادعاء تنفيذ غير مسموح");
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const errors = validate(fs.readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
