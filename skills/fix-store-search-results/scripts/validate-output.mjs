#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown) {
  const errors = [];
  const headings = ["## النطاق والأدلة", "## تشخيص الكلمات", "## قرارات المطابقة", "## معاينة التغييرات فقط", "## القياس بعد المراجعة", "## ما لم يُنفذ"];
  for (const heading of headings) if (!markdown.includes(heading)) errors.push(`قسم مفقود: ${heading}`);
  if (!/\| كلمة البحث \|/.test(markdown)) errors.push("جدول الكلمات أو المطابقات مفقود");
  if (!/(لا تربط|أضف مرادفًا|حسّن التسمية|سجّل)/.test(markdown)) errors.push("لا توجد قرارات مطابقة صريحة");
  if (/(تم التفعيل|فُعّلت المرادفات|اختفت النتائج الصفرية)/.test(markdown)) errors.push("ادعاء تنفيذ أو نتيجة غير متحقق");
  if (!/لم يتفعل|لم يُنفذ|لم يتغير/.test(markdown)) errors.push("حالة التنفيذ غير مصرح بها");
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const errors = validate(fs.readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
