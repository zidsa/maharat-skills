import { readFile } from "node:fs/promises";
import path from "node:path";

const outputPath = process.argv[2];
const requiredSections = [
  "درجة دقة وثقة وتحويل",
  "جدول اختلافات العبوة/الصفحة",
  "محتوى مصحح وFAQ",
  "إصلاحات تقنية وقياس"
];

if (!outputPath) {
  console.error("الاستخدام: node scripts/validate-output.mjs <مسار-النتيجة.md>");
  process.exit(2);
}

const resolvedPath = path.resolve(process.cwd(), outputPath);
const content = await readFile(resolvedPath, "utf8");
const missing = requiredSections.filter((section) => !content.includes(section));

if (missing.length > 0) {
  console.error("النتيجة ناقصة. الأقسام المفقودة:");
  for (const section of missing) console.error(`- ${section}`);
  process.exit(1);
}

console.log(`✓ النتيجة تحتوي على جميع الأقسام الإلزامية (${requiredSections.length}).`);
