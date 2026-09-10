#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown) {
  const errors = [];
  const requiredSections = ["## الهدف والفكرة", "## سجل الحقائق", "## الخطاف والنص", "## قائمة اللقطات", "## إعداد التصوير", "## خطة المونتاج", "## الكابشن والدعوة", "## فحص ما قبل النشر", "## ما لم يُنفذ"];
  for (const heading of requiredSections) if (!markdown.includes(heading)) errors.push(`قسم مفقود: ${heading}`);
  const domainChecks = [
    [!/9:16/.test(markdown), "الوضع الرأسي 9:16 غير محدد"],
    [!/(قائمة اللقطات[\s\S]*(الحقيقة المثبتة|المصدر)|(?:لقطة|مشهد)[\s\S]*(?:حقيقة|المصدر))/.test(markdown), "اللقطات غير مرتبطة بحقيقة أو مصدر"],
    [!/(CTA|الدعوة|اطلب|اكتشف|شاهد)/.test(markdown), "الدعوة التالية مفقودة"],
    [/(ترند الآن|مضمون|الأفضل|يعالج|يشفي)/.test(markdown), "ادعاء أو ترند غير موثق"],
    [/(تم النشر|تم التصوير|صورنا الفيديو)/.test(markdown), "ادعاء تنفيذ غير مسموح"],
  ];
  for (const [failed, message] of domainChecks) if (failed) errors.push(message);
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const errors = validate(fs.readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
