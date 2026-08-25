import assert from "node:assert/strict";
import fs from "node:fs";

const read = (relativePath) => fs.readFileSync(`skills/create-store-brand-kit/${relativePath}`, "utf8");
const skill = read("SKILL.md");
const agent = read("agents/openai.yaml");
const copyPrompt = read("assets/copy-paste-prompt.md");
const outputTemplate = read("assets/output-template.md");
const exampleRequest = read("examples/example-request.md");
const exampleOutput = read("examples/example-output.md");
const inputContract = read("references/input-contract.md");
const productionMethod = read("references/production-method.md");
const schema = read("references/brand-kit-schema.md");
const sourceRegister = read("references/source-register.md");
const validator = read("scripts/validate-brand-kit.mjs");

const fullRunPrompts = [skill, copyPrompt];
const runtimeSurfaces = [skill, agent, copyPrompt, outputTemplate, exampleOutput, inputContract, productionMethod, schema];
const choiceQuestion = "اختر 1 أو 2 أو 3، أو قل: خيارات جديدة مع ملاحظتك.";
const finalOrder = ["brand-catalog.png", "logo-ar.png", "store-icon.png", "Primary", "Secondary"];
const toolFirstPhrases = [
  "استخدم أداة إنشاء الصور",
  "استدعِ أداة الصور",
  "أداة الصور",
  "فحص الأدوات",
  "قائمة الأدوات",
  "فحص التوفر",
  "تحقق من توفر",
  "أداة الصور غير متاحة",
  "عدم توفر أداة الصور",
  "غير متاحة",
  "محاولة استدعائها فعليًا",
  "سجل التنفيذ",
  "تعذر إنشاء",
];

function assertInOrder(source, terms, label) {
  let previous = -1;
  for (const term of terms) {
    const position = source.indexOf(term, previous + 1);
    assert.ok(position > previous, `${label} places ${term} in order`);
    previous = position;
  }
}

const requiredInputs = inputContract.match(/## مطلوب فقط\n\n([\s\S]*?)\n\n##/u)?.[1] || "";
const requiredInputBullets = requiredInputs.match(/^- .*$/gmu) || [];
assert.equal(requiredInputBullets.length, 2, "exactly two merchant inputs remain");
assert.ok(requiredInputs.includes("اسم المتجر بالعربية") && requiredInputs.includes("ما الذي يبيعه المتجر"), "the two inputs remain store name and products");
for (const extra of ["الجمهور", "تفضيل", "سمات", "قائمة أصول"]) assert.ok(!requiredInputBullets.join("\n").includes(extra), `required inputs exclude ${extra}`);
assert.ok(exampleRequest.includes("الاسم العربي") && exampleRequest.includes("ماذا يبيع"), "example request uses both inputs");

for (const [index, source] of fullRunPrompts.entries()) {
  const label = `full run prompt ${index + 1}`;
  const createNowPosition = source.indexOf("أنشئ الآن");
  const statePosition = source.indexOf(index === 0 ? "## حالة المحادثة" : "نفّذ سيرًا من مرحلتين");
  assert.ok(createNowPosition >= 0 && statePosition > createNowPosition, `${label} makes image creation the main action before state details`);
  assert.ok(source.includes("مولدة بصريًا داخل المحادثة") && source.includes("PNG منشأة بالكود"), `${label} requires actual visual generation instead of coded PNG`);
  assert.ok(source.includes("Python/Pillow") && source.includes("SVG"), `${label} carries the concise anti-code rule`);
  assert.ok(source.includes("فحص الأصل") && source.includes("تصديره") && source.includes("تصغيره كاملًا"), `${label} keeps code limited to post-generation handling`);
  assert.ok(source.includes("ثلاث عمليات إنشاء صور مستقلة"), `${label} requests three independent image-generation operations`);
  assert.equal((source.match(/concept-[123]\.png/gu) || []).length, 3, `${label} names exactly three concept previews`);
  for (const file of ["concept-1.png", "concept-2.png", "concept-3.png"]) assert.ok(source.includes(file), `${label} includes ${file}`);
  assert.ok(source.includes("منفصلة بالضبط") || source.includes("منفصلة **بالضبط**"), `${label} requires exactly three separate previews`);
  for (const dimension of ["1536x1024", "1024x256", "32x32"]) assert.ok(source.includes(dimension), `${label} includes ${dimension}`);
  for (const distinction of ["فكرة العلامة", "الاسم العربي", "التكوين", "لوحة الألوان"]) assert.ok(source.includes(distinction) || (distinction === "لوحة الألوان" && source.includes("الألوان")), `${label} varies ${distinction}`);
  assert.ok(source.includes("لا إعادة تلوين"), `${label} forbids recolor-only concepts`);
  assert.ok(source.includes("جذريًا"), `${label} allows materially different palettes`);
  assert.ok(source.includes("حرية حقيقية"), `${label} remains creativity-first`);
  assert.equal(source.split(choiceQuestion).length - 1, 1, `${label} asks the one choice question exactly once`);
  assert.ok(/السؤال[^\n]*وحده|اسأل وحده/u.test(source), `${label} keeps the merchant question singular`);
  assert.ok(source.includes("توقف") || source.includes("وتوقف"), `${label} stops after phase one`);
  assert.ok(source.includes("التصورات") && source.includes("بلا توليد جديد"), `${label} waits without regenerating while a current trio is pending`);
  assert.ok(source.includes("لا تختَر تلقائيًا") || source.includes("لا تختَر اتجاهًا نيابة عنه"), `${label} forbids auto-selection`);
  assert.ok(source.includes("في رد المرحلة الأولى"), `${label} withholds finals in phase one`);
  assert.ok(source.includes("ثلاث") && source.includes("جديدة") && /مرفوض|رفضه/u.test(source), `${label} regenerates three new options after rejection`);
  assert.ok(source.includes("احتفظ بالصور الناجحة"), `${label} retries only a failed preview without discarding successes`);
  assert.ok(source.includes("بعد اختيار صريح فقط") || source.includes("بعد الموافقة الصريحة فقط"), `${label} gates phase two on explicit approval`);
  assert.ok(source.includes("اللوحة المختارة كاملة"), `${label} preserves the full selected board`);
  assert.ok((source.match(/من الصفر/gu) || []).length >= 2, `${label} requires fresh logo and icon renders`);
  for (const forbiddenReuse of ["قص", "استخراج", "لقطة شاشة"]) assert.ok(source.includes(forbiddenReuse), `${label} explicitly prohibits ${forbiddenReuse}`);
  assert.ok(source.includes("الأيقونة المستقلة") || source.includes("الرسم المستقل"), `${label} permits only standalone-icon downscaling`);
  assert.ok(source.includes("الفحص") && /المرحلة الثانية|للمرحلة الثانية/u.test(source), `${label} keeps validation in the final phase`);
  assertInOrder(source, finalOrder, `${label} final delivery`);
}

const defaultPrompt = agent.match(/^  default_prompt: "(.*)"$/mu)?.[1] || "";
assert.ok(defaultPrompt.startsWith("استخدم $create-store-brand-kit لإنشاء"), "default prompt is a concise skill-creator invocation");
assert.ok(defaultPrompt.includes("ثلاث صور هوية فعلية ومنفصلة الآن") && defaultPrompt.includes("انتظر اختياري"), "default prompt asks to create images now and wait for selection");
assert.equal(defaultPrompt.split("\n").length, 1, "default prompt remains one line");
for (const technical of ["Python", "Pillow", "SVG", "1536x1024", "سجل التنفيذ", "أداة إنشاء الصور"]) assert.ok(!defaultPrompt.includes(technical), `default prompt excludes full-contract detail ${technical}`);

for (const source of runtimeSurfaces) {
  for (const phrase of toolFirstPhrases) assert.ok(!source.includes(phrase), `runtime content excludes tool-first phrase ${phrase}`);
  for (const obsoleteDetail of ["ImageMagick", "HTML", "CSS", "Canvas", "code-generated PNG"]) assert.ok(!source.includes(obsoleteDetail), `runtime content omits technical list item ${obsoleteDetail}`);
  for (const blocked of ["رسالة الحجب", "تعذر إنشاء وإرفاق ملفات PNG الثلاثة الفعلية", "أخرج مرة واحدة فقط", "ملف وهمي", "ملفات وهمية"]) assert.ok(!source.includes(blocked), `runtime content excludes blocker ${blocked}`);
  for (const provider of ["Claude", "ChatGPT", "Gemini", "Manus"]) assert.ok(!source.includes(provider), `merchant content excludes provider name ${provider}`);
}

assert.ok(outputTemplate.indexOf("## الرد الأول") < outputTemplate.indexOf("## الرد النهائي"), "output template separates approval and final responses");
assert.ok(exampleOutput.includes("يتوقف الرد هنا") && exampleOutput.includes("أختار 2"), "example demonstrates stop then explicit selection");
assert.ok(schema.includes("ليست ثلاثية التسليم النهائي") && schema.includes("لا تُفحص بفاحص الأصول"), "phase-one previews are not final validator failures");
assert.ok(productionMethod.includes("لا تطبق فاحصه في المرحلة الأولى"), "validator guidance excludes phase one");
assert.ok(productionMethod.includes("## الفحص بعد اكتمال المرحلة الثانية"), "validator is a final-phase operation");
assert.ok(productionMethod.indexOf("## الفحص بعد اكتمال المرحلة الثانية") < productionMethod.indexOf("node scripts/validate-brand-kit.mjs"), "validator command follows the final-phase heading");
for (const source of [...runtimeSurfaces, sourceRegister]) {
  assert.ok(!source.includes("--claude-fallback"), "legacy SVG fallback flag is removed");
  assert.ok(!source.includes("استثناء Claude"), "provider-specific SVG exception is removed");
}
assert.ok(schema.includes("صيغة التسليم الوحيدة هي PNG") && productionMethod.includes("لا يقبل الفاحص إلا ثلاثية PNG"), "references define PNG-only delivery");
assert.ok(validator.includes('ext !== ".png"') && validator.includes("يلزم ثلاثية PNG فقط"), "validator accepts PNG only");
assert.ok(!validator.includes("svgInfo") && !validator.includes("claudeFallback"), "validator contains no SVG fallback path");
for (const source of fullRunPrompts) assert.ok(!source.includes("node scripts/validate-brand-kit.mjs"), "merchant prompt does not expose validator commands");
assertInOrder(outputTemplate, finalOrder, "output template final delivery");
assertInOrder(exampleOutput, finalOrder, "example final delivery");

console.log("PASS staged create-store-brand-kit workflow contract");
