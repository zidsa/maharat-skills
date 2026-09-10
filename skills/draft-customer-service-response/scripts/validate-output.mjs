#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown) {
  const errors = [];
  for (const h of ["## ملخص داخلي", "## مسودة الرد", "## متغيرات قبل الإرسال", "## الموافقات المطلوبة", "## حالة الجاهزية", "## ما لم يُنفذ"]) if (!markdown.includes(h)) errors.push(`قسم مفقود: ${h}`);
  if (!/(جاهز للمراجعة|محجوب)/.test(markdown)) errors.push("حالة الجاهزية غير محددة");
  if (!/حقائق مؤكدة/.test(markdown) || !/سياسة مستخدمة/.test(markdown)) errors.push("الرد غير مربوط بالحقيقة والسياسة");
  if (/(تم إرسال|أرسلنا لك التعويض|تم رد المبلغ)/.test(markdown)) errors.push("ادعاء تنفيذ غير مسموح");
  if (/(رقم البطاقة|رمز التحقق|CVV)/i.test(markdown)) errors.push("طلب بيانات حساسة");
  if (/أكيد|مضمون 100٪/.test(markdown)) errors.push("وعد قطعي غير موثق");
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const errors = validate(fs.readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
