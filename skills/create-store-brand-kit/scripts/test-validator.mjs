#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const validatorPath = fileURLToPath(new URL("./validate-brand-kit.mjs", import.meta.url));

function pngChunk(type, payload) {
  const chunk = Buffer.alloc(12 + payload.length);
  chunk.writeUInt32BE(payload.length, 0);
  chunk.write(type, 4, 4, "ascii");
  payload.copy(chunk, 8);
  return chunk;
}

function writePng(destination, width, height, opaque = false) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const pixel = rowStart + 1 + x * 4;
      raw[pixel] = 90;
      raw[pixel + 1] = 33;
      raw[pixel + 2] = 52;
      raw[pixel + 3] = opaque || (x > width / 4 && x < width * 0.75 && y > height / 4 && y < height * 0.75) ? 255 : 0;
    }
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  fs.writeFileSync(destination, Buffer.concat([
    signature,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]));
}

const visualAnchor = "رمز هندسي من قوسين متناظرين بسمك ثابت وزوايا مستديرة، الرمز باللون الثانوي والاسم باللون الرئيسي، ويمنع تغيير هذه النسب بين الملفات.";
const rasterRule = "مسار الإنتاج: direct_raster_png فقط؛ يمنع SVG وHTML وInkscape وأي وسيط متجهي في جميع المراحل.";
const longPrompt = `${visualAnchor} ${rasterRule} أنشئ صورة عربية أصلية من الصفر مع الالتزام بالاسم العربي حرفيًا والمقاس المطلوب ومنع الموكاب والعلامة المائية والنصوص الإضافية.`;

function baseManifest(status = "assets_ready") {
  return {
    schema_version: 3,
    status,
    store: { name_ar: "اختبار" },
    source_register: [{ id: "merchant-brief", type: "merchant_input", detail: "الاسم وما يبيعه المتجر" }],
    directions: [
      { id: "A", summary: "رمز خطي بسيط", score: 18 },
      { id: "B", summary: "رمز هندسي مضغوط", score: 15 },
      { id: "C", summary: "علامة حرفية لينة", score: 14 },
    ],
    selected_direction: "A",
    visual_anchor: visualAnchor,
    production: {
      pipeline: "direct_raster_png",
      image_generation_used: status === "assets_ready",
      svg_used: false,
      html_used: false,
      inkscape_used: false,
      vector_intermediate_used: false,
      conversion_to_png_used: false,
      arabic_generation_attempts: status === "assets_ready" ? 1 : 0,
    },
    palette: {
      primary: "#5A2134",
      on_primary: "#FFFFFF",
      secondary: "#8C4517",
      on_secondary: "#FFFFFF",
      background: "#FFFDF8",
      on_background: "#1C1917",
    },
    assets: status === "assets_ready"
      ? {
        brand_board_png: { file: "brand-board.png", width: 1536, height: 1024 },
        logo_png: { file: "logo-ar.png", width: 1024, height: 256 },
        icon_png: { file: "store-icon.png", width: 32, height: 32 },
      }
      : {},
    fallback_prompts: { brand_board_png: longPrompt, logo_png: longPrompt, icon_png: longPrompt },
    qa: {
      direct_raster_pipeline_verified: status === "assets_ready",
      outputs_are_separate_verified: status === "assets_ready",
      palette_reported_as_text: status === "assets_ready",
      qa_report_reported_as_text: status === "assets_ready",
      brand_board_dimensions_verified: status === "assets_ready",
      visual_consistency_verified: status === "assets_ready",
      arabic_spelling_verified: status === "assets_ready",
      arabic_text_inside_logo_verified: status === "assets_ready",
      logo_transparent_background_verified: status === "assets_ready",
      icon_transparent_background_verified: status === "assets_ready",
      icon_at_32px_verified: status === "assets_ready",
      originality_reviewed: status === "assets_ready",
    },
  };
}

const cases = [
  ["valid assets", true, () => baseManifest()],
  ["valid prompts only", true, () => baseManifest("prompts_only")],
  ["valid prompts after rejected raster attempts", true, () => { const x = baseManifest("prompts_only"); x.production.image_generation_used = true; x.production.arabic_generation_attempts = 3; return x; }],
  ["low contrast", false, () => { const x = baseManifest("prompts_only"); x.palette.primary = "#777777"; x.palette.on_primary = "#888888"; return x; }],
  ["missing prompt", false, () => { const x = baseManifest("prompts_only"); x.fallback_prompts.icon_png = "قصير"; return x; }],
  ["prompt missing shared anchor", false, () => { const x = baseManifest("prompts_only"); x.fallback_prompts.icon_png = "أنشئ أيقونة عربية مستقلة وأصلية بخلفية شفافة ومقاس دقيق وبلا نص إضافي أو موكاب أو علامة مائية، مع التحقق من الملف قبل التسليم."; return x; }],
  ["prompt missing raster-only rule", false, () => { const x = baseManifest("prompts_only"); x.fallback_prompts.icon_png = `${visualAnchor} أنشئ أيقونة Raster عربية مستقلة وأصلية بخلفية شفافة ومقاس دقيق وبلا نص إضافي أو موكاب أو علامة مائية، مع التحقق من الملف قبل التسليم.`; return x; }],
  ["unverified Arabic", false, () => { const x = baseManifest(); x.qa.arabic_spelling_verified = false; return x; }],
  ["Arabic text not verified inside logo", false, () => { const x = baseManifest(); x.qa.arabic_text_inside_logo_verified = false; return x; }],
  ["raster pipeline not verified", false, () => { const x = baseManifest(); x.qa.direct_raster_pipeline_verified = false; return x; }],
  ["SVG used", false, () => { const x = baseManifest(); x.production.svg_used = true; return x; }],
  ["HTML used", false, () => { const x = baseManifest(); x.production.html_used = true; return x; }],
  ["Inkscape used", false, () => { const x = baseManifest(); x.production.inkscape_used = true; return x; }],
  ["vector intermediate used", false, () => { const x = baseManifest(); x.production.vector_intermediate_used = true; return x; }],
  ["conversion to PNG used", false, () => { const x = baseManifest(); x.production.conversion_to_png_used = true; return x; }],
  ["SVG to PNG pipeline", false, () => { const x = baseManifest(); x.production.pipeline = "svg_to_png"; return x; }],
  ["assets without image generation", false, () => { const x = baseManifest(); x.production.image_generation_used = false; x.production.arabic_generation_attempts = 0; return x; }],
  ["more than three Arabic attempts", false, () => { const x = baseManifest(); x.production.arabic_generation_attempts = 4; return x; }],
  ["outputs not separate", false, () => { const x = baseManifest(); x.qa.outputs_are_separate_verified = false; return x; }],
  ["palette not reported as text", false, () => { const x = baseManifest(); x.qa.palette_reported_as_text = false; return x; }],
  ["missing brand board", false, () => { const x = baseManifest(); delete x.assets.brand_board_png; return x; }],
  ["wrong brand board dimensions", false, () => baseManifest(), { boardWidth: 1500 }],
  ["wrong logo dimensions", false, () => baseManifest(), { logoWidth: 1000 }],
  ["opaque icon", false, () => baseManifest(), { opaqueIcon: true }],
  ["banned SVG companion file", false, () => baseManifest(), { bannedFile: "draft.svg" }],
];

let failures = 0;
for (const [name, expected, createManifest, fixture = {}] of cases) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "store-brand-kit-"));
  const manifest = createManifest();
  if (manifest.status === "assets_ready") {
    writePng(path.join(directory, "brand-board.png"), fixture.boardWidth ?? 1536, 1024, true);
    writePng(path.join(directory, "logo-ar.png"), fixture.logoWidth ?? 1024, 256);
    writePng(path.join(directory, "store-icon.png"), 32, 32, fixture.opaqueIcon ?? false);
  }
  if (fixture.bannedFile) fs.writeFileSync(path.join(directory, fixture.bannedFile), "<svg></svg>");
  const inputPath = path.join(directory, "brand-kit.json");
  fs.writeFileSync(inputPath, JSON.stringify(manifest, null, 2));
  const result = spawnSync(process.execPath, [validatorPath, inputPath], { encoding: "utf8" });
  const actual = result.status === 0;
  fs.rmSync(directory, { recursive: true, force: true });
  if (actual !== expected) {
    failures += 1;
    console.error(`FAIL ${name}\n${result.stdout}${result.stderr}`);
  } else {
    console.log(`PASS ${name}`);
  }
}

if (failures) process.exit(1);
console.log(`PASS ${cases.length}/${cases.length}`);
