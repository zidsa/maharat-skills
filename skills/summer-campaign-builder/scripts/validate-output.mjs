import { readFile } from "node:fs/promises";
import path from "node:path";

const outputPath = process.argv[2];
const requiredSections = [
  "موجز الحملة ومصادر الفهم",
  "القنوات المختارة",
  "مخرجات القنوات المختارة",
  "خطة القياس",
  "قائمة مراجعة قبل النشر",
];
const unresolvedPatterns = [/\[(?:أدخل|ألصق|اكتب|اسم القناة المختارة)[^\]]*\]/g];

if (!outputPath) {
  console.error("الاستخدام: node scripts/validate-output.mjs <مسار-النتيجة.md>");
  process.exit(2);
}

const resolvedPath = path.resolve(process.cwd(), outputPath);
const content = await readFile(resolvedPath, "utf8");
const missing = requiredSections.filter((section) => !content.includes(section));
const unresolved = unresolvedPatterns.flatMap((pattern) => content.match(pattern) ?? []);

if (missing.length || unresolved.length) {
  if (missing.length) {
    console.error("الأقسام المفقودة:");
    for (const section of missing) console.error(`- ${section}`);
  }
  if (unresolved.length) {
    console.error("حقول لم تُحسم:");
    for (const value of [...new Set(unresolved)]) console.error(`- ${value}`);
  }
  process.exit(1);
}

console.log(`✓ الحزمة مكتملة وتحتوي على ${requiredSections.length} أقسام إلزامية.`);
