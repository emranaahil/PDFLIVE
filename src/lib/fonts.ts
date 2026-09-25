import { StandardFonts, type PDFFont, type PDFDocument } from "pdf-lib";

export const FONT_CHOICES = [
  { id: "helvetica", label: "Helvetica / Arial", css: "Helvetica, Arial, sans-serif" },
  { id: "times", label: "Times / Georgia", css: "Times New Roman, Times, Georgia, serif" },
  { id: "courier", label: "Courier / Mono", css: "Courier New, Courier, monospace" },
] as const;

export type FontId = (typeof FONT_CHOICES)[number]["id"];

export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

export function cssForFont(id: FontId): string {
  return FONT_CHOICES.find((f) => f.id === id)?.css ?? FONT_CHOICES[0].css;
}

export async function embedStandardFont(
  doc: PDFDocument,
  id: FontId,
  bold: boolean,
  italic: boolean
): Promise<PDFFont> {
  const key =
    id === "times"
      ? italic && bold
        ? StandardFonts.TimesRomanBoldItalic
        : italic
          ? StandardFonts.TimesRomanItalic
          : bold
            ? StandardFonts.TimesRomanBold
            : StandardFonts.TimesRoman
      : id === "courier"
        ? italic && bold
          ? StandardFonts.CourierBoldOblique
          : italic
            ? StandardFonts.CourierOblique
            : bold
              ? StandardFonts.CourierBold
              : StandardFonts.Courier
        : italic && bold
          ? StandardFonts.HelveticaBoldOblique
          : italic
            ? StandardFonts.HelveticaOblique
            : bold
              ? StandardFonts.HelveticaBold
              : StandardFonts.Helvetica;
  return doc.embedFont(key);
}
