#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown) {
  const errors = [];
  for (const h of ["## قرار الجاهزية", "## الهدف التجاري", "## الجمهور والدليل", "## العرض وقابلية الوفاء", "## الرسالة والادعاءات", "## خطة القنوات", "## سجل الأصول", "## عقد القياس", "## المخاطر والموافقات", "## ما لم يُنفذ"]) if (!markdown.includes(h)) errors.push(`قسم مفقود: ${h}`);
  if (!/(جاهز للإنتاج|غير جاهز للإنتاج)/.test(markdown)) errors.push("قرار الجاهزية غير صريح");
  for (const term of ["حدث القياس", "الحارس", "الوجهة", "الموافقة"]) if (!markdown.includes(term)) errors.push(`عنصر مفقود: ${term}`);
  if (/(خصم|شحن مجاني|كاش باك)/.test(markdown) && !/(العرض|المعتمد|حتى)/.test(markdown)) errors.push("عرض بلا توثيق أو مدة");
  if (/(تم الإطلاق|تم تفعيل|تم صرف)/.test(markdown)) errors.push("ادعاء تنفيذ غير مسموح");
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const errors = validate(fs.readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
