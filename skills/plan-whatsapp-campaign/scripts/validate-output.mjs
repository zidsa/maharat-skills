#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown) {
  const errors = [];
  const requiredSections = ["## الهدف والعرض", "## الشريحة ودليل الموافقة", "## الأهلية والاستبعادات", "## الرسالة الأساسية", "## المتابعة الواحدة", "## شرط التوقف", "## القياس وحارس الجودة", "## ما لم يُنفذ"];
  for (const heading of requiredSections) if (!markdown.includes(heading)) errors.push(`قسم مفقود: ${heading}`);
  const domainChecks = [
    [!/(opt-in|موافقة)/.test(markdown), "دليل الموافقة مفقود"],
    [!/(إلغاء الاشتراك|التوقف|اشترى)/.test(markdown), "شرط التوقف أو الاستبعاد مفقود"],
    [!/(القياس|طلب|زيارة)/.test(markdown), "القياس مفقود"],
    [/05\d{8}|\+9665\d{8}|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/.test(markdown), "بيانات شخصية ظاهرة"],
    [/(تم الإرسال|أرسلنا الرسائل)/.test(markdown), "ادعاء إرسال غير مسموح"],
    [/(خصم|مجاني|آخر فرصة)/.test(markdown) && !/(معتمد|المصدر|حتى 17 أغسطس)/.test(markdown), "عرض أو ندرة بلا مصدر"],
  ];
  for (const [failed, message] of domainChecks) if (failed) errors.push(message);
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const errors = validate(fs.readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
