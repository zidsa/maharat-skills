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

const merchantSurfaces = [skill, agent, copyPrompt];
const choiceQuestion = "اختر 1 أو 2 أو 3، أو قل: خيارات جديدة مع ملاحظتك.";
const nativeToolRule = "استخدم أداة إنشاء الصور المدمجة في المنصة الحالية بصمت، ولا تذكر اسمها أو تطلب تطبيقًا أو خدمة خارجية.";
const noCodeToolRule = "لا تستدعِ أداة تنفيذ كود أو طرفية أو بيئة ملفات لإنشاء الصور";
const pngProofRule = "كون الملف PNG لا يثبت أنه مولد بأداة الصور";
const finalOrder = ["brand-catalog.png", "logo-ar.png", "store-icon.png", "Primary", "Secondary"];

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

for (const [index, source] of merchantSurfaces.entries()) {
  const label = `merchant surface ${index + 1}`;
  assert.ok(source.includes(nativeToolRule), `${label} uses only the built-in image tool`);
  assert.ok(source.includes(noCodeToolRule), `${label} forbids code, shell, and filesystem image creation`);
  assert.ok(source.includes(pngProofRule), `${label} rejects extension-only provenance`);
  assert.ok(source.includes("استدعاء مستقل") && source.includes("سجل التنفيذ"), `${label} requires one logged native-image call per image`);
  for (const forbiddenGenerator of ["Python", "Pillow", "ImageMagick", "SVG", "HTML", "CSS", "Canvas", "code-generated PNG"]) assert.ok(source.includes(forbiddenGenerator), `${label} explicitly bans ${forbiddenGenerator} as an image source`);
  for (const allowedCodeUse of ["الأبعاد", "الشفافية", "التباين", "تصدير", "تصغير"]) assert.ok(source.includes(allowedCodeUse), `${label} limits code to non-creative ${allowedCodeUse}`);
  assert.ok(source.includes("لا تعلن") && source.includes("محاولة استدعائها فعليًا"), `${label} attempts the image tool before declaring it unavailable`);
  assert.ok(source.includes("بديلًا برمجيًا") && /ملف(?:ات|ًا) وهم/u.test(source), `${label} forbids programmatic and fake-file fallbacks`);
  assert.ok(source.includes("ثلاث مرات"), `${label} invokes exactly three separate preview generations`);
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
  assert.ok(source.includes("لا تنشئ") && source.includes("في رد المرحلة الأولى") || source.includes("في الرد نفسه"), `${label} withholds finals in phase one`);
  assert.ok(source.includes("ثلاث") && source.includes("جديدة") && /مرفوض|رفضه/u.test(source), `${label} regenerates three new options after rejection`);
  assert.ok(source.includes("احتفظ بالصور الناجحة"), `${label} retries only a failed preview without discarding successes`);
  assert.ok(source.includes("بعد اختيار صريح فقط") || source.includes("بعد الموافقة الصريحة فقط"), `${label} gates phase two on explicit approval`);
  assert.ok(source.includes("اللوحة المختارة كاملة"), `${label} preserves the full selected board`);
  assert.ok(source.includes("من الصفر"), `${label} requires fresh final renders`);
  for (const forbiddenReuse of ["قص", "استخراج", "لقطة شاشة"]) assert.ok(source.includes(forbiddenReuse), `${label} explicitly prohibits ${forbiddenReuse}`);
  assert.ok(source.includes("الأيقونة المستقلة") || source.includes("الرسم المستقل"), `${label} permits only standalone-icon downscaling`);
  assert.ok(source.includes("الفحص") && /المرحلة الثانية|للمرحلة الثانية/u.test(source), `${label} keeps validation in the final phase`);
  assertInOrder(source, finalOrder, `${label} final delivery`);
}

for (const source of [skill, agent, copyPrompt, outputTemplate, exampleOutput]) {
  for (const provider of ["Claude", "ChatGPT", "Gemini", "Manus"]) assert.ok(!source.includes(provider), `merchant content excludes provider name ${provider}`);
  for (const blocked of ["رسالة الحجب", "تعذر إنشاء وإرفاق ملفات PNG الثلاثة الفعلية", "أخرج مرة واحدة فقط"]) assert.ok(!source.includes(blocked), `merchant content excludes canned blocker ${blocked}`);
  for (const externalRequest of ["افتح تطبيق", "استخدم تطبيقًا خارجيًا", "استخدم خدمة خارجية"]) assert.ok(!source.includes(externalRequest), `merchant content does not request an external app: ${externalRequest}`);
}

assert.ok(outputTemplate.indexOf("## الرد الأول") < outputTemplate.indexOf("## الرد النهائي"), "output template separates approval and final responses");
assert.ok(exampleOutput.includes("يتوقف الرد هنا") && exampleOutput.includes("أختار 2"), "example demonstrates stop then explicit selection");
assert.ok(schema.includes("ليست ثلاثية التسليم النهائي") && schema.includes("لا تُفحص بفاحص الأصول"), "phase-one previews are not final validator failures");
assert.ok(productionMethod.includes("لا تطبق فاحصه في المرحلة الأولى"), "validator guidance excludes phase one");
assert.ok(productionMethod.includes("## الفحص بعد اكتمال المرحلة الثانية"), "validator is a final-phase operation");
assert.ok(productionMethod.indexOf("## الفحص بعد اكتمال المرحلة الثانية") < productionMethod.indexOf("node scripts/validate-brand-kit.mjs"), "validator command follows the final-phase heading");
for (const source of [skill, agent, copyPrompt, outputTemplate, exampleOutput, schema, inputContract, productionMethod, sourceRegister]) {
  assert.ok(!source.includes("--claude-fallback"), "legacy SVG fallback flag is removed");
  assert.ok(!source.includes("استثناء Claude"), "provider-specific SVG exception is removed");
}
assert.ok(schema.includes("صيغة التسليم الوحيدة هي PNG") && productionMethod.includes("لا يقبل الفاحص إلا ثلاثية PNG"), "references define PNG-only delivery");
assert.ok(validator.includes('ext !== ".png"') && validator.includes("يلزم ثلاثية PNG فقط"), "validator accepts PNG only");
assert.ok(!validator.includes("svgInfo") && !validator.includes("claudeFallback"), "validator contains no SVG fallback path");
for (const source of merchantSurfaces) assert.ok(!source.includes("node scripts/validate-brand-kit.mjs"), "merchant prompt does not expose validator commands");
assertInOrder(outputTemplate, finalOrder, "output template final delivery");
assertInOrder(exampleOutput, finalOrder, "example final delivery");

console.log("PASS staged create-store-brand-kit workflow contract");
