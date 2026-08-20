#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { inflateSync } from "node:zlib";

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("الاستخدام: node scripts/validate-brand-kit.mjs <brand-kit.json>");
  process.exit(2);
}

const MAX_BYTES = 1_950_000;
const HEX = /^#[0-9A-Fa-f]{6}$/;
const errors = [];
const resolvedManifest = path.resolve(process.cwd(), manifestPath);
const assetDirectory = path.dirname(resolvedManifest);

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(resolvedManifest, "utf8"));
} catch (error) {
  console.error(JSON.stringify({ valid: false, errors: [`تعذر قراءة manifest: ${error.message}`] }, null, 2));
  process.exit(1);
}

function luminance(value) {
  const channels = value
    .slice(1)
    .match(/../g)
    .map((channel) => parseInt(channel, 16) / 255)
    .map((channel) => channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first, second) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function checkContrast(label, foreground, background, minimum) {
  if (!HEX.test(foreground || "") || !HEX.test(background || "")) return;
  const ratio = contrast(foreground, background);
  if (ratio < minimum) {
    errors.push(`${label}: ${ratio.toFixed(3)}:1 أقل من ${minimum}:1`);
  }
}

function paeth(a, b, c) {
  const prediction = a + b - c;
  const distanceA = Math.abs(prediction - a);
  const distanceB = Math.abs(prediction - b);
  const distanceC = Math.abs(prediction - c);
  if (distanceA <= distanceB && distanceA <= distanceC) return a;
  if (distanceB <= distanceC) return b;
  return c;
}

function inspectPng(filePath, expectedWidth, expectedHeight) {
  const data = fs.readFileSync(filePath);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (data.length < 33 || !data.subarray(0, 8).equals(signature)) {
    throw new Error("الملف ليس PNG صالحًا");
  }
  if (data.length > MAX_BYTES) {
    throw new Error(`الحجم ${data.length} بايت يتجاوز ${MAX_BYTES}`);
  }

  let offset = 8;
  let header;
  const imageData = [];
  while (offset + 12 <= data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString("ascii", offset + 4, offset + 8);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + length;
    if (chunkEnd + 4 > data.length) throw new Error("بنية PNG مقطوعة");
    const chunk = data.subarray(chunkStart, chunkEnd);
    if (type === "IHDR") header = chunk;
    if (type === "IDAT") imageData.push(chunk);
    offset = chunkEnd + 4;
    if (type === "IEND") break;
  }

  if (!header || header.length !== 13 || !imageData.length) {
    throw new Error("PNG يفتقد IHDR أو IDAT");
  }

  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const bitDepth = header[8];
  const colorType = header[9];
  const compression = header[10];
  const filter = header[11];
  const interlace = header[12];
  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(`المقاس ${width}×${height}، المطلوب ${expectedWidth}×${expectedHeight}`);
  }
  if (bitDepth !== 8 || ![4, 6].includes(colorType) || compression !== 0 || filter !== 0 || interlace !== 0) {
    throw new Error("يلزم PNG غير متداخل 8-bit مع قناة alpha");
  }

  const bytesPerPixel = colorType === 6 ? 4 : 2;
  const alphaOffset = colorType === 6 ? 3 : 1;
  const stride = width * bytesPerPixel;
  const raw = inflateSync(Buffer.concat(imageData));
  if (raw.length !== (stride + 1) * height) {
    throw new Error("حجم بيانات PNG المفكوكة غير متوقع");
  }

  let previous = Buffer.alloc(stride);
  let rawOffset = 0;
  let hasTransparentPixel = false;
  let hasVisiblePixel = false;
  for (let y = 0; y < height; y += 1) {
    const filterType = raw[rawOffset];
    rawOffset += 1;
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x += 1) {
      const encoded = raw[rawOffset + x];
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const up = previous[x];
      const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      let predictor;
      if (filterType === 0) predictor = 0;
      else if (filterType === 1) predictor = left;
      else if (filterType === 2) predictor = up;
      else if (filterType === 3) predictor = Math.floor((left + up) / 2);
      else if (filterType === 4) predictor = paeth(left, up, upLeft);
      else throw new Error(`مرشح PNG غير مدعوم: ${filterType}`);
      row[x] = (encoded + predictor) & 255;
    }
    for (let x = alphaOffset; x < stride; x += bytesPerPixel) {
      if (row[x] === 0) hasTransparentPixel = true;
      if (row[x] > 0) hasVisiblePixel = true;
    }
    rawOffset += stride;
    previous = row;
  }

  if (!hasTransparentPixel) throw new Error("لا توجد بكسلات شفافة فعلية");
  if (!hasVisiblePixel) throw new Error("الصورة شفافة كليًا وبلا محتوى مرئي");
  return { width, height, bytes: data.length, transparent: true };
}

if (manifest.schema_version !== 1) errors.push("schema_version يجب أن يساوي 1");
if (!["assets_ready", "prompts_only"].includes(manifest.status)) errors.push("status غير صالح");
if (!manifest.store?.name_ar?.trim()) errors.push("store.name_ar مطلوب");

if (!Array.isArray(manifest.source_register) || manifest.source_register.length === 0) {
  errors.push("source_register مطلوب");
} else {
  const sourceIds = new Set();
  for (const source of manifest.source_register) {
    if (!source.id || sourceIds.has(source.id)) errors.push("مصدر مكرر أو بلا معرف");
    sourceIds.add(source.id);
    if (!["merchant_input", "public_url", "artifact"].includes(source.type)) errors.push(`${source.id || "source"}: type غير صالح`);
    if (source.type === "public_url" && !/^https:\/\/\S+$/.test(source.url || "")) errors.push(`${source.id}: رابط HTTPS مطلوب`);
    if (source.type !== "public_url" && !source.detail?.trim()) errors.push(`${source.id}: detail مطوب`);
  }
}

if (!Array.isArray(manifest.directions) || manifest.directions.length !== 3) {
  errors.push("directions يجب أن تحتوي ثلاثة اتجاهات");
} else {
  const directionIds = new Set();
  for (const direction of manifest.directions) {
    if (!direction.id || directionIds.has(direction.id)) errors.push("اتجاه مكرر أو بلا معرف");
    directionIds.add(direction.id);
    if (!direction.summary?.trim() || !Number.isFinite(direction.score)) errors.push(`${direction.id || "direction"}: summary وscore مطلوبان`);
  }
  if (!directionIds.has(manifest.selected_direction)) errors.push("selected_direction لا يشير إلى اتجاه موجود");
}

const paletteKeys = ["primary", "on_primary", "secondary", "on_secondary", "background", "on_background"];
for (const key of paletteKeys) {
  if (!HEX.test(manifest.palette?.[key] || "")) errors.push(`palette.${key} يجب أن يكون HEX من ست خانات`);
}
if (manifest.palette?.primary?.toUpperCase() === manifest.palette?.secondary?.toUpperCase()) {
  errors.push("اللونان الرئيسي والثانوي متطابقان");
}

if (paletteKeys.every((key) => HEX.test(manifest.palette?.[key] || ""))) {
  checkContrast("نص الرئيسي", manifest.palette.on_primary, manifest.palette.primary, 4.5);
  checkContrast("نص الثانوي", manifest.palette.on_secondary, manifest.palette.secondary, 4.5);
  checkContrast("نص الخلفية", manifest.palette.on_background, manifest.palette.background, 4.5);
  checkContrast("الرئيسي مع الخلفية", manifest.palette.primary, manifest.palette.background, 3);
  checkContrast("الثانوي مع الخلفية", manifest.palette.secondary, manifest.palette.background, 3);
}

for (const key of ["logo_png", "icon_png"]) {
  if (!manifest.fallback_prompts?.[key] || manifest.fallback_prompts[key].trim().length < 120) {
    errors.push(`fallback_prompts.${key} يجب أن يكون برومبتًا كاملًا`);
  }
}

const inspectedAssets = {};
if (manifest.status === "assets_ready") {
  const requiredQa = ["arabic_spelling_verified", "transparent_background_verified", "icon_at_32px_verified", "originality_reviewed"];
  for (const key of requiredQa) {
    if (manifest.qa?.[key] !== true) errors.push(`qa.${key} يجب أن يساوي true في assets_ready`);
  }

  const expectedAssets = [
    ["logo_png", 1024, 256, "logo-ar.png"],
    ["icon_png", 32, 32, "store-icon.png"],
  ];
  for (const [key, width, height, expectedName] of expectedAssets) {
    const asset = manifest.assets?.[key];
    if (!asset) {
      errors.push(`assets.${key} مطلوب`);
      continue;
    }
    if (asset.file !== expectedName || path.basename(asset.file) !== asset.file) {
      errors.push(`assets.${key}.file يجب أن يساوي ${expectedName}`);
      continue;
    }
    if (asset.width !== width || asset.height !== height) errors.push(`assets.${key}: مقاس manifest غير صحيح`);
    const filePath = path.join(assetDirectory, asset.file);
    if (!fs.existsSync(filePath)) {
      errors.push(`${asset.file}: الصورة مفقودة`);
      continue;
    }
    try {
      inspectedAssets[key] = inspectPng(filePath, width, height);
    } catch (error) {
      errors.push(`${asset.file}: ${error.message}`);
    }
  }
} else if (manifest.assets && Object.keys(manifest.assets).length > 0) {
  errors.push("prompts_only يجب أن يحتوي assets فارغًا لمنع ادعاء وجود صور");
}

console.log(JSON.stringify({
  valid: errors.length === 0,
  status: manifest.status,
  ready_for_upload: errors.length === 0 && manifest.status === "assets_ready",
  inspected_assets: inspectedAssets,
  errors,
}, null, 2));

if (errors.length) process.exit(1);
