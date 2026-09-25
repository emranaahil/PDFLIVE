import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { pdfjsLib, renderPageToCanvas } from "../lib/pdfjs";
import { clearCanvas } from "../lib/memory";

const THUMB_SCALE = 0.18;
const WINDOW = 10;

type Props = {
  pdf: pdfjsLib.PDFDocumentProxy | null;
  page: number;
  pageCount: number;
  onPage: (n: number) => void;
};

export function PageThumbs({ pdf, page, pageCount, onPage }: Props) {
  const { t } = useTranslation();
  const cache = useRef(new Map<number, string>());
  const start = Math.max(1, page - WINDOW);
  const end = Math.min(pageCount, page + WINDOW);

  useEffect(() => {
    return () => {
      cache.current.forEach((url) => URL.revokeObjectURL(url));
      cache.current.clear();
    };
  }, [pdf]);

  return (
    <aside className="ui-glass flex h-full w-[7.25rem] shrink-0 flex-col rounded-none border-y-0 lg:border-l-0">
      <p className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-text-muted">
        {t("thumbs")}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {start > 1 && (
          <p className="py-2 text-center text-[10px] text-text-muted">1–{start - 1}</p>
        )}
        {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((n) => (
          <Thumb
            key={n}
            n={n}
            active={n === page}
            pdf={pdf}
            cache={cache.current}
            onPage={onPage}
          />
        ))}
        {end < pageCount && (
          <p className="py-2 text-center text-[10px] text-text-muted">{end + 1}–{pageCount}</p>
        )}
      </div>
    </aside>
  );
}

function Thumb({
  n,
  active,
  pdf,
  cache,
  onPage,
}: {
  n: number;
  active: boolean;
  pdf: pdfjsLib.PDFDocumentProxy | null;
  cache: Map<number, string>;
  onPage: (n: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pdf) return;
    let dead = false;
    const cached = cache.get(n);
    if (cached) {
      const img = new Image();
      img.onload = () => {
        if (dead || !canvasRef.current) return;
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d")?.drawImage(img, 0, 0);
      };
      img.src = cached;
      return () => {
        dead = true;
      };
    }
    (async () => {
      const page = await pdf.getPage(n);
      if (dead) {
        page.cleanup();
        return;
      }
      await renderPageToCanvas(page, canvas, THUMB_SCALE);
      page.cleanup();
      if (dead) return;
      canvas.toBlob(
        (blob) => {
          if (!blob || dead) return;
          if (cache.size > 24) {
            const first = cache.keys().next().value;
            if (typeof first === "number") {
              const old = cache.get(first);
              if (old) URL.revokeObjectURL(old);
              cache.delete(first);
            }
          }
          cache.set(n, URL.createObjectURL(blob));
        },
        "image/jpeg",
        0.55
      );
    })().catch(() => undefined);
    return () => {
      dead = true;
      clearCanvas(canvas);
    };
  }, [pdf, n, cache]);

  return (
    <button
      type="button"
      onClick={() => onPage(n)}
      aria-label={t("page", { n, total: n })}
      aria-current={active ? "page" : undefined}
      className={`mb-2 w-full overflow-hidden rounded-md border ${
        active ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-text-muted"
      }`}
    >
      <canvas ref={canvasRef} className="block w-full bg-pdf-background" />
      <span className="block py-0.5 text-center text-[10px] text-text-muted">{n}</span>
    </button>
  );
}
