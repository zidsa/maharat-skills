#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown, orders = []) {
  const errors = [];
  for (const heading of ["## لقطة النطاق", "## طابور الطلبات", "## الإجراء التالي", "## ما تعذر حسمه"]) {
    if (!markdown.includes(heading)) errors.push(`قسم مفقود: ${heading}`);
  }
  if (!markdown.includes("action_key")) errors.push("طابور الطلبات يحتاج action_key");
  if (!/الحقيقة المرصودة/.test(markdown) || !/المالك/.test(markdown) || !/الموعد/.test(markdown)) errors.push("عقد الطابور غير مكتمل");
  if (/(اسم العميل|رقم الجوال|البريد الإلكتروني|عنوان العميل)/.test(markdown)) errors.push("بيانات شخصية غير مسموحة");
  for (const order of orders) if (order.id && !markdown.includes(order.id)) errors.push(`الطلب غير ممثل: ${order.id}`);
  if (/(تم الإلغاء|تم رد المبلغ|تم إرسال)/.test(markdown)) errors.push("النتيجة تدعي تنفيذ إجراء");
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const markdown = fs.readFileSync(process.argv[2], "utf8");
  const orders = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], "utf8")).orders ?? [] : [];
  const errors = validate(markdown, orders);
  console.log(JSON.stringify({ valid: errors.length === 0, errors }, null, 2));
  if (errors.length) process.exit(1);
}
