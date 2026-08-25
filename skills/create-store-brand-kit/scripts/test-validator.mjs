import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { spawnSync } from "node:child_process";

const validator = path.resolve("skills/create-store-brand-kit/scripts/validate-brand-kit.mjs");
function crc32(data) { let crc = 0xffffffff; for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, payload) { const out = Buffer.alloc(payload.length + 12); out.writeUInt32BE(payload.length, 0); out.write(type, 4); payload.copy(out, 8); out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), payload])), payload.length + 8); return out; }
function pngWithRaw(file, width, height, raw, colorType = 6) { const hdr = Buffer.alloc(13); hdr.writeUInt32BE(width); hdr.writeUInt32BE(height, 4); hdr[8] = 8; hdr[9] = colorType; fs.writeFileSync(file, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", hdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))])); }
function png(file, width, height, opaque = false) { const raw = Buffer.alloc((width * 4 + 1) * height); for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) { const p = y * (width * 4 + 1) + 1 + x * 4; raw[p] = 90; raw[p + 1] = 33; raw[p + 2] = 52; raw[p + 3] = opaque || (x > 1 && x < width - 2 && y > 1 && y < height - 2) ? 255 : 0; } pngWithRaw(file, width, height, raw); }
function checkerboard(file, width, height, rgba) { const bpp = rgba ? 4 : 3; const raw = Buffer.alloc((width * bpp + 1) * height); for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) { const p = y * (width * bpp + 1) + 1 + x * bpp; const v = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 190 : 238; raw[p] = v; raw[p + 1] = v; raw[p + 2] = v; if (rgba) raw[p + 3] = 255; } pngWithRaw(file, width, height, raw, rgba ? 6 : 2); }
function pngGrayAlpha(file, width, height) { const raw = Buffer.alloc((width * 2 + 1) * height); for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) { const p = y * (width * 2 + 1) + 1 + x * 2; raw[p] = 90; raw[p + 1] = x > 1 && x < width - 2 && y > 1 && y < height - 2 ? 255 : 0; } pngWithRaw(file, width, height, raw, 4); }
function pngRgbWithTrns(file, width, height) { const raw = Buffer.alloc((width * 3 + 1) * height); const hdr = Buffer.alloc(13); hdr.writeUInt32BE(width); hdr.writeUInt32BE(height, 4); hdr[8] = 8; hdr[9] = 2; fs.writeFileSync(file, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", hdr), chunk("tRNS", Buffer.alloc(6)), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))])); }
function pngWithExactTransparentPixels(file, width, height, count, opaqueCorner = null) { const corners = [[0,0],[width - 1,0],[0,height - 1],[width - 1,height - 1]]; const transparent = new Set(); for (const [i,[x,y]] of corners.entries()) if (i !== opaqueCorner && transparent.size < count) transparent.add(`${x},${y}`); for (let y = 0; transparent.size < count && y < height; y += 1) for (let x = 0; transparent.size < count && x < width; x += 1) if (!(x === corners[opaqueCorner]?.[0] && y === corners[opaqueCorner]?.[1])) transparent.add(`${x},${y}`); const raw = Buffer.alloc((width * 4 + 1) * height); for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) { const p = y * (width * 4 + 1) + 1 + x * 4; raw[p] = 90; raw[p + 1] = 33; raw[p + 2] = 52; raw[p + 3] = transparent.has(`${x},${y}`) ? 0 : 255; } pngWithRaw(file, width, height, raw); }
function fullyTransparent(file, width, height) { pngWithRaw(file, width, height, Buffer.alloc((width * 4 + 1) * height)); }
function padPng(file, bytes) { const data = fs.readFileSync(file); fs.writeFileSync(file, Buffer.concat([data.subarray(0, -12), chunk("abCD", Buffer.alloc(bytes)), data.subarray(-12)])); }
function svg(width, height) { return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><path d="M2 2h8v8H2z"/></svg>`; }
function validPair(d) { const logo = path.join(d, "logo-ar.png"); const icon = path.join(d, "store-icon.png"); png(logo, 1024, 256); png(icon, 32, 32); return [logo, icon]; }

const cases = [
  ["valid final pair", true, [], (d) => ["#5A2134", "#8C4517", ...validPair(d)]],
  ["catalog is not an input", true, [], (d) => { fs.writeFileSync(path.join(d, "brand-catalog.png"), "reference only"); return ["#5A2134", "#8C4517", ...validPair(d)]; }],
  ["legacy five-argument contract", false, [], (d) => { const [logo, icon] = validPair(d); return ["#5A2134", "#8C4517", path.join(d, "brand-catalog.png"), logo, icon]; }, "الاستخدام:"],
  ["missing icon", false, [], (d) => { const [logo] = validPair(d); return ["#5A2134", "#8C4517", logo]; }, "الاستخدام:"],
  ["SVG pair", false, [], (d) => { const logo = path.join(d, "logo-ar.svg"); const icon = path.join(d, "store-icon.svg"); fs.writeFileSync(logo, svg(1024, 256)); fs.writeFileSync(icon, svg(32, 32)); return ["#5A2134", "#8C4517", logo, icon]; }, "يلزم ملفا PNG فقط"],
  ["mixed format", false, [], (d) => { const [logo] = validPair(d); const icon = path.join(d, "store-icon.svg"); fs.writeFileSync(icon, svg(32, 32)); return ["#5A2134", "#8C4517", logo, icon]; }, "يلزم ملفا PNG فقط"],
  ["fallback flag", false, ["--claude-fallback"], (d) => ["#5A2134", "#8C4517", ...validPair(d)], "لا توجد أعلام fallback"],
  ["wrong logo dimensions", false, [], (d) => { const [logo, icon] = validPair(d); png(logo, 1000, 256); return ["#5A2134", "#8C4517", logo, icon]; }, "المقاس 1000x256"],
  ["wrong icon dimensions", false, [], (d) => { const [logo, icon] = validPair(d); png(icon, 64, 64); return ["#5A2134", "#8C4517", logo, icon]; }, "المقاس 64x64"],
  ["opaque logo", false, [], (d) => { const [logo, icon] = validPair(d); png(logo, 1024, 256, true); return ["#5A2134", "#8C4517", logo, icon]; }, "خلفية شفافة فعلية"],
  ["opaque icon", false, [], (d) => { const [logo, icon] = validPair(d); png(icon, 32, 32, true); return ["#5A2134", "#8C4517", logo, icon]; }, "خلفية شفافة فعلية"],
  ["RGB checkerboard icon", false, [], (d) => { const [logo, icon] = validPair(d); checkerboard(icon, 32, 32, false); return ["#5A2134", "#8C4517", logo, icon]; }, "RGB أو خلفية شطرنجية مرسومة"],
  ["RGBA opaque checkerboard icon", false, [], (d) => { const [logo, icon] = validPair(d); checkerboard(icon, 32, 32, true); return ["#5A2134", "#8C4517", logo, icon]; }, "خلفية شفافة فعلية"],
  ["RGB logo", false, [], (d) => { const [logo, icon] = validPair(d); checkerboard(logo, 1024, 256, false); return ["#5A2134", "#8C4517", logo, icon]; }, "RGB أو خلفية شطرنجية مرسومة"],
  ["tRNS", false, [], (d) => { const [logo, icon] = validPair(d); pngRgbWithTrns(icon, 32, 32); return ["#5A2134", "#8C4517", logo, icon]; }, "tRNS غير مدعوم"],
  ["below one percent", false, [], (d) => { const [logo, icon] = validPair(d); pngWithExactTransparentPixels(logo, 1024, 256, 2621); return ["#5A2134", "#8C4517", logo, icon]; }, "1% على الأقل"],
  ["opaque corner", false, [], (d) => { const [logo, icon] = validPair(d); pngWithExactTransparentPixels(logo, 1024, 256, 2622, 0); return ["#5A2134", "#8C4517", logo, icon]; }, "الأركان الأربعة شفافة"],
  ["exactly one percent", true, [], (d) => { const [logo, icon] = validPair(d); pngWithExactTransparentPixels(logo, 1024, 256, 2622); return ["#5A2134", "#8C4517", logo, icon]; }],
  ["grayscale alpha", false, [], (d) => { const [logo, icon] = validPair(d); pngGrayAlpha(logo, 1024, 256); return ["#5A2134", "#8C4517", logo, icon]; }, "يلزم PNG RGBA"],
  ["oversized logo", false, [], (d) => { const [logo, icon] = validPair(d); padPng(logo, 2_000_000); return ["#5A2134", "#8C4517", logo, icon]; }, "يتجاوز 1950000"],
  ["oversized icon", false, [], (d) => { const [logo, icon] = validPair(d); padPng(icon, 2_000_000); return ["#5A2134", "#8C4517", logo, icon]; }, "يتجاوز 1950000"],
  ["fully transparent logo", false, [], (d) => { const [logo, icon] = validPair(d); fullyTransparent(logo, 1024, 256); return ["#5A2134", "#8C4517", logo, icon]; }, "بكسلات مرئية"],
  ["fully transparent icon", false, [], (d) => { const [logo, icon] = validPair(d); fullyTransparent(icon, 32, 32); return ["#5A2134", "#8C4517", logo, icon]; }, "بكسلات مرئية"],
  ["wrong filename", false, [], (d) => { const logo = path.join(d, "wrong.png"); const icon = path.join(d, "store-icon.png"); png(logo, 1024, 256); png(icon, 32, 32); return ["#5A2134", "#8C4517", logo, icon]; }, "الأسماء المطلوبة"],
  ["different directories", false, [], (d) => { const logo = path.join(d, "logo-ar.png"); const nested = path.join(d, "nested"); fs.mkdirSync(nested); const icon = path.join(nested, "store-icon.png"); png(logo, 1024, 256); png(icon, 32, 32); return ["#5A2134", "#8C4517", logo, icon]; }, "مجلد تسليم واحد"],
  ["duplicate colors", false, [], (d) => ["#5A2134", "#5a2134", ...validPair(d)], "يجب أن يكونا مختلفين"],
  ["invalid primary", false, [], (d) => ["brown", "#8C4517", ...validPair(d)], "Primary يجب أن يكون HEX"],
  ["legacy artifact", false, [], (d) => { fs.writeFileSync(path.join(d, "brand-kit.json"), "{}"); return ["#5A2134", "#8C4517", ...validPair(d)]; }, "أثر قديم محظور"],
  ["unrelated artifact", true, [], (d) => { fs.writeFileSync(path.join(d, "notes.txt"), "ok"); return ["#5A2134", "#8C4517", ...validPair(d)]; }],
  ["missing IEND", false, [], (d) => { const [logo, icon] = validPair(d); fs.truncateSync(logo, fs.statSync(logo).size - 12); return ["#5A2134", "#8C4517", logo, icon]; }, "يفتقد IEND"],
  ["corrupt CRC", false, [], (d) => { const [logo, icon] = validPair(d); const data = fs.readFileSync(logo); data[data.length - 1] ^= 0xff; fs.writeFileSync(logo, data); return ["#5A2134", "#8C4517", logo, icon]; }, "CRC غير صالح"],
  ["decompression overrun", false, [], (d) => { const [logo, icon] = validPair(d); pngWithRaw(logo, 1024, 256, Buffer.alloc((1024 * 4 + 1) * 256 + 1)); return ["#5A2134", "#8C4517", logo, icon]; }],
  ["critical chunk", false, [], (d) => { const [logo, icon] = validPair(d); const data = fs.readFileSync(logo); fs.writeFileSync(logo, Buffer.concat([data.subarray(0, 33), chunk("AbCD", Buffer.alloc(0)), data.subarray(33)])); return ["#5A2134", "#8C4517", logo, icon]; }, "chunk حرج غير مدعوم"],
];

let failures = 0;
for (const [name, expected, flags, create, expectedError] of cases) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brand-contract-")); const result = spawnSync(process.execPath, [validator, ...flags, ...create(dir)], { encoding: "utf8" }); const output = `${result.stdout}${result.stderr}`; const actual = result.status === 0; fs.rmSync(dir, { recursive: true, force: true }); if (actual !== expected || (expectedError && !output.includes(expectedError))) { failures += 1; console.error(`FAIL ${name}\n${output}`); } else console.log(`PASS ${name}`); }
if (failures) process.exit(1);
console.log(`PASS ${cases.length}/${cases.length}`);
