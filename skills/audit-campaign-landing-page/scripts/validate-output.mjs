#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown) {
  const errors = [];
  const unsupportedInternalClaim = markdown
    .split("\n")
    .some((line) => /(الدفع ناجح|التحويل شغال|القياس صحيح)/.test(line) && !/(سجل الطلب|دليل خام|اختبار طلب)/.test(line));
  const requiredSections = ["## النطاق والحكم", "## تطابق الحملة والصفحة", "## أعلى الطية ومسار القرار", "## فحص الجوال", "## المشاكل والإصلاحات", "## الفحوص الداخلية غير المتحققة", "## بوابة الإطلاق", "## ما لم يُنفذ"];
  for (const heading of requiredSections) if (!markdown.includes(heading)) errors.push(`قسم مفقود: ${heading}`);
  const domainChecks = [
    [!/(الدليل|لقطة|الرابط)/.test(markdown), "الأخطاء بلا دليل"],
    [!/(CTA|الدعوة|وجهة)/.test(markdown), "فحص الوجهة مفقود"],
    [!/(غير متحقق|يحتاج MCP|اختبار طلب)/.test(markdown), "الفحوص الداخلية غير مفصولة"],
    [unsupportedInternalClaim, "ادعاء داخلي بلا دليل"],
    [/(تم الإصلاح|تم النشر|أطلقنا الحملة)/.test(markdown), "ادعاء تنفيذ غير مسموح"],
  ];
  for (const [failed, message] of domainChecks) if (failed) errors.push(message);
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const errors = validate(fs.readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
