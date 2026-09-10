#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown) {
  const errors = [];
  const requiredSections = ["## الهدف والاستخدام", "## فجوات الصور الحالية", "## قائمة اللقطات", "## إعداد المشهد والمعدات", "## دليل التنفيذ", "## المقاسات والاقتصاص", "## النص البديل", "## معايير القبول", "## ما لم يُنفذ"];
  for (const heading of requiredSections) if (!markdown.includes(heading)) errors.push(`قسم مفقود: ${heading}`);
  const domainChecks = [
    [!/(الحقيقة المثبتة|المصدر)/.test(markdown), "اللقطات بلا حقيقة أو مصدر"],
    [!/(لون|شكل).*(مطابق|لا تغيّر|مطابقة)/s.test(markdown), "حماية شكل أو لون المنتج مفقودة"],
    [!/## النص البديل[\s\S]+?(?=\n## |$)/.test(markdown), "النص البديل مفقود"],
    [/(أضف ملحقات|حسّن شكل المنتج|غيّر اللون)/.test(markdown), "تغيير غير مسموح للمنتج"],
    [/(تم التصوير|تم تعديل الصور|تم الرفع)/.test(markdown), "ادعاء تنفيذ غير مسموح"],
  ];
  for (const [failed, message] of domainChecks) if (failed) errors.push(message);
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const errors = validate(fs.readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
