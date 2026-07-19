import { readFile } from "node:fs/promises";
import path from "node:path";

const outputPath = process.argv[2];
const requiredSections = [
  "Shot list تقني",
  "خريطة منافذ وتسميات",
  "صورة محتويات الصندوق",
  "Storyboard تشغيل وalt"
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
