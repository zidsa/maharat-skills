#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown, items = []) {
  const errors = [];
  for (const h of ["## نطاق البيانات", "## سجل المدخلات", "## الحسابات والقرار", "## سيناريو الضغط", "## قيود الشراء", "## فجوات تمنع القرار", "## ما لم يُنفذ"]) if (!markdown.includes(h)) errors.push(`قسم مفقود: ${h}`);
  for (const term of ["موضع المخزون", "طلب المهلة", "نقطة إعادة الطلب", "الكمية الخام", "الكمية المقترحة"]) if (!markdown.includes(term)) errors.push(`حساب مفقود: ${term}`);
  for (const item of items) if (item.sku && !markdown.includes(`| ${item.sku} |`)) errors.push(`SKU غير ممثل: ${item.sku}`);
  if (/EOQ/.test(markdown) && !/(تكلفة الطلب|لم يستخدم EOQ)/.test(markdown)) errors.push("EOQ بلا تكاليف موثقة");
  if (/(تم إنشاء طلب شراء|تم تحديث المخزون)/.test(markdown)) errors.push("ادعاء تنفيذ غير مسموح");
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const markdown = fs.readFileSync(process.argv[2], "utf8");
  const items = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], "utf8")).items ?? [] : [];
  const errors = validate(markdown, items);
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
