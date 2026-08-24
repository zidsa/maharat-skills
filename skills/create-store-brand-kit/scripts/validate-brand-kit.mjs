#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { inflateSync } from "node:zlib";

const args = process.argv.slice(2);
const claudeFallback = args[0] === "--claude-fallback";
if (claudeFallback) args.shift();
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
  const expectedType = requiresAlpha ? 6 : 2;
  if (bitDepth !== 8 || type !== expectedType || header[10] || header[11] || header[12]) throw new Error(requiresAlpha ? "يلزم PNG RGBA 8-bit غير متداخل" : "يلزم PNG truecolor 8-bit غير متداخل");
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

const commonSvgAttributes = ["id", "transform", "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "opacity", "clip-path", "clip-rule", "mask"];
const svgAttributes = new Map([
  ["svg", new Set(["width", "height", "viewBox", "xmlns"])],
  ["defs", new Set(["id"])], ["g", new Set(commonSvgAttributes)], ["path", new Set([...commonSvgAttributes, "d"])],
  ["rect", new Set([...commonSvgAttributes, "x", "y", "width", "height", "rx", "ry"])], ["circle", new Set([...commonSvgAttributes, "cx", "cy", "r"])],
  ["ellipse", new Set([...commonSvgAttributes, "cx", "cy", "rx", "ry"])], ["line", new Set([...commonSvgAttributes, "x1", "y1", "x2", "y2"])],
  ["polyline", new Set([...commonSvgAttributes, "points"])], ["polygon", new Set([...commonSvgAttributes, "points"])],
  ["text", new Set([...commonSvgAttributes, "x", "y", "dx", "dy", "text-anchor", "font-size", "font-weight", "font-family", "letter-spacing"])],
  ["tspan", new Set([...commonSvgAttributes, "x", "y", "dx", "dy", "text-anchor", "font-size", "font-weight", "font-family", "letter-spacing"])],
  ["linearGradient", new Set(["id", "x1", "y1", "x2", "y2", "gradientUnits", "gradientTransform"])], ["radialGradient", new Set(["id", "cx", "cy", "r", "fx", "fy", "gradientUnits", "gradientTransform"])],
  ["stop", new Set(["offset", "stop-color", "stop-opacity"])], ["clipPath", new Set(["id", "clipPathUnits", "transform"])],
  ["mask", new Set(["id", "x", "y", "width", "height", "maskUnits", "maskContentUnits", "transform"])],
]);
const localReferenceAttributes = new Set(["fill", "stroke", "clip-path", "mask"]);

function svgInfo(file, width, height, maxBytes) {
  if (fs.statSync(file).size > maxBytes) throw new Error(`الحجم يتجاوز ${maxBytes}`);
  const source = fs.readFileSync(file, "utf8").trim();
  if (!/^<svg\b[\s\S]*<\/svg>$/u.test(source) || /[&\\]/u.test(source) || /<!(?:DOCTYPE|ENTITY|\[CDATA\[)|<\?/iu.test(source)) throw new Error("ليس SVG آمنًا قائمًا بذاته");
  const stack = []; const ids = new Set(); const references = []; const tokens = /<[^>]*>/gu; let previous = 0; let match;
  while ((match = tokens.exec(source))) {
    const text = source.slice(previous, match.index);
    if (text.includes("<") || (text.trim() && !stack.some((element) => element === "text" || element === "tspan"))) throw new Error("نص SVG خارج عنصر نصي أو XML غير صالح");
    const token = match[0]; previous = tokens.lastIndex;
    if (/^<\//u.test(token)) {
      const name = token.match(/^<\/([A-Za-z][\w:-]*)\s*>$/u)?.[1];
      if (!name || stack.pop() !== name) throw new Error("تداخل XML غير صالح");
      continue;
    }
    const selfClosing = /\/\s*>$/u.test(token); const open = token.match(/^<([A-Za-z][\w:-]*)([\s\S]*?)(?:\/\s*)?>$/u);
    if (!open || !svgAttributes.has(open[1]) || (open[1] === "svg" && (stack.length || match.index !== 0))) throw new Error("عنصر SVG غير مسموح");
    const [name, attributeText] = [open[1], open[2]]; const attributes = new Set(); let offset = 0;
    while (offset < attributeText.length) {
      const whitespace = attributeText.slice(offset).match(/^\s+/u); if (whitespace) { offset += whitespace[0].length; continue; }
      const attribute = attributeText.slice(offset).match(/^([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/u);
      if (!attribute) throw new Error("خاصية SVG غير صالحة أو بلا اقتباس");
      const attributeName = attribute[1]; const value = attribute[2] ?? attribute[3] ?? "";
      if (attributes.has(attributeName) || !svgAttributes.get(name).has(attributeName) || /[<>&\\]/u.test(value) || /^on/i.test(attributeName) || /^(?:href|xlink:href|style)$/iu.test(attributeName)) throw new Error("خاصية SVG غير مسموحة أو مكررة");
      attributes.add(attributeName); offset += attribute[0].length;
      if (attributeName === "id") { if (!/^[A-Za-z_][\w:.-]*$/u.test(value) || ids.has(value)) throw new Error("معرف SVG غير صالح أو مكرر"); ids.add(value); }
      if (/url\s*\(/iu.test(value)) {
        const localReference = value.match(/^url\(\s*#([A-Za-z_][\w:.-]*)\s*\)$/u)?.[1];
        if (!localReference || !localReferenceAttributes.has(attributeName)) throw new Error("url() يجب أن يشير إلى معرف محلي مسموح");
        references.push(localReference);
      }
    }
    if (name === "svg" && (attributes.size !== 4 || !attributes.has("width") || !attributes.has("height") || !attributes.has("viewBox") || !attributes.has("xmlns"))) throw new Error("خصائص svg الجذر غير مكتملة");
    if (name === "svg") {
      const root = Object.fromEntries([...attributes].map((key) => [key, attributeText.match(new RegExp(`\\b${key}\\s*=\\s*["']([^"']*)["']`, "u"))?.[1]]));
      if (root.width !== String(width) || root.height !== String(height) || root.viewBox !== `0 0 ${width} ${height}` || root.xmlns !== "http://www.w3.org/2000/svg") throw new Error("العرض أو الارتفاع أو viewBox أو xmlns غير مطابق");
    }
    if (!selfClosing) stack.push(name);
  }
  const trailing = source.slice(previous); if (trailing.includes("<") || trailing.trim() || stack.length) throw new Error("بنية XML غير مكتملة");
  for (const id of references) if (!ids.has(id)) throw new Error(`مرجع محلي مفقود: #${id}`);
  return { width, height, bytes: Buffer.byteLength(source) };
}

if (args.some((arg) => arg.startsWith("--"))) fail("علم غير معروف؛ العلم الوحيد المسموح هو --claude-fallback قبل الوسائط");
if (![primary, secondary, catalogArg, logoArg, iconArg].every(Boolean) || args.length !== 5) fail("الاستخدام: node scripts/validate-brand-kit.mjs [--claude-fallback] <primary-hex> <secondary-hex> <catalog-asset> <logo-asset> <icon-asset>");
if (primary && !HEX.test(primary)) fail("Primary يجب أن يكون HEX من ست خانات");
if (secondary && !HEX.test(secondary)) fail("Secondary يجب أن يكون HEX من ست خانات");
if (primary?.toLowerCase() === secondary?.toLowerCase()) fail("Primary وSecondary يجب أن يكونا مختلفين");

let mode; let directory; const inspected = {};
if (catalogArg && logoArg && iconArg) {
  const catalog = path.resolve(catalogArg); const logo = path.resolve(logoArg); const icon = path.resolve(iconArg); directory = path.dirname(catalog);
  if (path.dirname(logo) !== directory || path.dirname(icon) !== directory) fail("يجب أن تكون الصور الثلاث في مجلد تسليم واحد");
  const ext = path.extname(catalog).toLowerCase(); const logoExt = path.extname(logo).toLowerCase(); const iconExt = path.extname(icon).toLowerCase();
  if (![".png", ".svg"].includes(ext) || ext !== logoExt || ext !== iconExt) fail("يلزم ثلاثية PNG أو ثلاثية SVG متطابقة، دون خلط الصيغ");
  else {
    mode = ext.slice(1);
    if (mode === "svg" && !claudeFallback) fail("SVG يتطلب --claude-fallback لاستثناء Claude فقط");
    if (mode === "png" && claudeFallback) fail("--claude-fallback مخصص لثلاثية SVG فقط");
    const expected = mode === "png" ? ["brand-catalog.png", "logo-ar.png", "store-icon.png"] : ["brand-catalog.svg", "logo-ar.svg", "store-icon.svg"];
    if ([path.basename(catalog), path.basename(logo), path.basename(icon)].some((name, index) => name !== expected[index])) fail(`الأسماء المطلوبة: ${expected.join(" و ")}`);
    try { inspected.catalog = mode === "png" ? pngInfo(catalog, 1536, 1024, { requiresAlpha: false, maxBytes: CATALOG_MAX_BYTES }) : svgInfo(catalog, 1536, 1024, CATALOG_MAX_BYTES); } catch (error) { fail(`catalog: ${error.message}`); }
    try { inspected.logo = mode === "png" ? pngInfo(logo, 1024, 256, { requiresAlpha: true, maxBytes: ASSET_MAX_BYTES }) : svgInfo(logo, 1024, 256, ASSET_MAX_BYTES); } catch (error) { fail(`logo: ${error.message}`); }
    try { inspected.icon = mode === "png" ? pngInfo(icon, 32, 32, { requiresAlpha: true, maxBytes: ASSET_MAX_BYTES }) : svgInfo(icon, 32, 32, ASSET_MAX_BYTES); } catch (error) { fail(`icon: ${error.message}`); }
    if (fs.existsSync(directory)) for (const entry of fs.readdirSync(directory, { withFileTypes: true })) if (entry.isFile() && LEGACY_FORBIDDEN_ARTIFACTS.has(entry.name)) fail(`${entry.name}: أثر قديم محظور`);
  }
}

console.log(JSON.stringify({ valid: errors.length === 0, mode: mode || null, inspected_assets: inspected, errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
