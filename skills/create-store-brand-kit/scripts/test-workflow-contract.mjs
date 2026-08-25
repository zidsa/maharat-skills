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
const runtimeSurfaces = [
  skill,
  agent,
  copyPrompt,
  outputTemplate,
  exampleOutput,
  inputContract,
  productionMethod,
  schema,
];
const choiceQuestion = "اختر 1 أو 2 أو 3، أو قل: خيارات جديدة مع ملاحظتك.";
const finalOrder = ["logo-ar.png", "store-icon.png", "1. اللون الأساسي: #RRGGBB", "2. اللون الثانوي: #RRGGBB"];
const finalLabelOrder = ["logo-ar.png", "store-icon.png", "1. اللون الأساسي:", "2. اللون الثانوي:"];
const singularPromptForbidden = [
  /\b[123]\b/u,
  /concept-[123]\.png/u,
  /الاتجاه(?:ين|ات| الآخر)/u,
  /شبكة|كولاج|contact sheet|moodboard|grid|collage/iu,
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

function phaseOne(source) {
  const match = source.match(/(?:## )?المرحلة الأولى[^\n]*\n([\s\S]*?)(?=\n(?:## )?المرحلة الثانية)/u);
  assert.ok(match, "phase one is identifiable");
  return match[1];
}

function assertAlternatingCards(source, prompts, label) {
  let cursor = source.indexOf("المرحلة الأولى");
  for (let index = 0; index < 3; index += 1) {
    const option = index + 1;
    const optionLabel = `الخيار ${option}`;
    const labelPosition = source.indexOf(optionLabel, cursor);
    const promptPosition = source.indexOf(`<single-image-prompt>\n${prompts[index]}\n</single-image-prompt>`, labelPosition);
    const mapPosition = source.indexOf(`optionMap[${option}]`, promptPosition);
    const nextLabelPosition = option < 3 ? source.indexOf(`الخيار ${option + 1}`, mapPosition) : Number.POSITIVE_INFINITY;

    assert.ok(labelPosition >= cursor, `${label} writes ${optionLabel} before its image call`);
    assert.ok(promptPosition > labelPosition, `${label} calls the single image prompt after ${optionLabel}`);
    assert.ok(mapPosition > promptPosition, `${label} maps the exact result after option ${option} appears`);
    assert.ok(mapPosition < nextLabelPosition, `${label} stores option ${option} before starting the next option`);
    cursor = mapPosition;
  }
}

const requiredInputs = inputContract.match(/## مطلوب فقط\n\n([\s\S]*?)\n\n##/u)?.[1] || "";
assert.equal((requiredInputs.match(/^- .*$/gmu) || []).length, 2, "exactly two merchant inputs remain");
assert.ok(requiredInputs.includes("اسم المتجر بالعربية") && requiredInputs.includes("ما الذي يبيعه المتجر"));
assert.ok(exampleRequest.includes("الاسم العربي") && exampleRequest.includes("ماذا يبيع"));

for (const [index, source] of fullRunPrompts.entries()) {
  const label = `full run prompt ${index + 1}`;
  const prompts = extractSingleImagePrompts(source);
  assert.equal(prompts.length, 3, `${label} contains three independent image prompts`);
  assert.deepEqual(
    prompts.map((prompt) => [
      prompt.includes("العلامة اللفظية"),
      prompt.includes("علامة مجردة"),
      prompt.includes("نظامًا طباعيًا"),
    ]),
    [[true, false, false], [false, true, false], [false, false, true]],
    `${label} uses three materially different creative methods`,
  );

  for (const [promptIndex, prompt] of prompts.entries()) {
    assert.ok(prompt.startsWith("أنشئ لوحة هوية بصرية كاملة ومستقلة"), `${label} call ${promptIndex + 1} requests one board`);
    for (const forbidden of singularPromptForbidden) {
      assert.doesNotMatch(prompt, forbidden, `${label} call ${promptIndex + 1} cannot prime a composite`);
    }
    assert.ok(prompt.includes("النص المرئي الوحيد") && prompt.includes("اسم المتجر"));
    assert.ok(prompt.includes("المنتجات سياقًا") && prompt.includes("ليست نصًا داخل الصورة"));
    for (const extraCopy of ["وصف النشاط", "سلوغان", "أكواد ألوان", "أسماء خطوط", "استخدامات", "حروفًا لاتينية", "أرقامًا"]) {
      assert.ok(prompt.includes(extraCopy), `${label} call ${promptIndex + 1} forbids ${extraCopy}`);
    }
    for (const furnitureCliche of ["سقفًا", "بيتًا", "كنبة", "كرسيًا", "ورقة نبات"]) {
      assert.ok(prompt.includes(furnitureCliche), `${label} rejects furniture cliché ${furnitureCliche}`);
    }
  }

  assertAlternatingCards(source, prompts, label);
  const previewContract = phaseOne(source);
  for (const forbiddenPreviewContract of [/concept-[123]/u, /1536x1024/u, /\.png\b/iu, /PNG/iu]) {
    assert.doesNotMatch(previewContract, forbiddenPreviewContract, `${label} keeps phase-one previews format-free`);
  }

  for (const option of [1, 2, 3]) {
    assert.ok(source.includes(`optionMap[${option}]`), `${label} maintains optionMap[${option}]`);
  }
  assert.ok(source.includes("ثلاثة مراجع") && source.includes("مختلفة") && source.includes("صور مستقلة") && source.includes("ظاهرة"));
  assert.ok(source.includes("lastImage") && source.includes("batch"), `${label} forbids last-image and batch-order selection`);
  assert.ok(source.includes("selectedReference = optionMap[N]"), `${label} resolves the selected exact reference`);
  assert.ok(source.includes("اعتمدت الخيار N."), `${label} confirms the selected option`);

  const thirdMap = source.indexOf("optionMap[3]", source.indexOf("المرحلة الأولى"));
  const question = source.lastIndexOf(choiceQuestion);
  assert.ok(question > thirdMap, `${label} asks only after the third mapping`);
  assert.equal(source.split(choiceQuestion).length - 1, 1, `${label} asks one choice question`);
  assert.ok(source.includes("أعد") && source.includes("ذلك الخيار") && source.includes("الاحتفاظ"), `${label} retries only the failed option`);

  assertInOrder(source, finalOrder, `${label} final delivery`);
  assert.ok(!source.includes("brand-catalog.png"), `${label} does not require a catalog file`);
  assert.ok(source.includes("مرجع") && source.includes("الكتالوج"), `${label} keeps the selected board as the catalog reference`);
  assert.ok(source.includes("صورة `logo-ar.png` النهائية") || source.includes("صورة logo-ar.png النهائية"), `${label} uses the actual final logo image for the icon`);
  assert.ok(source.includes("مرة واحدة") && source.includes("لا تنشئها من الوصف النصي وحده"), `${label} prevents text-only icon regeneration`);
  assert.ok(source.includes("الأصل نفسه") && source.includes("لا تعِد ابتكار"), `${label} preserves icon geometry during post-processing`);
  assert.ok(source.includes("الشعار النهائي نفسه") && source.includes("الأكثر حضورًا وتمثيلًا للعلامة"), `${label} derives official colors from the final visible mark`);
  assert.ok(source.includes("اللون الثانوي داعم ظاهر") && source.includes("خلفية المعاينة"), `${label} excludes presentation backgrounds from official colors`);
  assert.doesNotMatch(source, /(?:Primary|Secondary):/u, `${label} exposes Arabic color labels only`);
}

const defaultPrompt = agent.match(/^  default_prompt: "(.*)"$/mu)?.[1] || "";
assert.ok(defaultPrompt.startsWith("استخدم $create-store-brand-kit"));
assert.ok(defaultPrompt.includes("الخيار N") && defaultPrompt.includes("اربطه بنتيجتها") && defaultPrompt.includes("انتظر اختياري"));
assert.equal(defaultPrompt.split("\n").length, 1);
assert.ok(!agent.includes("كتالوجًا") && !agent.includes("brand-catalog"));

assertInOrder(outputTemplate, ["الخيار 1", "[صورة مستقلة", "الخيار 2", "[صورة مستقلة", "الخيار 3", "[صورة مستقلة"], "output template alternates labels and images");
assert.ok(outputTemplate.includes("optionMap[1..3]") && outputTemplate.includes("لا تعتمد آخر صورة"));
assert.ok(exampleOutput.includes("optionMap[1]") && exampleOutput.includes("optionMap[2]") && exampleOutput.includes("optionMap[3]"));
assert.ok(exampleOutput.includes("selectedReference = optionMap[2]"));
assert.ok(inputContract.includes("اختيار التاجر 2 يعني `selectedReference = optionMap[2]` حرفيًا"));
assert.ok(schema.includes("لا أسماء ملفات ولا امتداد أو مقاس نهائي ولا فاحص"));
assert.ok(productionMethod.includes("لا تشغّل الفاحص عليها") && productionMethod.includes("لا يلزم تحويلها إلى ملف نهائي"));
assert.ok(sourceRegister.includes("يكتب `الخيار N` قبل صورته"));

for (const source of runtimeSurfaces) {
  assert.doesNotMatch(source, /(?:Primary|Secondary):/u, "merchant content excludes English color labels");
  for (const provider of ["Claude", "ChatGPT", "Gemini", "Manus"]) {
    assert.ok(!source.includes(provider), `merchant content excludes provider name ${provider}`);
  }
  for (const legacy of ["concept-1.png", "concept-2.png", "concept-3.png", "brand-catalog.png", "1536x1024", "تعذر إنشاء وإرفاق ملفات PNG الثلاثة الفعلية"]) {
    assert.ok(!source.includes(legacy), `runtime content excludes legacy contract ${legacy}`);
  }
}

for (const source of [skill, copyPrompt, productionMethod, schema]) {
  for (const rule of ["الشعار النهائي", "الأكثر حضورًا وتمثيلًا للعلامة", "داعم ظاهر", "خلفية المعاينة", "الظلال", "اللمعات", "الانعكاسات", "الأسود أو الأبيض", "HEX مسطح"]) {
    assert.ok(source.includes(rule), `color-selection contract preserves ${rule}`);
  }
}
for (const source of [skill, copyPrompt, schema]) assert.ok(source.includes("لا تقيّد"), "official colors do not constrain logo creativity");
assert.ok(productionMethod.includes("ليس قيدًا يحصر إبداعه"), "production treats official colors as post-logo verification");
assert.ok(exampleOutput.includes("#D6A15B") && exampleOutput.includes("#F3E2C9"), "gold example maps visible mark colors");
assert.ok(exampleOutput.includes("#17120F") && exampleOutput.includes("خلفية عرض لا مساحة داخل العلامة"), "gold example rejects the dark presentation background");

assert.ok(productionMethod.includes("Python/Pillow") && productionMethod.includes("بعد توليد الأصل بصريًا"));
assert.ok(productionMethod.includes("إزالة الخلفية") && productionMethod.includes("الحفاظ على النسبة") && productionMethod.includes("بلا قص"));
assert.ok(productionMethod.includes("لا تطلب من التاجر تشغيل CLI أو منح إذن API"));
assert.ok(productionMethod.includes("خلفية شطرنجية مرسومة لا تحقق الشفافية"));
assert.ok(productionMethod.includes("الفاحص البنيوي لا يستطيع إثبات عدم القص"));
assert.ok(productionMethod.includes("validate-brand-kit.mjs <primary-hex> <secondary-hex> <logo-asset> <icon-asset>"));
assert.ok(!validator.includes("catalogArg") && !validator.includes("CATALOG_MAX_BYTES"));
assert.ok(validator.includes("args.length !== 4"));
assert.ok(validator.includes("RGB أو خلفية شطرنجية مرسومة لا تعد شفافية"));
assertInOrder(outputTemplate, finalOrder, "output template final delivery");
assertInOrder(exampleOutput, finalLabelOrder, "example final delivery");

console.log("PASS mapped preview and final raster create-store-brand-kit workflow contract");
