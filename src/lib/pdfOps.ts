import { PDFDocument, degrees, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { embedStandardFont, type FontId } from "./fonts";
import { getPdfDocument, renderPageToCanvas } from "./pdfjs";
import { clearCanvas } from "./memory";

export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes);
}

export async function mergePdfs(buffers: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const buf of buffers) {
    const src = await PDFDocument.load(buf);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

export async function extractPages(
  bytes: Uint8Array,
  indices: number[]
): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  copied.forEach((p) => out.addPage(p));
  return out.save();
}

export async function rotatePages(
  bytes: Uint8Array,
  angle: 90 | 180 | 270,
  indices?: number[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const targets = indices ?? doc.getPageIndices();
  targets.forEach((i) => {
    const page = doc.getPage(i);
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angle) % 360));
  });
  return doc.save();
}

export async function deletePages(
  bytes: Uint8Array,
  remove: number[]
): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes);
  const keep = src.getPageIndices().filter((i) => !remove.includes(i));
  return extractPages(bytes, keep);
}

function htmlToPlain(html: string): string {
  const d = document.createElement("div");
  d.innerHTML = html;
  return (d.innerText || d.textContent || "").trim();
}

/** Standard PDF fonts only store WinAnsi. Drop anything else so Apply does not fail. */
function keepEncodable(font: PDFFont, text: string): string {
  let out = "";
  for (const ch of text) {
    if (ch === "\n" || ch === "\r" || ch === "\t") {
      out += " ";
      continue;
    }
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += " ";
    }
  }
  return out.replace(/ {2,}/g, " ").trim();
}

export type BakeOverlay = {
  kind: "text" | "cover" | "replace" | "sign";
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height?: number;
  html?: string;
  src?: string;
  fontSize: number;
  fontFamily: FontId;
  bold?: boolean;
  italic?: boolean;
  pageWidth: number;
  pageHeight: number;
};

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.split(",")[1] || "";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Bake cover boxes + rich text into PDF (standard fonts, no server). */
export async function bakeTextOverlays(
  bytes: Uint8Array,
  overlays: BakeOverlay[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  doc.registerFontkit(fontkit);
  for (const o of overlays) {
    const page = doc.getPage(o.pageIndex);
    const { width: pw, height: ph } = page.getSize();
    const scaleX = pw / o.pageWidth;
    const scaleY = ph / o.pageHeight;
    const pdfX = o.x * scaleX;
    const boxH = (o.height ?? o.fontSize * 1.4) * scaleY;
    const pdfY = ph - o.y * scaleY - boxH;
    const pdfW = o.width * scaleX;

    if (o.kind === "cover" || o.kind === "replace") {
      const pad = 1.25 * scaleY;
      page.drawRectangle({
        x: Math.max(0, pdfX - pad),
        y: Math.max(0, pdfY - pad),
        width: Math.max(4, pdfW + pad * 2),
        height: Math.max(4, boxH + pad * 2),
        color: rgb(1, 1, 1),
      });
      if (o.kind === "cover") continue;
    }

    if (o.kind === "sign" && o.src) {
      const raw = dataUrlToBytes(o.src);
      const img = o.src.includes("image/jpeg")
        ? await doc.embedJpg(raw)
        : await doc.embedPng(raw);
      page.drawImage(img, {
        x: Math.max(0, pdfX),
        y: Math.max(0, pdfY),
        width: Math.max(8, pdfW),
        height: Math.max(8, boxH),
      });
      continue;
    }

    const raw = htmlToPlain(o.html || "");
    if (!raw) continue;
    const html = o.html || "";
    const bold = o.bold || /<strong>|<b>/.test(html);
    const italic = o.italic || /<em>|<i>/.test(html);
    const font = await embedStandardFont(doc, o.fontFamily || "helvetica", bold, italic);
    const size = o.fontSize * scaleY;
    const text = keepEncodable(font, raw);
    if (!text) continue;
    page.drawText(text, {
      x: Math.max(0, pdfX + 2 * scaleX),
      y: Math.max(0, pdfY + 4 * scaleY),
      size,
      font,
      color: rgb(0.07, 0.09, 0.15),
      maxWidth: Math.max(10, pdfW - 4 * scaleX),
      lineHeight: size * 1.25,
    });
  }
  return doc.save();
}

async function forEachPageCanvas(
  bytes: Uint8Array,
  fn: (
    canvas: HTMLCanvasElement,
    index: number,
    pageCount: number
  ) => Promise<void> | void,
  scale = 1.5,
  signal?: AbortSignal
): Promise<void> {
  const pdf = await getPdfDocument(bytes);
  const canvas = document.createElement("canvas");
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      if (signal?.aborted) break;
      const page = await pdf.getPage(i);
      await renderPageToCanvas(page, canvas, scale);
      if (signal?.aborted) {
        page.cleanup();
        break;
      }
      await fn(canvas, i - 1, pdf.numPages);
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
    clearCanvas(canvas);
  }
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export async function toGrayscalePdf(bytes: Uint8Array): Promise<Uint8Array> {
  const pdf = await getPdfDocument(bytes);
  const out = await PDFDocument.create();
  const canvas = document.createElement("canvas");
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const longEdge = Math.max(base.width, base.height, 1);
      const scale = Math.min(2200 / longEdge, 2.5);
      await renderPageToCanvas(page, canvas, scale);
      page.cleanup();
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = img.data;
        for (let p = 0; p < d.length; p += 4) {
          const g = d[p] * 0.299 + d[p + 1] * 0.587 + d[p + 2] * 0.114;
          d[p] = d[p + 1] = d[p + 2] = g;
        }
        ctx.putImageData(img, 0, 0);
      }
      const jpeg = await canvasToJpegBytes(canvas, 0.95);
      const embedded = await out.embedJpg(jpeg);
      const pdfPage = out.addPage([base.width, base.height]);
      pdfPage.drawImage(embedded, {
        x: 0,
        y: 0,
        width: base.width,
        height: base.height,
      });
      clearCanvas(canvas);
      await yieldToUi();
    }
  } finally {
    await pdf.destroy();
    clearCanvas(canvas);
  }
  return out.save();
}

/**
 * Share of the uploaded file to aim for.
 * Light ≈ 72%, Balanced ≈ 50%, Maximum ≈ 25%. Always under 100%.
 */
export function compressionTargetRatio(amount: number): number {
  const t = Math.min(100, Math.max(0, amount)) / 100;
  if (t <= 0.5) return 0.72 + (0.5 - 0.72) * (t / 0.5);
  return 0.5 + (0.25 - 0.5) * ((t - 0.5) / 0.5);
}

async function rasterCompress(
  bytes: Uint8Array,
  maxEdge: number,
  jpeg: number
): Promise<Uint8Array> {
  const pdf = await getPdfDocument(bytes);
  const out = await PDFDocument.create();
  const canvas = document.createElement("canvas");
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const longEdge = Math.max(base.width, base.height, 1);
      const scale = Math.min(maxEdge / longEdge, 2);
      await renderPageToCanvas(page, canvas, scale);
      page.cleanup();
      const jpegBytes = await canvasToJpegBytes(canvas, jpeg);
      const embedded = await out.embedJpg(jpegBytes);
      const pdfPage = out.addPage([base.width, base.height]);
      pdfPage.drawImage(embedded, {
        x: 0,
        y: 0,
        width: base.width,
        height: base.height,
      });
      clearCanvas(canvas);
      await yieldToUi();
    }
  } finally {
    await pdf.destroy();
    clearCanvas(canvas);
  }
  return out.save();
}

function jpegForAmount(amount: number): number {
  const t = Math.min(100, Math.max(0, amount)) / 100;
  return Math.round((0.8 - t * 0.42) * 100) / 100;
}

/** Page 1 only. Used to pick a picture size that fits this file, from 100 KB to 10 MB. */
async function probeCompressBytes(
  bytes: Uint8Array,
  maxEdge: number,
  jpeg: number
): Promise<number> {
  const pdf = await getPdfDocument(bytes);
  const canvas = document.createElement("canvas");
  try {
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(maxEdge / Math.max(base.width, base.height, 1), 2);
    await renderPageToCanvas(page, canvas, scale);
    page.cleanup();
    const jpegBytes = await canvasToJpegBytes(canvas, jpeg);
    return jpegBytes.byteLength * pdf.numPages + 8192;
  } finally {
    await pdf.destroy();
    clearCanvas(canvas);
  }
}

export async function compressPdf(bytes: Uint8Array, amount = 50): Promise<Uint8Array> {
  const ratio = compressionTargetRatio(amount);
  const target = Math.max(1, Math.floor(bytes.byteLength * ratio));
  const jpeg = jpegForAmount(amount);
  let lo = 240;
  let hi = 1800;
  let edge = 800;
  for (let i = 0; i < 6; i++) {
    const mid = Math.round((lo + hi) / 2);
    const guess = await probeCompressBytes(bytes, mid, jpeg);
    edge = mid;
    if (guess > target) hi = mid - 30;
    else lo = mid + 30;
    if (hi - lo < 40) break;
  }
  let out = await rasterCompress(bytes, edge, jpeg);
  let best = out;
  let guard = 0;
  while (best.byteLength >= bytes.byteLength && edge > 200 && guard < 4) {
    edge = Math.max(200, Math.round(edge * 0.72));
    out = await rasterCompress(bytes, edge, Math.max(0.28, jpeg - 0.06));
    if (out.byteLength < best.byteLength) best = out;
    guard += 1;
  }
  if (best.byteLength > target * 1.12 && best.byteLength < bytes.byteLength && edge > 220) {
    const tighter = await rasterCompress(bytes, Math.round(edge * 0.85), Math.max(0.28, jpeg - 0.05));
    if (tighter.byteLength < best.byteLength && tighter.byteLength < bytes.byteLength) best = tighter;
  }
  return best.byteLength < bytes.byteLength ? best : out;
}

export type ScanBox = { x: number; y: number; w: number; h: number };

export type PrintScanSummary = {
  pageCounts: number[];
  total: number;
  pagesWithIssues: number;
  pageCount: number;
};

export type PrintScanProgress = {
  page: number;
  pageCount: number;
  foundOnPage: number;
  totalSoFar: number;
};

export type PrintFixProgress = {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  foundOnPage: number;
};

const PRINT_TILE = 12;
const PRINT_SCAN_SCALE = 1;
const KIND_OK = 0;
const KIND_PALE = 1;
const KIND_FILL = 2;
const KIND_PHOTO = 3;

type TileInspect = { kind: number; fill: number };

type TileScratch = {
  hueBins: Uint16Array;
  hueR: Uint32Array;
  hueG: Uint32Array;
  hueB: Uint32Array;
  out: TileInspect;
};

function makeTileScratch(): TileScratch {
  return {
    hueBins: new Uint16Array(6),
    hueR: new Uint32Array(6),
    hueG: new Uint32Array(6),
    hueB: new Uint32Array(6),
    out: { kind: 0, fill: 0 },
  };
}

function resetScratch(s: TileScratch): void {
  s.hueBins.fill(0);
  s.hueR.fill(0);
  s.hueG.fill(0);
  s.hueB.fill(0);
  s.out.kind = KIND_OK;
  s.out.fill = 0;
}

function pixelLuma(r: number, g: number, b: number): number {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

function pixelChroma(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/** Light grey / yellow / cyan on paper — not a saturated fill. */
function isPaleInkOnPaper(r: number, g: number, b: number, lum: number): boolean {
  if (lum >= 252) return false;
  const ch = pixelChroma(r, g, b);
  if (lum > 165 && ch < 52) return true;
  if (r > 190 && g > 170 && b < 170 && lum > 145) return true;
  if (g > 190 && b > 190 && r < 180 && lum > 145) return true;
  return false;
}

function hueBucket(r: number, g: number, b: number): number {
  const ch = pixelChroma(r, g, b);
  if (ch < 28) return -1;
  if (r > 170 && g > 170 && b < r - 30 && b < g - 30) return 3;
  if (g > 170 && b > 170 && r < g - 30 && r < b - 30) return 4;
  if (r > 170 && b > 170 && g < r - 30 && g < b - 30) return 5;
  const max = Math.max(r, g, b);
  if (max === r) return 0;
  if (max === g) return 1;
  return 2;
}

function inspectPrintTile(
  d: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  scratch: TileScratch
): TileInspect {
  resetScratch(scratch);
  const { hueBins, hueR, hueG, hueB, out } = scratch;
  const maxX = Math.min(x0 + PRINT_TILE, width);
  const maxY = Math.min(y0 + PRINT_TILE, height);
  let n = 0;
  let pale = 0;
  let dark = 0;
  let chromaHi = 0;
  let lumMin = 255;
  let lumMax = 0;

  for (let y = y0; y < maxY; y++) {
    for (let x = x0; x < maxX; x++) {
      const i = (y * width + x) * 4;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const lum = pixelLuma(r, g, b);
      n++;
      if (lum < lumMin) lumMin = lum;
      if (lum > lumMax) lumMax = lum;
      const ch = pixelChroma(r, g, b);
      if (isPaleInkOnPaper(r, g, b, lum)) pale++;
      else if (lum < 140 && ch < 48) dark++;
      if (ch > 28) {
        chromaHi++;
        const hb = hueBucket(r, g, b);
        if (hb >= 0) {
          hueBins[hb]++;
          hueR[hb] += r;
          hueG[hb] += g;
          hueB[hb] += b;
        }
      }
    }
  }

  if (!n) return out;

  let occupied = 0;
  let dom = 0;
  for (let h = 0; h < 6; h++) {
    if (hueBins[h] > hueBins[dom]) dom = h;
    if (hueBins[h] > n * 0.04) occupied++;
  }

  const chromaRatio = chromaHi / n;
  const spread = lumMax - lumMin;

  if (occupied >= 4 && chromaRatio > 0.28 && spread > 70) {
    out.kind = KIND_PHOTO;
    return out;
  }
  if (occupied >= 3 && chromaRatio > 0.42 && spread > 90 && pale < n * 0.12) {
    out.kind = KIND_PHOTO;
    return out;
  }

  if (
    chromaRatio > 0.22 &&
    chromaHi > 0 &&
    hueBins[dom] / chromaHi > 0.52 &&
    occupied < 4 &&
    spread > 32 &&
    hueBins[dom] > 8
  ) {
    const c = hueBins[dom];
    const fr = Math.round(hueR[dom] / c);
    const fg = Math.round(hueG[dom] / c);
    const fb = Math.round(hueB[dom] / c);
    out.fill = (fr << 16) | (fg << 8) | fb;
    out.kind = KIND_FILL;
    return out;
  }

  if (pale > 4 && dark < pale * 0.85) out.kind = KIND_PALE;
  return out;
}

function applyFillTile(
  d: Uint8ClampedArray,
  width: number,
  x0: number,
  y0: number,
  maxX: number,
  maxY: number,
  fill: number,
  glyph: Uint8Array
): void {
  const bw = maxX - x0;
  const bh = maxY - y0;
  const fr = (fill >> 16) & 255;
  const fg = (fill >> 8) & 255;
  const fb = fill & 255;
  const darkFill = pixelLuma(fr, fg, fb) < 170;
  glyph.fill(0);

  let gi = 0;
  for (let y = y0; y < maxY; y++) {
    for (let x = x0; x < maxX; x++) {
      const i = (y * width + x) * 4;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const lum = pixelLuma(r, g, b);
      const nearFill = Math.abs(r - fr) + Math.abs(g - fg) + Math.abs(b - fb) < 92;
      const paper = lum >= 248;
      if (nearFill) glyph[gi] = 2;
      else if (!paper) glyph[gi] = 1;
      gi++;
    }
  }

  if (darkFill) {
    for (let gy = 0; gy < bh; gy++) {
      for (let gx = 0; gx < bw; gx++) {
        const idx = gy * bw + gx;
        if (glyph[idx] !== 0) continue;
        const hit =
          (gy > 0 && glyph[idx - bw] === 2) ||
          (gy + 1 < bh && glyph[idx + bw] === 2) ||
          (gx > 0 && glyph[idx - 1] === 2) ||
          (gx + 1 < bw && glyph[idx + 1] === 2);
        if (hit) glyph[idx] = 1;
      }
    }
  }

  for (let gy = 0; gy < bh; gy++) {
    for (let gx = 0; gx < bw; gx++) {
      const idx = gy * bw + gx;
      if (glyph[idx] === 1) continue;
      const hit =
        (gy > 0 && glyph[idx - bw] === 1) ||
        (gy + 1 < bh && glyph[idx + bw] === 1) ||
        (gx > 0 && glyph[idx - 1] === 1) ||
        (gx + 1 < bw && glyph[idx + 1] === 1);
      if (hit) glyph[idx] = 3;
    }
  }

  gi = 0;
  for (let y = y0; y < maxY; y++) {
    for (let x = x0; x < maxX; x++) {
      const i = (y * width + x) * 4;
      const mark = glyph[gi++];
      if (mark === 1 || mark === 3) {
        d[i] = d[i + 1] = d[i + 2] = 24;
      } else {
        d[i] = d[i + 1] = d[i + 2] = 255;
      }
    }
  }
}

function paleInkTarget(lum: number): number {
  if (lum > 210) return 22;
  if (lum > 170) return 28;
  return 36;
}

/**
 * Darken pale ink on white. Flatten coloured fills to white + bold black glyphs.
 * Photos are left unchanged.
 */
export function boostPrintContrast(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  const scratch = makeTileScratch();
  const glyph = new Uint8Array(PRINT_TILE * PRINT_TILE);
  const tilesX = Math.ceil(width / PRINT_TILE);
  const tilesY = Math.ceil(height / PRINT_TILE);
  const kinds = new Uint8Array(tilesX * tilesY);
  const fills = new Uint32Array(tilesX * tilesY);

  let t = 0;
  for (let y = 0; y < height; y += PRINT_TILE) {
    for (let x = 0; x < width; x += PRINT_TILE) {
      const info = inspectPrintTile(d, width, height, x, y, scratch);
      kinds[t] = info.kind;
      fills[t] = info.fill;
      t++;
    }
  }

  t = 0;
  for (let y = 0; y < height; y += PRINT_TILE) {
    for (let x = 0; x < width; x += PRINT_TILE) {
      const kind = kinds[t];
      const maxX = Math.min(x + PRINT_TILE, width);
      const maxY = Math.min(y + PRINT_TILE, height);
      if (kind === KIND_PHOTO) {
        t++;
        continue;
      }
      if (kind === KIND_FILL) {
        applyFillTile(d, width, x, y, maxX, maxY, fills[t], glyph);
        t++;
        continue;
      }
      for (let py = y; py < maxY; py++) {
        for (let px = x; px < maxX; px++) {
          const i = (py * width + px) * 4;
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          const lum = pixelLuma(r, g, b);
          if (!isPaleInkOnPaper(r, g, b, lum)) continue;
          const next = paleInkTarget(lum);
          d[i] = d[i + 1] = d[i + 2] = next;
        }
      }
      t++;
    }
  }

  ctx.putImageData(img, 0, 0);
}

/** Rebuild PDF with print-safe contrast on every page. Preview only until Download. */
export async function fixPdfForPrint(
  bytes: Uint8Array,
  opts?: {
    pageCounts?: number[];
    onProgress?: (p: PrintFixProgress) => void;
  }
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const counts = opts?.pageCounts;
  const total = counts ? counts.reduce((a, b) => a + b, 0) : 0;
  let cursor = 0;
  await forEachPageCanvas(
    bytes,
    async (canvas, index, pageCount) => {
      const foundOnPage = counts ? counts[index] ?? 0 : 0;
      const from = foundOnPage > 0 ? cursor + 1 : 0;
      const to = cursor + foundOnPage;
      opts?.onProgress?.({
        page: index + 1,
        pageCount,
        from,
        to,
        total,
        foundOnPage,
      });
      boostPrintContrast(canvas);
      const png = await canvasToPngBytes(canvas);
      const embedded = await out.embedPng(png);
      const page = out.addPage([canvas.width, canvas.height]);
      page.drawImage(embedded, {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
      });
      cursor = to;
      await yieldToUi();
    },
    2
  );
  return out.save();
}

/** Low-scale pass: counts only, one reusable canvas, no box lists kept. */
export async function scanPrintDocument(
  bytes: Uint8Array,
  onPage?: (p: PrintScanProgress) => void,
  signal?: AbortSignal
): Promise<PrintScanSummary> {
  const pageCounts: number[] = [];
  let total = 0;
  let pagesWithIssues = 0;
  const scratch = makeTileScratch();
  await forEachPageCanvas(
    bytes,
    async (canvas, index, pageCount) => {
      const foundOnPage = countPrintIssueTiles(canvas, scratch);
      pageCounts.push(foundOnPage);
      total += foundOnPage;
      if (foundOnPage) pagesWithIssues++;
      onPage?.({
        page: index + 1,
        pageCount,
        foundOnPage,
        totalSoFar: total,
      });
      await yieldToUi();
    },
    PRINT_SCAN_SCALE,
    signal
  );
  return {
    pageCounts,
    total,
    pagesWithIssues,
    pageCount: pageCounts.length,
  };
}

function countPrintIssueTiles(
  canvas: HTMLCanvasElement,
  scratch: TileScratch
): number {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  let n = 0;
  for (let y = 0; y < height; y += PRINT_TILE) {
    for (let x = 0; x < width; x += PRINT_TILE) {
      const kind = inspectPrintTile(d, width, height, x, y, scratch).kind;
      if (kind === KIND_PALE || kind === KIND_FILL) n++;
    }
  }
  return n;
}

export function scanPrintLegibility(canvas: HTMLCanvasElement): ScanBox[] {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  const scratch = makeTileScratch();
  const boxes: ScanBox[] = [];
  for (let y = 0; y < height; y += PRINT_TILE) {
    for (let x = 0; x < width; x += PRINT_TILE) {
      const kind = inspectPrintTile(d, width, height, x, y, scratch).kind;
      if (kind !== KIND_PALE && kind !== KIND_FILL) continue;
      const maxX = Math.min(x + PRINT_TILE, width);
      const maxY = Math.min(y + PRINT_TILE, height);
      boxes.push({ x, y, w: maxX - x, h: maxY - y });
    }
  }
  return mergeNearby(boxes);
}

function mergeNearby(boxes: ScanBox[]): ScanBox[] {
  if (boxes.length < 2) return boxes;
  const out: ScanBox[] = [];
  for (const b of boxes) {
    const hit = out.find(
      (o) =>
        Math.abs(o.x - b.x) < 24 &&
        Math.abs(o.y - b.y) < 24
    );
    if (hit) {
      const r = Math.max(hit.x + hit.w, b.x + b.w);
      const btm = Math.max(hit.y + hit.h, b.y + b.h);
      hit.x = Math.min(hit.x, b.x);
      hit.y = Math.min(hit.y, b.y);
      hit.w = r - hit.x;
      hit.h = btm - hit.y;
    } else out.push({ ...b });
  }
  return out;
}

const A4 = { w: 595.28, h: 841.89 };

function wrapLine(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let cur = words[0];
  for (let i = 1; i < words.length; i++) {
    const trial = `${cur} ${words[i]}`;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) cur = trial;
    else {
      lines.push(cur);
      cur = words[i];
    }
  }
  lines.push(cur);
  return lines;
}

/** Rebuild a printable PDF from TipTap HTML (rich document editor). */
export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fonts = {
    helvetica: await embedStandardFont(doc, "helvetica", false, false),
    helveticaBold: await embedStandardFont(doc, "helvetica", true, false),
    times: await embedStandardFont(doc, "times", false, false),
    timesBold: await embedStandardFont(doc, "times", true, false),
    courier: await embedStandardFont(doc, "courier", false, false),
  };
  const margin = 50;
  const maxW = A4.w - margin * 2;
  let page = doc.addPage([A4.w, A4.h]);
  let y = A4.h - margin;

  const parsed = new DOMParser().parseFromString(
    `<div id="root">${html}</div>`,
    "text/html"
  );
  const root = parsed.getElementById("root");
  const blocks = root ? Array.from(root.children) : [];

  const ensureSpace = (need: number) => {
    if (y - need < margin) {
      page = doc.addPage([A4.w, A4.h]);
      y = A4.h - margin;
    }
  };

  for (const el of blocks) {
    const tag = el.tagName.toLowerCase();
    const style = (el as HTMLElement).style;
    const fam = (style.fontFamily || "").toLowerCase();
    const isTimes = fam.includes("times") || fam.includes("georgia");
    const isCourier = fam.includes("courier") || fam.includes("mono");
    const bold = /b|strong/i.test(el.innerHTML) || tag === "h1" || tag === "h2";
    const font = isCourier
      ? fonts.courier
      : isTimes
        ? bold
          ? fonts.timesBold
          : fonts.times
        : bold
          ? fonts.helveticaBold
          : fonts.helvetica;
    let size = 11;
    const px = parseFloat(style.fontSize || "");
    if (!Number.isNaN(px) && px > 0) size = Math.min(22, Math.max(8, px * 0.75));
    if (tag === "h1") size = 18;
    if (tag === "h2") size = 14;
    const text = keepEncodable(font, (el.textContent || "").replace(/\s+/g, " ").trim());
    if (!text) {
      y -= size * 0.6;
      continue;
    }
    const lines = wrapLine(text, font, size, maxW);
    const lineH = size * 1.35;
    for (const line of lines) {
      ensureSpace(lineH);
      page.drawText(line, {
        x: margin,
        y: y - size,
        size,
        font,
        color: rgb(0.07, 0.09, 0.15),
      });
      y -= lineH;
    }
    y -= 4;
  }

  return doc.save();
}

function canvasToJpegBytes(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error("JPEG export failed"));
          return;
        }
        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      "image/jpeg",
      quality
    );
  });
}

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error("PNG export failed"));
          return;
        }
        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      "image/png"
    );
  });
}
