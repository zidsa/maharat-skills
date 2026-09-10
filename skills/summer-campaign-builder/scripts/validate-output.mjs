import { readFile } from "node:fs/promises";
import path from "node:path";

const outputPath = process.argv[2];
const requestPath = process.argv[3];

const requiredSections = [
  "موجز الحملة",
  "الأدلة ومصادر الفهم",
  "المخرجات المختارة",
  "خطة القياس",
  "قائمة مراجعة قبل النشر",
  "الموافقة والخطوة التالية",
];

const channelLabels = {
  tiktok: "تيكتوك",
  snap: "سناب",
  instagram: "إنستقرام",
  whatsapp: "واتساب",
};

const goalPatterns = {
  acquire: /استحواذ/,
  retarget: /إعادة استهداف/,
};

const offerPatterns = {
  discount: /(?:خصم|٪|%)/,
  shipping: /توصيل مجاني/,
  cashback: /كاش\s*باك/,
  bundle: /(?:كولكشن|باقة)\s+(?:مجمّع|مجمع)/,
};

const domainChecks = [
  {
    label: "وضوح حالة التسليم",
    test: (content) => /(?:مسودة|لم تُنشر|لم يتم النشر)/.test(content),
  },
  {
    label: "خطة قياس قابلة للمراجعة",
    test: (content) => /(?:المؤشر الأساسي|طريقة التتبع|نقطة المقارنة)/.test(section(content, "خطة القياس")),
  },
  {
    label: "مراجعة قبل النشر",
    test: (content) => /(?:الرابط|العروض|الادعاء|الموافقة)/.test(section(content, "قائمة مراجعة قبل النشر")),
  },
];

function fail(messages) {
  for (const message of messages) console.error(`- ${message}`);
  process.exit(1);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function section(content, title) {
  const expression = new RegExp(`^##\\s+${escapeRegExp(title)}\\s*\\r?\\n([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, "m");
  return content.match(expression)?.[1]?.trim() ?? "";
}

function parseManifest(content) {
  const match = content.match(/<!--\s*summer-campaign-manifest:v1\s*-->[\s\S]*?```json\s*([\s\S]*?)```/i);
  if (!match) throw new Error("لم أجد summer-campaign-manifest:v1 في طلب التشغيل.");
  const manifest = JSON.parse(match[1]);
  if (manifest.schema_version !== "summer-campaign-v1") throw new Error("إصدار manifest غير مدعوم.");
  if (!Array.isArray(manifest.goals) || !Array.isArray(manifest.offers) || !Array.isArray(manifest.channels)) {
    throw new Error("manifest ناقص: goals/offers/channels يجب أن تكون قوائم.");
  }
  return manifest;
}

if (!outputPath) {
  console.error("الاستخدام: node scripts/validate-output.mjs <مسار-النتيجة.md> [مسار-طلب-التشغيل.md]");
  process.exit(2);
}

const content = await readFile(path.resolve(process.cwd(), outputPath), "utf8");
const problems = [];

for (const title of requiredSections) {
  if (!section(content, title)) problems.push(`القسم مفقود أو فارغ: ${title}`);
}

const unresolved = content.match(/\[(?:أدخل|أضف|اسم|رابط|مدة|نسبة|قيمة|المنتج|غير محدد)[^\]]*\]/g) ?? [];
if (unresolved.length) problems.push(`خانات غير مكتملة: ${[...new Set(unresolved)].join("، ")}`);

const evidence = section(content, "الأدلة ومصادر الفهم");
if (evidence.length < 120 || !/(?:أدخلها التاجر|رابط عام|غير متاح|لم يتم فحصه)/.test(evidence)) {
  problems.push("قسم الأدلة لا يوضح مصدر الحقائق وحالة التحقق بما يكفي.");
}

for (const check of domainChecks) {
  if (!check.test(content)) problems.push(`فحص المجال لم ينجح: ${check.label}`);
}

if (/(?:^|\n)\s*(?:تم النشر|تم الإرسال|نشرت الحملة|أرسلت الرسالة)/m.test(content)) {
  problems.push("الناتج يدّعي إجراءً خارجيًا؛ المهارة تسلّم مسودة فقط.");
}

if (problems.length) fail(problems);

if (requestPath) {
  const request = await readFile(path.resolve(process.cwd(), requestPath), "utf8");
  let manifest;
  try {
    manifest = parseManifest(request);
  } catch (error) {
    fail([error.message]);
  }

  const selectedChannels = new Set(manifest.channels);
  const outputs = section(content, "المخرجات المختارة");
  const channelProblems = [];

  for (const [key, label] of Object.entries(channelLabels)) {
    const heading = new RegExp(`^###\\s+${escapeRegExp(label)}\\s*$`, "m");
    const appears = heading.test(outputs);
    if (selectedChannels.has(key) && !appears) channelProblems.push(`القناة المختارة غير موجودة: ${label}`);
    if (!selectedChannels.has(key) && appears) channelProblems.push(`قناة غير مختارة تسربت إلى الناتج: ${label}`);
  }

  const selectedOffers = new Map(manifest.offers.map((offer) => [offer.type, offer]));
  for (const [key, pattern] of Object.entries(offerPatterns)) {
    if (!selectedOffers.has(key) && pattern.test(outputs)) {
      channelProblems.push(`عرض غير مختار تسرب إلى المخرجات: ${key}`);
    }
  }

  for (const offer of manifest.offers) {
    const value = String(offer.value ?? "").trim();
    if (value && !content.includes(value)) {
      channelProblems.push(`قيمة العرض المختار غير موجودة في الناتج: ${offer.type}=${value}`);
    }
  }

  const brief = section(content, "موجز الحملة");
  for (const goal of manifest.goals) {
    const pattern = goalPatterns[goal];
    if (pattern && !pattern.test(brief)) channelProblems.push(`الهدف المختار غير موضح في الموجز: ${goal}`);
  }

  if (channelProblems.length) fail(channelProblems);
}

console.log(`✓ اجتاز الناتج فحص البنية والأدلة${requestPath ? " وتطابق manifest" : ""}.`);
