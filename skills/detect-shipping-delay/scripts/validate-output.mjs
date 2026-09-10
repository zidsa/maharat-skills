#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown, shipments = []) {
  const errors = [];
  for (const h of ["## نطاق الفحص", "## مصفوفة الشحنات", "## مسودات التواصل", "## غير قابل للحكم", "## ما لم يُنفذ"]) if (!markdown.includes(h)) errors.push(`قسم مفقود: ${h}`);
  for (const word of ["التصنيف", "الوعد ومصدره", "الدليل الزمني", "إجراء الناقل", "المالك", "الموعد"]) if (!markdown.includes(word)) errors.push(`حقل مفقود: ${word}`);
  for (const shipment of shipments) if (shipment.id && !markdown.includes(shipment.id)) errors.push(`الشحنة غير ممثلة: ${shipment.id}`);
  if (/الشحنة ضائعة/.test(markdown) && !/تأكيد الناقل/.test(markdown)) errors.push("ادعاء ضياع بلا تأكيد");
  if (/(تم التعويض|تم الإرسال|تم فتح التصعيد)/.test(markdown)) errors.push("النتيجة تدعي تنفيذًا");
  if (/(اسم العميل|الجوال|العنوان)/.test(markdown)) errors.push("بيانات شخصية غير مسموحة");
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const markdown = fs.readFileSync(process.argv[2], "utf8");
  const shipments = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], "utf8")).shipments ?? [] : [];
  const errors = validate(markdown, shipments);
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
