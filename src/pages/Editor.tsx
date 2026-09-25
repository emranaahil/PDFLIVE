import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileDrop } from "../components/FileDrop";
import { PdfCanvas } from "../components/PdfCanvas";
import { TextOverlay, type OverlayBox } from "../components/TextOverlay";
import { SignaturePad } from "../components/SignaturePad";
import { usePdf } from "../store/PdfContext";
import { bakeTextOverlays } from "../lib/pdfOps";
import { downloadBytes, stem } from "../lib/download";

export function Editor() {
  const { t } = useTranslation();
  const { bytes, name, page, pageCount, setPage, setBytes, showToast, busy } =
    usePdf();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [boxes, setBoxes] = useState<OverlayBox[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [stamps, setStamps] = useState<{ id: string; x: number; y: number; src: string }[]>(
    []
  );

  const addText = () => {
    const id = crypto.randomUUID();
    setBoxes((b) => [
      ...b,
      { id, x: 24, y: 24, width: 220, html: "<p></p>", fontSize: 16 },
    ]);
    setActiveId(id);
  };

  const bake = async () => {
    if (!bytes) return;
    try {
      const next = await bakeTextOverlays(
        bytes,
        boxes.map((b) => ({
          pageIndex: page - 1,
          x: b.x,
          y: b.y,
          width: b.width,
          html: b.html,
          fontSize: b.fontSize,
          pageWidth: size.width || 1,
          pageHeight: size.height || 1,
        }))
      );
      await setBytes(next, name);
      setBoxes([]);
      showToast("ok", t("ready"));
      downloadBytes(next, `${stem(name)}-edited.pdf`);
    } catch {
      showToast("error", t("error"));
    }
  };

  const onRendered = useCallback((s: { width: number; height: number }) => {
    setSize(s);
  }, []);

  if (!bytes) {
    return (
      <div className="mx-auto max-w-xl">
        <FileDrop />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          {t("prev")}
        </button>
        <span className="text-sm text-slate-400">
          {t("page", { n: page, total: pageCount })}
        </span>
        <button
          type="button"
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm"
          disabled={page >= pageCount}
          onClick={() => setPage(page + 1)}
        >
          {t("next")}
        </button>
        <button
          type="button"
          className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium"
          onClick={addText}
        >
          {t("add_text")}
        </button>
        <button
          type="button"
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm"
          onClick={() => setSignOpen(true)}
        >
          {t("sign")}
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold"
          onClick={() => void bake()}
        >
          {t("done")} / {t("download")}
        </button>
      </div>

      <div className="relative overflow-auto rounded-xl bg-slate-900 p-2">
        <PdfCanvas bytes={bytes} page={page} onRendered={onRendered} />
        {boxes.map((b) => (
          <TextOverlay
            key={b.id}
            box={b}
            active={activeId === b.id}
            onActivate={() => setActiveId(b.id)}
            onChange={(patch) =>
              setBoxes((all) => all.map((x) => (x.id === b.id ? { ...x, ...patch } : x)))
            }
            onDone={() => setActiveId(null)}
          />
        ))}
        {stamps.map((s) => (
          <img
            key={s.id}
            src={s.src}
            alt=""
            className="absolute w-40 cursor-move"
            style={{ left: s.x, top: s.y }}
            draggable={false}
          />
        ))}
      </div>

      {signOpen && (
        <SignaturePad
          onClose={() => setSignOpen(false)}
          onApply={(src) =>
            setStamps((s) => [...s, { id: crypto.randomUUID(), x: 40, y: 40, src }])
          }
        />
      )}
    </div>
  );
}
