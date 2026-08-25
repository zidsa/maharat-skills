#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { inflateSync } from "node:zlib";

const args = process.argv.slice(2);
const [primary, secondary, catalogArg, logoArg, iconArg] = args;
const ASSET_MAX_BYTES = 1_950_000;
const CATALOG_MAX_BYTES = 10_000_000;
const MIN_TRANSPARENT_RATIO = 0.01;
const LEGACY_FORBIDDEN_ARTIFACTS = new Set(["brand-board.png", "colors-hex.txt", "brand-kit.json", "brand-kit-report.md"]);
const HEX = /^#[0-9a-f]{6}$/i;
const errors = [];

function fail(message) { errors.push(message); }
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngInfo(file, width, height, { requiresAlpha, maxBytes }) {
  const bytes = fs.statSync(file).size;
  if (bytes > maxBytes) throw new Error(`الحجم ${bytes} يتجاوز ${maxBytes}`);
  const data = fs.readFileSync(file);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!data.subarray(0, 8).equals(signature)) throw new Error("ليس PNG صالحًا");
  let offset = 8; let header; const ids = []; let ended = false; let sawIdat = false; let idatClosed = false;
  while (offset + 12 <= data.length) {
    const length = data.readUInt32BE(offset); const type = data.toString("ascii", offset + 4, offset + 8);
    const start = offset + 8; const end = start + length;
    if (end + 4 > data.length) throw new Error("PNG مقطوع");
    const chunk = data.subarray(start, end); const storedCrc = data.readUInt32BE(end);
    if (crc32(Buffer.concat([Buffer.from(type, "ascii"), chunk])) !== storedCrc) throw new Error(`CRC غير صالح في ${type}`);
    if (!/^[A-Za-z]{4}$/u.test(type) || type[2] !== type[2].toUpperCase()) throw new Error("نوع chunk في PNG غير صالح أو يحمل reserved bit");
    if (!header && type !== "IHDR") throw new Error("يجب أن يكون IHDR أول chunk");
    if (type === "IHDR") { if (header || length !== 13) throw new Error("IHDR غير صالح أو مكرر"); header = chunk; }
    else if (type === "IDAT") { if (idatClosed) throw new Error("IDAT يجب أن تكون متجاورة"); sawIdat = true; ids.push(chunk); }
    else if (type === "tRNS") throw new Error("tRNS غير مدعوم في PNG المدعوم");
    else if (type === "IEND") { if (!sawIdat || length !== 0 || ended) throw new Error("IEND غير صالح"); ended = true; offset = end + 4; break; }
    else { if (sawIdat) idatClosed = true; if (/^[A-Z]/u.test(type)) throw new Error(`chunk حرج غير مدعوم: ${type}`); }
    offset = end + 4;
  }
  if (!header || !ids.length || !ended || offset !== data.length) throw new Error("PNG يفتقد IEND صالحًا أو يحتوي بيانات لاحقة");
  const actualWidth = header.readUInt32BE(0); const actualHeight = header.readUInt32BE(4);
  const bitDepth = header[8]; const type = header[9];
  if (actualWidth !== width || actualHeight !== height) throw new Error(`المقاس ${actualWidth}x${actualHeight}، المطلوب ${width}x${height}`);
  if (bitDepth !== 8 || (requiresAlpha ? type !== 6 : ![2, 6].includes(type)) || header[10] || header[11] || header[12]) throw new Error(requiresAlpha ? "يلزم PNG RGBA 8-bit غير متداخل" : "يلزم PNG RGB أو RGBA 8-bit غير متداخل");
  const bpp = type === 6 ? 4 : 3; const stride = actualWidth * bpp; const expectedRawBytes = (stride + 1) * actualHeight;
  const raw = inflateSync(Buffer.concat(ids), { maxOutputLength: expectedRawBytes });
  if (raw.length !== expectedRawBytes) throw new Error("بيانات PNG غير متوقعة");
  let previous = Buffer.alloc(stride); let pos = 0; let transparentPixels = 0; let visible = false; const cornersTransparent = [false, false, false, false];
  const paeth = (a, b, c) => { const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < actualHeight; y += 1) {
    const filter = raw[pos++]; const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x += 1) { const left = x >= bpp ? row[x - bpp] : 0; const up = previous[x]; const ul = x >= bpp ? previous[x - bpp] : 0; const p = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : filter === 4 ? paeth(left, up, ul) : null; if (p === null) throw new Error("مرشح PNG غير مدعوم"); row[x] = (raw[pos + x] + p) & 255; }
    pos += stride;
    if (type === 2) visible = true;
    else for (let x = 0; x < actualWidth; x += 1) {
      const alpha = row[x * bpp + bpp - 1];
      visible ||= alpha > 0;
      if (alpha === 0) {
        transparentPixels += 1;
        if (x === 0 && y === 0) cornersTransparent[0] = true;
        if (x === actualWidth - 1 && y === 0) cornersTransparent[1] = true;
        if (x === 0 && y === actualHeight - 1) cornersTransparent[2] = true;
        if (x === actualWidth - 1 && y === actualHeight - 1) cornersTransparent[3] = true;
      }
    }
    previous = row;
  }
  if (!visible) throw new Error("يلزم بكسلات مرئية فعلية");
  if (requiresAlpha && (!cornersTransparent.every(Boolean) || transparentPixels / (actualWidth * actualHeight) < MIN_TRANSPARENT_RATIO)) throw new Error("يلزم خلفية شفافة فعلية: الأركان الأربعة شفافة و1% على الأقل من البكسلات alpha=0");
  return { width: actualWidth, height: actualHeight, bytes: data.length };
}

if (args.some((arg) => arg.startsWith("--"))) fail("لا توجد أعلام fallback؛ يقبل الفاحص ثلاثية PNG فقط");
if (![primary, secondary, catalogArg, logoArg, iconArg].every(Boolean) || args.length !== 5) fail("الاستخدام: node scripts/validate-brand-kit.mjs <primary-hex> <secondary-hex> <catalog-asset> <logo-asset> <icon-asset>");
if (primary && !HEX.test(primary)) fail("Primary يجب أن يكون HEX من ست خانات");
if (secondary && !HEX.test(secondary)) fail("Secondary يجب أن يكون HEX من ست خانات");
if (primary?.toLowerCase() === secondary?.toLowerCase()) fail("Primary وSecondary يجب أن يكونا مختلفين");

let mode; let directory; const inspected = {};
if (catalogArg && logoArg && iconArg) {
  const catalog = path.resolve(catalogArg); const logo = path.resolve(logoArg); const icon = path.resolve(iconArg); directory = path.dirname(catalog);
  if (path.dirname(logo) !== directory || path.dirname(icon) !== directory) fail("يجب أن تكون الصور الثلاث في مجلد تسليم واحد");
  const ext = path.extname(catalog).toLowerCase(); const logoExt = path.extname(logo).toLowerCase(); const iconExt = path.extname(icon).toLowerCase();
  if (ext !== ".png" || logoExt !== ".png" || iconExt !== ".png") fail("يلزم ثلاثية PNG فقط؛ SVG أو أي امتداد آخر مرفوض");
  else {
    mode = "png";
    const expected = ["brand-catalog.png", "logo-ar.png", "store-icon.png"];
    if ([path.basename(catalog), path.basename(logo), path.basename(icon)].some((name, index) => name !== expected[index])) fail(`الأسماء المطلوبة: ${expected.join(" و ")}`);
    try { inspected.catalog = pngInfo(catalog, 1536, 1024, { requiresAlpha: false, maxBytes: CATALOG_MAX_BYTES }); } catch (error) { fail(`catalog: ${error.message}`); }
    try { inspected.logo = pngInfo(logo, 1024, 256, { requiresAlpha: true, maxBytes: ASSET_MAX_BYTES }); } catch (error) { fail(`logo: ${error.message}`); }
    try { inspected.icon = pngInfo(icon, 32, 32, { requiresAlpha: true, maxBytes: ASSET_MAX_BYTES }); } catch (error) { fail(`icon: ${error.message}`); }
    if (fs.existsSync(directory)) for (const entry of fs.readdirSync(directory, { withFileTypes: true })) if (entry.isFile() && LEGACY_FORBIDDEN_ARTIFACTS.has(entry.name)) fail(`${entry.name}: أثر قديم محظور`);
  }
}

console.log(JSON.stringify({ valid: errors.length === 0, mode: mode || null, inspected_assets: inspected, errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
