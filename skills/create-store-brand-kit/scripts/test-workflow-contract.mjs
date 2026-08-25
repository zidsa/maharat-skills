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
const singularPromptForbidden = [
  /\b[123]\b/u,
  /concept-[123]\.png/u,
  /الاتجاه(?:ين|ات| الآخر)/u,
  /شبكة|كولاج|contact sheet|moodboard/iu,
  /اختر 1 أو 2 أو 3/u,
];

function assertInOrder(source, terms, label) {
  let previous = -1;
  for (const term of terms) {
    const position = source.indexOf(term, previous + 1);
    assert.ok(position > previous, `${label} places ${term} in order`);
    previous = position;
  }
}

function extractSingleImagePrompts(source) {
  return [...source.matchAll(/<single-image-prompt>\n([\s\S]*?)\n<\/single-image-prompt>/gu)]
    .map((match) => match[1]);
}

const requiredInputs = inputContract.match(/## مطلوب فقط\n\n([\s\S]*?)\n\n##/u)?.[1] || "";
const requiredInputBullets = requiredInputs.match(/^- .*$/gmu) || [];
assert.equal(requiredInputBullets.length, 2, "exactly two merchant inputs remain");
assert.ok(requiredInputs.includes("اسم المتجر بالعربية") && requiredInputs.includes("ما الذي يبيعه المتجر"), "the two inputs remain store name and products");
assert.ok(exampleRequest.includes("الاسم العربي") && exampleRequest.includes("ماذا يبيع"), "example request uses both inputs");

for (const [index, source] of fullRunPrompts.entries()) {
  const label = `full run prompt ${index + 1}`;
  const prompts = extractSingleImagePrompts(source);
  assert.equal(prompts.length, 3, `${label} contains three executable single-image prompts`);
  assert.deepEqual(
    prompts.map((prompt) => [prompt.includes("العلامة اللفظية"), prompt.includes("علامة مجردة"), prompt.includes("نظامًا طباعيًا")]),
    [[true, false, false], [false, true, false], [false, false, true]],
    `${label} uses three materially different creative methods`,
  );

  for (const [promptIndex, prompt] of prompts.entries()) {
    assert.ok(prompt.startsWith("أنشئ لوحة هوية بصرية كاملة ومستقلة"), `${label} call ${promptIndex + 1} requests one complete board`);
    for (const forbidden of singularPromptForbidden) assert.doesNotMatch(prompt, forbidden, `${label} call ${promptIndex + 1} stays singular and unlabelled`);
    assert.ok(prompt.includes("النص المرئي الوحيد") && prompt.includes("اسم المتجر"), `${label} call ${promptIndex + 1} permits only the Arabic store name`);
    for (const extraCopy of ["وصف النشاط", "سلوغان", "أكواد ألوان", "أسماء خطوط", "استخدامات", "حروفًا لاتينية", "أرقامًا"]) {
      assert.ok(prompt.includes(extraCopy), `${label} call ${promptIndex + 1} forbids ${extraCopy}`);
    }
    assert.ok(prompt.includes("سياق") && /المنتجات|المنتج/u.test(prompt), `${label} call ${promptIndex + 1} treats products as context only`);
    for (const furnitureCliche of ["سقفًا", "بيتًا", "كنبة", "كرسيًا", "ورقة نبات"]) assert.ok(prompt.includes(furnitureCliche), `${label} rejects furniture cliché ${furnitureCliche}`);
  }

  assert.ok(source.includes("بالتتابع") && source.includes("واحدًا فقط"), `${label} requires sequential single-prompt calls`);
  assert.ok(source.includes("لا تبدأ") && source.includes("حتى يظهر مرفق"), `${label} waits for each visible attachment`);
  for (const file of ["concept-1.png", "concept-2.png", "concept-3.png"]) assert.ok(source.includes(file), `${label} names attachment ${file} outside image prompts`);
  assert.ok(source.includes("لا تسأل سؤال الاختيار") && source.includes("ثلاثة مرفقات صور مستقلة"), `${label} gates selection on three visible attachments`);
  assert.ok(source.includes("صورة مركبة واحدة") && /لا تحقق|لا تكفي/u.test(source), `${label} rejects one composite image`);
  assert.equal(source.split(choiceQuestion).length - 1, 1, `${label} asks the choice question exactly once`);
  assert.ok(source.includes("أعد") && /البطاقة|المرفق/u.test(source) && source.includes("احتفظ"), `${label} retries only the missing attachment`);
  assert.ok(source.includes("خارج الصور"), `${label} keeps concept numbers outside images`);
  assert.ok(source.includes("بعد اختيار صريح فقط") || source.includes("بعد الموافقة الصريحة فقط"), `${label} gates phase two on explicit approval`);
  assert.ok(source.includes("اللوحة المختارة كاملة"), `${label} preserves the full selected board`);
  assert.ok((source.match(/من الصفر/gu) || []).length >= 2, `${label} fresh-renders logo and icon`);
  for (const forbiddenReuse of ["قص", "استخراج", "لقطة شاشة"]) assert.ok(source.includes(forbiddenReuse), `${label} forbids ${forbiddenReuse}`);
  assertInOrder(source, finalOrder, `${label} final delivery`);
}

const defaultPrompt = agent.match(/^  default_prompt: "(.*)"$/mu)?.[1] || "";
assert.ok(defaultPrompt.startsWith("استخدم $create-store-brand-kit لإنشاء"), "default prompt is a concise skill invocation");
assert.ok(defaultPrompt.includes("ثلاثة استدعاءات متتابعة") && defaultPrompt.includes("المرفقات الثلاثة") && defaultPrompt.includes("انتظر اختياري"), "default prompt preserves sequential approval flow");
assert.equal(defaultPrompt.split("\n").length, 1, "default prompt remains one line");

assert.ok(outputTemplate.includes("لا تعرض سؤال الاختيار إذا كان أي مرفق مفقودًا"), "output template blocks premature selection");
assert.ok(exampleOutput.includes("إذا كان مرفق مفقودًا") && exampleOutput.includes("يعاد وحده"), "example covers a missing attachment negative path");
assert.ok(inputContract.includes("لا تسأل قبل اكتمال المرفقات الثلاثة"), "input contract gates the question");
assert.ok(schema.includes("لا تُرسل أكثر من بطاقة") && schema.includes("صورة مركبة واحدة"), "schema defines singular calls and rejects composite output");
assert.ok(productionMethod.includes("لا ترسل أكثر من بطاقة") && productionMethod.includes("لا تبدأ عملية جديدة حتى يظهر مرفق الحالية"), "production method is sequential");
assert.ok(sourceRegister.includes("ثلاثة استدعاءات أحادية متتابعة") && sourceRegister.includes("اسم المتجر العربي"), "source register records the runtime contract");

for (const source of runtimeSurfaces) {
  for (const provider of ["Claude", "ChatGPT", "Gemini", "Manus"]) assert.ok(!source.includes(provider), `merchant content excludes provider name ${provider}`);
  for (const legacy of ["--claude-fallback", "استثناء Claude", "تعذر إنشاء وإرفاق ملفات PNG الثلاثة الفعلية"]) assert.ok(!source.includes(legacy), `runtime content excludes ${legacy}`);
}

assert.ok(productionMethod.includes("لا يقبل الفاحص إلا ثلاثية PNG") && validator.includes('ext !== ".png"'), "validator remains PNG-only");
assertInOrder(outputTemplate, finalOrder, "output template final delivery");
assertInOrder(exampleOutput, finalOrder, "example final delivery");

console.log("PASS sequential create-store-brand-kit workflow contract");
