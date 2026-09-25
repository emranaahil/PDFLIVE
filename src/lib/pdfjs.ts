import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { FontId } from "./fonts";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export { pdfjsLib };

/** Must match on-screen render scale so text hit-boxes line up with the canvas. */
export const RENDER_SCALE = 1.35;

export type PdfTextLine = {
  id: string;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: FontId;
  bold: boolean;
  italic: boolean;
};

function mapPdfFont(fontName: string, cssFamily?: string): {
  fontFamily: FontId;
  bold: boolean;
  italic: boolean;
} {
  const n = `${fontName} ${cssFamily || ""}`.toLowerCase();
  const bold = /bold|black|heavy|semibold/i.test(n);
  const italic = /italic|oblique/i.test(n);
  const fontFamily: FontId = /times|georgia|garamond|serif/i.test(n)
    ? "times"
    : /courier|mono|console|typewriter/i.test(n)
      ? "courier"
      : "helvetica";
  return { fontFamily, bold, italic };
}

export async function getPdfDocument(
  data: Uint8Array,
  password?: string
): Promise<pdfjsLib.PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument({
    data: data.slice(),
    password: password || undefined,
    useSystemFonts: true,
  });
  return loadingTask.promise;
}

export function isPasswordError(err: unknown): boolean {
  const name = (err as { name?: string })?.name;
  const code = (err as { code?: number })?.code;
  return (
    name === "PasswordException" ||
    code === pdfjsLib.PasswordResponses.NEED_PASSWORD ||
    code === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD
  );
}

export async function renderPageToCanvas(
  page: pdfjsLib.PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale = RENDER_SCALE,
  pixelRatio = 1
): Promise<{ width: number; height: number }> {
  const ratio = Math.max(1, pixelRatio);
  const viewport = page.getViewport({ scale: scale * ratio });
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D unavailable");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const logicalW = viewport.width / ratio;
  const logicalH = viewport.height / ratio;
  canvas.style.width = `${logicalW}px`;
  canvas.style.height = `${logicalH}px`;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { width: logicalW, height: logicalH };
}

/**
 * Real PDF text runs, grouped into lines, in canvas pixel space.
 * Clicking a line lets the user change existing wording in place.
 */
export async function extractPageTextLines(
  data: Uint8Array,
  pageNumber: number,
  scale = RENDER_SCALE
): Promise<PdfTextLine[]> {
  const doc = await getPdfDocument(data);
  try {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const content = await page.getTextContent();
    type Run = PdfTextLine;
    const runs: Run[] = [];
    let i = 0;
    for (const item of content.items) {
      if (!("str" in item) || typeof item.str !== "string") continue;
      const str = item.str;
      if (!str.replace(/\s/g, "").length) continue;
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const fontHeight = Math.hypot(tx[2], tx[3]) || 12;
      const style = content.styles[item.fontName];
      const ascent = style?.ascent ? fontHeight * style.ascent : fontHeight * 0.8;
      const left = tx[4];
      const top = tx[5] - ascent;
      const hScale = Math.hypot(tx[0], tx[1]) || fontHeight;
      const width = Math.max(
        (item.width || 0) * (hScale / (fontHeight || 1)),
        str.length * fontHeight * 0.35
      );
      const mapped = mapPdfFont(item.fontName || "", style?.fontFamily);
      runs.push({
        id: `t${pageNumber}-${i++}`,
        str,
        x: left,
        y: top,
        width,
        height: Math.max(fontHeight, 8),
        fontSize: Math.max(7, Math.round(fontHeight * 10) / 10),
        ...mapped,
      });
    }
    page.cleanup();
    return groupIntoLines(runs);
  } finally {
    await doc.destroy();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Full document HTML for the rich-text editor (reading order). */
export async function extractDocumentHtml(
  data: Uint8Array
): Promise<{ html: string; hasText: boolean; pages: number }> {
  const pdf = await getPdfDocument(data);
  const pages = pdf.numPages;
  const chunks: string[] = [];
  let chars = 0;
  try {
    for (let n = 1; n <= pages; n++) {
      const lines = await extractLinesOnOpenDoc(pdf, n);
      chunks.push(`<h2>Page ${n}</h2>`);
      if (!lines.length) {
        chunks.push(`<p></p>`);
        continue;
      }
      for (const l of lines) {
        chars += l.str.length;
        const fam = l.fontFamily === "times"
          ? "Times New Roman, Times, serif"
          : l.fontFamily === "courier"
            ? "Courier New, Courier, monospace"
            : "Helvetica, Arial, sans-serif";
        const size = Math.min(18, Math.max(10, Math.round(l.fontSize)));
        let body = escapeHtml(l.str);
        if (l.bold) body = `<strong>${body}</strong>`;
        if (l.italic) body = `<em>${body}</em>`;
        chunks.push(
          `<p style="font-family:${fam};font-size:${size}px">${body}</p>`
        );
      }
    }
  } finally {
    await pdf.destroy();
  }
  return {
    html: chunks.join("") || "<p></p>",
    hasText: chars > 0,
    pages,
  };
}

async function extractLinesOnOpenDoc(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale = RENDER_SCALE
): Promise<PdfTextLine[]> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const content = await page.getTextContent();
  const runs: PdfTextLine[] = [];
  let i = 0;
  for (const item of content.items) {
    if (!("str" in item) || typeof item.str !== "string") continue;
    const str = item.str;
    if (!str.replace(/\s/g, "").length) continue;
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.hypot(tx[2], tx[3]) || 12;
    const style = content.styles[item.fontName];
    const ascent = style?.ascent ? fontHeight * style.ascent : fontHeight * 0.8;
    const left = tx[4];
    const top = tx[5] - ascent;
    const hScale = Math.hypot(tx[0], tx[1]) || fontHeight;
    const width = Math.max(
      (item.width || 0) * (hScale / (fontHeight || 1)),
      str.length * fontHeight * 0.35
    );
    const mapped = mapPdfFont(item.fontName || "", style?.fontFamily);
    runs.push({
      id: `t${pageNumber}-${i++}`,
      str,
      x: left,
      y: top,
      width,
      height: Math.max(fontHeight, 8),
      fontSize: Math.max(7, Math.round(fontHeight * 10) / 10),
      ...mapped,
    });
  }
  page.cleanup();
  return groupIntoLines(runs);
}

function groupIntoLines(runs: PdfTextLine[]): PdfTextLine[] {
  if (!runs.length) return [];
  const sorted = [...runs].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: PdfTextLine[][] = [];
  for (const run of sorted) {
    const last = lines[lines.length - 1];
    const sample = last?.[0];
    if (
      sample &&
      Math.abs(run.y - sample.y) < Math.max(sample.height, run.height) * 0.45
    ) {
      last.push(run);
    } else {
      lines.push([run]);
    }
  }
  return lines.map((group, gi) => {
    group.sort((a, b) => a.x - b.x);
    const first = group[0];
    const x = first.x;
    const y = Math.min(...group.map((g) => g.y));
    const right = Math.max(...group.map((g) => g.x + g.width));
    const bottom = Math.max(...group.map((g) => g.y + g.height));
    const parts: string[] = [];
    group.forEach((g, idx) => {
      if (idx > 0) {
        const prev = group[idx - 1];
        const gap = g.x - (prev.x + prev.width);
        parts.push(gap > prev.fontSize * 0.35 ? " " : "");
      }
      parts.push(g.str);
    });
    return {
      id: `line-${gi}-${Math.round(x)}-${Math.round(y)}`,
      str: parts.join("").replace(/\s+/g, " ").trim(),
      x,
      y,
      width: Math.max(8, right - x),
      height: Math.max(8, bottom - y),
      fontSize: first.fontSize,
      fontFamily: first.fontFamily,
      bold: group.some((g) => g.bold),
      italic: group.some((g) => g.italic),
    };
  }).filter((l) => l.str.length > 0);
}
