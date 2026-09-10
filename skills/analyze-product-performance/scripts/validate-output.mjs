#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown) {
  const errors = [];
  const headings = ["## النطاق وجودة البيانات", "## تعريف المقاييس والمقامات", "## جدول أداء المنتجات", "## قرار كل منتج ودليله", "## أولويات الأسبوع", "## المخاطر والحراس", "## المجهولات وما لم يُنفذ"];
  for (const heading of headings) if (!markdown.includes(heading)) errors.push(`قسم مفقود: ${heading}`);
  if (!/(الفترة|من.*إلى)/.test(markdown)) errors.push("فترة التحليل مفقودة");
  if (!/(البسط|المقام)/.test(markdown)) errors.push("تعريف المقاييس غير مكتمل");
  if (!/(التكلفة|الهامش).*(غير متوفر|غير متحقق|ر\.س|ريال)/s.test(markdown)) errors.push("حالة التكلفة أو الهامش غير واضحة");
  if (!/(حافظ|حسّن|اختبر|راجع|أعد الطلب|اجمع بيانات)/.test(markdown)) errors.push("قرار المنتج مفقود");
  if (/(تم تعديل|تم طلب المخزون|السبب المؤكد)/.test(markdown)) errors.push("ادعاء تنفيذ أو سبب غير مثبت");
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const errors = validate(fs.readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
