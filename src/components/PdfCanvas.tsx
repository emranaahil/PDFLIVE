import { memo, useEffect, useRef, type ReactNode } from "react";
import { clearCanvas } from "../lib/memory";
import {
  getPdfDocument,
  renderPageToCanvas,
  RENDER_SCALE,
  pdfjsLib,
} from "../lib/pdfjs";
import type { ScanBox } from "../lib/pdfOps";
import { scanPrintLegibility } from "../lib/pdfOps";

type Props = {
  bytes?: Uint8Array | null;
  pdf?: pdfjsLib.PDFDocumentProxy | null;
  page: number;
  onRendered?: (size: { width: number; height: number }) => void;
  scan?: boolean;
  scanBoxes?: ScanBox[];
  onScanBoxes?: (boxes: ScanBox[]) => void;
  children?: ReactNode;
};

export const PdfCanvas = memo(function PdfCanvas({
  bytes,
  pdf,
  page,
  onRendered,
  scan,
  scanBoxes,
  onScanBoxes,
  children,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    (async () => {
      let owned: pdfjsLib.PDFDocumentProxy | null = null;
      const shared = pdf !== undefined;
      const doc = shared ? pdf : bytes ? (owned = await getPdfDocument(bytes)) : null;
      if (!doc || cancelled) {
        if (owned) await owned.destroy();
        return;
      }
      try {
        const pdfPage = await doc.getPage(page);
        const pixelRatio = scan ? 1 : Math.min(window.devicePixelRatio || 1, 2);
        const size = await renderPageToCanvas(pdfPage, canvas, RENDER_SCALE, pixelRatio);
        pdfPage.cleanup();
        if (cancelled) return;
        onRendered?.(size);
        if (scan) onScanBoxes?.(scanPrintLegibility(canvas));
        else onScanBoxes?.([]);
      } finally {
        if (owned) await owned.destroy();
      }
    })().catch(() => undefined);

    return () => {
      cancelled = true;
      clearCanvas(canvasRef.current);
    };
  }, [pdf, bytes, page, scan, onRendered, onScanBoxes]);

  return (
    <div className="relative inline-block bg-pdf-background shadow-[0_12px_40px_rgb(0_0_0_/0.28)]">
      <canvas ref={canvasRef} className="block bg-pdf-background" />
      {scanBoxes?.map((b, i) => (
        <div
          key={i}
          className="scan-box"
          style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
        />
      ))}
      {children}
    </div>
  );
});
