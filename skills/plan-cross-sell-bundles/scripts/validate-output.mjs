import { readFile } from "node:fs/promises";

const file = process.argv[2];
if (!file) {
  console.error("الاستخدام: node scripts/validate-output.mjs <result.md>");
  process.exit(2);
}
const content = await readFile(file, "utf8");
const required = ["## البيانات المستخدمة","## الاقتراحات المرتبة","## منطق التوافق","## مواضع العرض","## تجربة القياس"];
const missing = required.filter((heading) => !content.includes(heading));
const unresolved = content.match(/\[(?:اكتب|أدخل|أضف|غير محدد)[^\]]*\]|TODO/gi) ?? [];
const forbidden = content.match(/مضمون (?:الظهور|التصدر)|نضمن (?:النتائج|التصدر)/g) ?? [];

if (missing.length) {
  console.error(`أقسام مفقودة: ${missing.join("، ")}`);
  process.exit(1);
}
if (unresolved.length) {
  console.error(`خانات غير مكتملة: ${[...new Set(unresolved)].join("، ")}`);
  process.exit(1);
}
if (forbidden.length) {
  console.error("النتيجة تحتوي ضمانًا غير قابل للإثبات.");
  process.exit(1);
}
console.log("✓ النتيجة مكتملة وقابلة للمراجعة.");

