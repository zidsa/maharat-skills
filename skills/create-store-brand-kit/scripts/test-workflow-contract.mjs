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
const approvalQuestion = "هل تعتمد هذه الهوية، أو تبي تعديلًا محددًا؟";
const finalOrder = ["logo-ar.png", "store-icon.png", "1. اللون الأساسي: #RRGGBB", "2. اللون الثانوي: #RRGGBB"];
const finalLabelOrder = ["logo-ar.png", "store-icon.png", "1. اللون الأساسي:", "2. اللون الثانوي:"];

function assertInOrder(source, terms, label) {
  let previous = -1;
  for (const term of terms) {
    const position = source.indexOf(term, previous + 1);
    assert.ok(position > previous, `${label} places ${term} in order`);
    previous = position;
  }
}

function markdownSection(source, heading, nextHeading) {
  const start = source.indexOf(heading);
  assert.ok(start >= 0, `${heading} is present`);
  const end = nextHeading ? source.indexOf(nextHeading, start + heading.length) : source.length;
  assert.ok(end > start, `${heading} has content`);
  return source.slice(start, end);
}

const requiredInputs = inputContract.match(/## مطلوب فقط\n\n([\s\S]*?)\n\n##/u)?.[1] || "";
assert.equal((requiredInputs.match(/^- .*$/gmu) || []).length, 2, "exactly two merchant inputs remain");
assert.ok(requiredInputs.includes("اسم المتجر بالعربية") && requiredInputs.includes("ما الذي يبيعه المتجر"));
assert.ok(exampleRequest.includes("الاسم العربي: نظره") && exampleRequest.includes("ماذا يبيع: نظارات شمسية"));
assert.ok(exampleOutput.includes("«نظره»") && exampleOutput.includes("لا يتحول إلى «نظرة»"));

for (const [index, source] of fullRunPrompts.entries()) {
  const label = `full run prompt ${index + 1}`;

  assert.equal(source.split(approvalQuestion).length - 1, 1, `${label} contains one approval question`);
  assert.ok(source.includes("BOARD_ONLY") && source.includes("استدعاء صورة واحد"), `${label} requests one isolated preview image operation`);
  assert.ok(source.includes("لوحة معدلة واحدة فقط"), `${label} feedback creates one revised board`);
  assert.ok(source.includes("أحدث لوحة مرئية") && source.includes("latestBoardReference"), `${label} revisions and approval bind the latest visible board`);
  assert.ok(source.includes("فشل تقني") && source.includes("لم تظهر أي صورة"), `${label} retries only a technical no-image result`);
  assert.ok(source.includes("لا تنشئ أي صورة أخرى تلقائيًا") || source.includes("لا تعد توليدها تلقائيًا"), `${label} forbids retries after a visible image`);

  assert.ok(source.includes("merchantNameLiteral"), `${label} stores the immutable name`);
  assert.ok(source.includes("مرة واحدة فقط") && source.includes("التكوين الرئيسي"), `${label} renders the name once in the main lockup`);
  assert.ok(source.includes("العلامة المصغرة") && source.includes("بلا نص"), `${label} keeps other applications symbol-only`);
  assert.ok(source.includes("لا تقلم") || source.includes("لا تقلم القيمة"), `${label} does not persist a trimmed name`);
  assert.ok(source.includes("ه") && source.includes("ة"), `${label} preserves Arabic letter distinctions`);

  const approvalPosition = source.indexOf("موافقة صريحة");
  const firstPreviewPosition = source.indexOf("المعاينة الأولى", approvalPosition + 1);
  assert.ok(approvalPosition >= 0 && firstPreviewPosition > approvalPosition, `${label} handles approval before preview fallback`);
  assert.ok(source.includes("approvedBoardReference") && source.includes("latestBoardReference"), `${label} binds the approved visible board`);
  assert.ok(source.includes("سجل المحادثة") && source.includes("لا تعد") && source.includes("المعاينة"), `${label} recovers visible state without restarting`);

  assertInOrder(source, ["عملية الشعار", "بوابة الاسم", "عملية الأيقونة", "عملية اللونين"], `${label} internal final operations`);
  const verificationPosition = source.indexOf("finalNameVerified = true");
  const iconPosition = source.indexOf("عملية الأيقونة");
  assert.ok(verificationPosition >= 0 && iconPosition > verificationPosition, `${label} verifies the rendered name before icon generation`);
  assert.ok(source.includes("حرفًا بحرف") && source.includes("صورة الشعار نفسها"), `${label} verifies and edits the same logo`);
  assert.ok(source.includes("ناتج التعديل الفعلي") && source.includes("حدّث") && source.includes("finalLogoReference"), `${label} waits for and stores the corrected logo result`);
  assert.ok(source.includes("أعد فحص الاسم") || source.includes("أعد فحصه"), `${label} rechecks the corrected logo before the icon`);
  assert.ok(source.includes("approvedBoardReference") && source.includes("من الصفر"), `${label} creates the logo from scratch from the approved board`);
  assert.ok(source.includes("finalLogoReference") || source.includes("logo-ar.png النهائية"), `${label} uses the final logo as icon reference`);
  assert.ok(source.includes("رمز جديد") || source.includes("رمزًا جديدًا") || source.includes("لا تعِد ابتكار الرمز"), `${label} forbids a new icon symbol`);
  assert.ok(source.includes("LOGO_ONLY") && source.includes("ICON_ONLY"), `${label} defines isolated final image calls`);
  assert.ok(source.includes("لا تمرر") && source.includes("البرومبت") && source.includes("الشامل"), `${label} never forwards the master prompt to image generation`);
  assert.ok(source.includes("طلب صورة واحد = أصل واحد") && source.includes("canvas"), `${label} enforces one call per asset and canvas`);
  assert.ok(source.includes("لا تكتب للتاجر ولا تتوقف"), `${label} silently chains logo and icon calls`);
  assert.ok(source.includes("انتظر نتيجة") && source.includes("finalLogoReference"), `${label} waits for and stores the actual logo result`);
  assert.ok(source.includes("صورة finalLogoReference الفعلية") || source.includes("صورة `finalLogoReference` الفعلية"), `${label} passes the actual logo image to the icon call`);
  assert.ok(source.includes("فقط إذا رفضت المنصة") && source.includes("فعليًا"), `${label} resumes only after an actual platform rejection`);
  assert.ok(source.includes("لا تفترض مسبقًا") || source.includes("لا تفترض مسبقًا حد"), `${label} does not preselect a one-image-per-reply fallback`);
  assert.ok(!source.includes("pendingFinalAsset"), `${label} removes the proactive pending-asset branch`);

  assertInOrder(source, finalOrder, `${label} final delivery`);
  assert.ok(!source.includes("brand-catalog.png"), `${label} does not require a catalog file`);
  assert.ok(source.includes("الشعار النهائي") && source.includes("الأكثر حضورًا") && source.includes("داعم ظاهر"), `${label} derives colors from the final visible mark`);
  assert.ok(source.includes("الظلال") && source.includes("اللمعات") && source.includes("الانعكاسات"), `${label} excludes presentation effects from colors`);
  assert.doesNotMatch(source, /(?:Primary|Secondary):/u, `${label} exposes Arabic color labels only`);
}

const previewSection = markdownSection(skill, "## المرحلة الأولى: لوحة هوية واحدة", "## تعديل اللوحة");
for (const forbiddenPreviewContract of [/logo-ar\.png/u, /store-icon\.png/u, /1024x256/u, /32x32/u, /PNG/iu]) {
  assert.doesNotMatch(previewSection, forbiddenPreviewContract, "preview has no final file or export contract");
}
assert.ok(previewSection.includes("لا مقارنة ولا بدائل ولا عناوين اختيار"));
assert.ok(previewSection.includes("لا تضف") && previewSection.includes("أرقامًا"));
assert.ok(previewSection.includes("`BOARD_ONLY` وحده"), "preview invokes only BOARD_ONLY");

const isolationSection = markdownSection(skill, "## عزل طلبات الصور", "## ترتيب الحالة");
assert.ok(isolationSection.includes("`BOARD_ONLY`") && isolationSection.includes("`LOGO_ONLY`") && isolationSection.includes("`ICON_ONLY`"));
assert.ok(isolationSection.includes("لا تمرر نص المهارة الكامل") || skill.includes("لا تمرره كله"));
assert.ok(isolationSection.includes("طلب صورة واحد = أصل واحد = لوحة/ملف واحد"));
assert.ok(isolationSection.includes("لا تجمع أصلين") && isolationSection.includes("mega prompt"));

const finalSection = markdownSection(skill, "## الأصول النهائية بعد الاعتماد", "## عقد التسليم النهائي");
assertInOrder(finalSection, ["`LOGO_ONLY` وحده", "انتظر نتيجة الاستدعاء الفعلية", "finalLogoReference", "### بوابة الاسم", "finalNameVerified = true", "`ICON_ONLY` وحده", "صورة `finalLogoReference` الفعلية"], "skill approval controller");
assert.ok(finalSection.includes("لا تكتب للتاجر ولا تتوقف بين استدعاء الشعار واستدعاء الأيقونة"));
assert.ok(finalSection.includes("لا تؤجل الأيقونة اختياريًا"));

const copyApprovalController = copyPrompt.slice(copyPrompt.indexOf("بعد الاعتماد فقط"));
assertInOrder(copyApprovalController, ["LOGO_ONLY وحده", "انتظر نتيجة الصورة الفعلية", "finalLogoReference", "بوابة الاسم", "finalNameVerified = true", "ICON_ONLY وحده", "صورة finalLogoReference الفعلية"], "copy-paste approval controller");
assert.ok(copyApprovalController.includes("لا تكتب للتاجر ولا تتوقف بين استدعاء الشعار واستدعاء الأيقونة"));

for (const source of runtimeSurfaces) {
  for (const obsolete of ["optionMap", "optionBriefs", "selectedReference", "pendingFinalAsset", "الخيار 1", "الخيار 2", "الخيار 3", "<single-image-prompt>", "</single-image-prompt>", "<!--", "-->", "concept-1.png", "concept-2.png", "concept-3.png", "brand-catalog.png", "1536x1024", "[صورة"]) {
    assert.ok(!source.includes(obsolete), `runtime content excludes obsolete/leaky token ${obsolete}`);
  }
  for (const provider of ["Claude", "ChatGPT", "Gemini", "Manus", "Canva"]) {
    assert.ok(!source.includes(provider), `runtime content excludes provider/app ${provider}`);
  }
  assert.doesNotMatch(source, /(?:Primary|Secondary):/u, "merchant content excludes English color labels");
}

const defaultPrompt = agent.match(/^  default_prompt: "(.*)"$/mu)?.[1] || "";
assert.ok(defaultPrompt.startsWith("استخدم $create-store-brand-kit"));
assert.ok(defaultPrompt.includes("لوحة هوية واحدة فقط") && defaultPrompt.includes("أحدث لوحة معتمدة"));
assert.ok(defaultPrompt.includes("استدعاءين منفصلين متتابعين دون توقف"));
assert.equal(defaultPrompt.split("\n").length, 1);

assert.ok(outputTemplate.includes("نتيجة صورة واحدة فعلية") && outputTemplate.includes(approvalQuestion));
assert.ok(outputTemplate.includes("لوحة معدلة واحدة فقط"));
assert.ok(outputTemplate.includes("`LOGO_ONLY`") && outputTemplate.includes("`ICON_ONLY`") && outputTemplate.includes("لا يكتب المساعد أي نص للتاجر ولا ينهي الرد"));
assert.ok(exampleOutput.includes("لوحة هوية واحدة فعلية") && exampleOutput.includes("لوحة معدلة واحدة فعلية"));
assert.ok(exampleOutput.includes("طلب `LOGO_ONLY`") && exampleOutput.includes("طلب `ICON_ONLY`") && exampleOutput.includes("لا يظهر بين الاستدعاءين رد مرحلي"));
assert.ok(inputContract.includes("يجوز استخدام `trim` لاختبار") && inputContract.includes("لا تحفظ ناتج التقليم"));
assert.ok(schema.includes("approvedBoardReference = latestBoardReference"));
assert.ok(productionMethod.includes("لا تقص اللوحة") && productionMethod.includes("لا تعيد إنشاءها"));
assert.ok(sourceRegister.includes("المعاينة عملية صورة واحدة"));
assert.ok(productionMethod.includes("البرومبت الشامل يضبط الحالة والتسلسل فقط") && productionMethod.includes("لا تكتب للتاجر ولا تتوقف بين استدعائي الشعار والأيقونة"));
assert.ok(sourceRegister.includes("البرومبت الشامل متحكم فقط") && sourceRegister.includes("لا يظهر رد مرحلي ولا توقف اختياري"));

for (const source of [skill, copyPrompt, outputTemplate, exampleOutput, productionMethod, schema, sourceRegister]) {
  assert.ok(!source.includes("pendingFinalAsset"), "runtime contract removes pendingFinalAsset");
  assert.doesNotMatch(source, /إذا كانت المنصة (?:لا )?تسمح (?:إلا )?بعملية صورة واحدة/u, "runtime contract does not proactively branch on one image per reply");
}

for (const source of [skill, copyPrompt, productionMethod, schema]) {
  for (const rule of ["الشعار النهائي", "الأكثر حضورًا", "داعم ظاهر", "الظلال", "اللمعات", "الانعكاسات", "الأسود أو الأبيض", "HEX مسطح"]) {
    assert.ok(source.includes(rule), `color-selection contract preserves ${rule}`);
  }
}
assert.ok(skill.includes("لا تقيّد") && copyPrompt.includes("لا تقيّد"), "official colors do not constrain logo creativity");
assert.ok(productionMethod.includes("ليس قيدًا يحصر إبداعه"));

const exampleFinal = exampleOutput.match(/## الرد النهائي\n([\s\S]*)/u)?.[1] || "";
assert.deepEqual([...exampleFinal.matchAll(/#[0-9A-F]{6}/gu)].map((match) => match[0]), ["#8C4517", "#D6A15B"], "example final contains only two official colors");

assert.ok(productionMethod.includes("Python/Pillow") && productionMethod.includes("بعد توليد الأصل بصريًا"));
assert.ok(productionMethod.includes("إزالة الخلفية") && productionMethod.includes("الحفاظ على النسبة") && productionMethod.includes("بلا قص"));
assert.ok(productionMethod.includes("لا تطلب من التاجر تشغيل CLI أو منح إذن API"));
assert.ok(productionMethod.includes("خلفية شطرنجية مرسومة لا تحقق الشفافية"));
assert.ok(productionMethod.includes("الفاحص البنيوي لا يستطيع إثبات عدم القص"));
assert.ok(productionMethod.includes("validate-brand-kit.mjs"));
assert.ok(!validator.includes("catalogArg") && !validator.includes("CATALOG_MAX_BYTES"));
assert.ok(validator.includes("args.length !== 4"));
assert.ok(validator.includes("RGB أو خلفية شطرنجية مرسومة لا تعد شفافية"));
assertInOrder(outputTemplate, finalOrder, "output template final delivery");
assertInOrder(exampleOutput, finalLabelOrder, "example final delivery");

console.log("PASS single-board approval and final raster create-store-brand-kit workflow contract");
