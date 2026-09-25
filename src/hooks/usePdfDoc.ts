import { useEffect, useState } from "react";
import { getPdfDocument, pdfjsLib } from "../lib/pdfjs";

/** One PDF.js document for the current bytes. Shared by viewer + thumbs. */
export function usePdfDoc(bytes: Uint8Array | null) {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bytes) {
      setPdf(null);
      return;
    }
    let dead = false;
    let doc: pdfjsLib.PDFDocumentProxy | null = null;
    setLoading(true);
    void getPdfDocument(bytes)
      .then((d) => {
        if (dead) {
          void d.destroy();
          return;
        }
        doc = d;
        setPdf(d);
        setLoading(false);
      })
      .catch(() => {
        if (!dead) setLoading(false);
      });
    return () => {
      dead = true;
      setPdf(null);
      void doc?.destroy();
    };
  }, [bytes]);

  return { pdf, loading };
}
