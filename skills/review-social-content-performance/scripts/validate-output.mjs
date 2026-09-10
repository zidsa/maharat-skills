#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown) {
  const errors = [];
  const requiredSections = ["## النطاق وجودة البيانات", "## تعريف المقاييس والمقامات", "## جدول المقارنة", "## ما يستحق التكرار", "## ما يحتاج تعديلًا أو إيقافًا", "## الاستنتاجات وحدود الإسناد", "## الاختبارات الثلاثة التالية", "## المجهولات وما لم يُنفذ"];
  for (const heading of requiredSections) if (!markdown.includes(heading)) errors.push(`قسم مفقود: ${heading}`);
  const domainChecks = [
    [!/(البسط|المقام)/.test(markdown), "المعدلات بلا بسط أو مقام"],
    [!/(الفترة|العمر)/.test(markdown), "نافذة المقارنة مفقودة"],
    [!/(الإسناد|منسوب|رابط موسوم)/.test(markdown), "حدود الإسناد مفقودة"],
    [/(باع بسبب|سبب المبيعات|حقق مبيعات)/.test(markdown) && !/(إسناد|رابط موسوم|transaction_id)/.test(markdown), "إسناد مبيعات غير مثبت"],
    [/(متوسط القطاع|المعيار العالمي)/.test(markdown), "معيار غير موثق"],
  ];
  for (const [failed, message] of domainChecks) if (failed) errors.push(message);
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const errors = validate(fs.readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
