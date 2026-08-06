#!/usr/bin/env node
import fs from "node:fs";

export function validate(markdown) {
  const errors = [];
  const seoClaimText = markdown
    .split("\n")
    .filter((line) => !/(لا يوجد|غياب|لم يتوفر|غير متحقق|لا نضمن|لم يُضمن)/.test(line))
    .join("\n");
  const requiredSections = ["## النطاق والتشخيص", "## سجل الحقائق", "## عنوان ووصف الصفحة", "## Metadata", "## بنية العناوين والأسئلة", "## الصور والروابط الداخلية", "## Product structured data", "## الموانع والتحقق التالي", "## ما لم يُنفذ"];
  for (const heading of requiredSections) if (!markdown.includes(heading)) errors.push(`قسم مفقود: ${heading}`);
  const domainChecks = [
    [!/Meta title/.test(markdown) || !/Meta description/.test(markdown), "Metadata غير مكتملة"],
    [!/(النص البديل|alt)/i.test(markdown), "النص البديل للصور مفقود"],
    [!/(المصدر|سجل الحقائق)/.test(markdown), "حقائق المنتج بلا مصدر"],
    [/(حجم بحث\s*[:=]?\s*\d|منافسة منخفضة|ترتيب أول|نضمن الظهور)/.test(seoClaimText), "ادعاء SEO غير موثق"],
    [/(تم الفهرسة|تم التعديل|ظهر في Google)/.test(markdown), "ادعاء تنفيذ أو فهرسة غير مسموح"],
  ];
  for (const [failed, message] of domainChecks) if (failed) errors.push(message);
  return errors;
}

if (process.argv[1]?.endsWith("validate-output.mjs")) {
  const errors = validate(fs.readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify({ valid: !errors.length, errors }, null, 2));
  if (errors.length) process.exit(1);
}
