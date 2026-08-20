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

const longPrompt = "أنشئ صورة عربية أصلية من الصفر مع الالتزام بالاسم العربي حرفيًا والمقاس المطلوب والخلفية الشفافة الفعلية ومنع الموكاب والعلامة المائية والنصوص الإضافية.";

function baseManifest(status = "assets_ready") {
  return {
    schema_version: 1,
    status,
    store: { name_ar: "اختبار" },
    source_register: [{ id: "merchant-brief", type: "merchant_input", detail: "الاسم وما يبيعه المتجر" }],
    directions: [
      { id: "A", summary: "رمز خطي بسيط", score: 18 },
      { id: "B", summary: "رمز هندسي مضغوط", score: 15 },
      { id: "C", summary: "علامة حرفية لينة", score: 14 },
    ],
    selected_direction: "A",
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
        logo_png: { file: "logo-ar.png", width: 1024, height: 256 },
        icon_png: { file: "store-icon.png", width: 32, height: 32 },
      }
      : {},
    fallback_prompts: { logo_png: longPrompt, icon_png: longPrompt },
    qa: {
      arabic_spelling_verified: status === "assets_ready",
      transparent_background_verified: status === "assets_ready",
      icon_at_32px_verified: status === "assets_ready",
      originality_reviewed: status === "assets_ready",
    },
  };
}

const cases = [
  ["valid assets", true, () => baseManifest()],
  ["valid prompts only", true, () => baseManifest("prompts_only")],
  ["low contrast", false, () => { const x = baseManifest("prompts_only"); x.palette.primary = "#777777"; x.palette.on_primary = "#888888"; return x; }],
  ["missing prompt", false, () => { const x = baseManifest("prompts_only"); x.fallback_prompts.icon_png = "قصير"; return x; }],
  ["unverified Arabic", false, () => { const x = baseManifest(); x.qa.arabic_spelling_verified = false; return x; }],
  ["wrong logo dimensions", false, () => baseManifest(), { logoWidth: 1000 }],
  ["opaque icon", false, () => baseManifest(), { opaqueIcon: true }],
];

let failures = 0;
for (const [name, expected, createManifest, fixture = {}] of cases) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "store-brand-kit-"));
  const manifest = createManifest();
  if (manifest.status === "assets_ready") {
    writePng(path.join(directory, "logo-ar.png"), fixture.logoWidth ?? 1024, 256);
    writePng(path.join(directory, "store-icon.png"), 32, 32, fixture.opaqueIcon ?? false);
  }
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
