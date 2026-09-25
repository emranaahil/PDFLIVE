import { ChangeEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileDrop } from "../components/FileDrop";
import { PdfCanvas } from "../components/PdfCanvas";
import { usePdf } from "../store/PdfContext";
import {
  compressPdf,
  extractPages,
  mergePdfs,
  rotatePages,
  toGrayscalePdf,
  type ScanBox,
} from "../lib/pdfOps";
import { encryptPdf } from "../lib/qpdf";
import { downloadBytes, stem } from "../lib/download";
import { FileTooLargeError, assertPdfFileSize } from "../lib/fileGate";
import { PRINT_CHECK_ENABLED } from "../lib/constants";

export function Tools() {
  const { t } = useTranslation();
  const {
    bytes,
    name,
    page,
    pageCount,
    setPage,
    setBytes,
    showToast,
    extraMergeBytes,
    addMergeFile,
    busy,
  } = usePdf();
  const [scan, setScan] = useState(false);
  const [boxes, setBoxes] = useState<ScanBox[]>([]);
  const [lockPw, setLockPw] = useState("");
  const [lockOpen, setLockOpen] = useState(false);

  const run = async (fn: () => Promise<Uint8Array>, suffix: string) => {
    if (!bytes) return;
    try {
      const out = await fn();
      await setBytes(out, name);
      downloadBytes(out, `${stem(name)}-${suffix}.pdf`);
      showToast("ok", t("ready"));
    } catch {
      showToast("error", t("error"));
    }
  };

  const onMergeInput = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      assertPdfFileSize(f);
      await addMergeFile(f);
    } catch (err) {
      if (err instanceof FileTooLargeError) showToast("error", t("file_too_large"));
    }
  };

  if (!bytes) {
    return (
      <div className="mx-auto max-w-xl">
        <FileDrop />
      </div>
    );
  }

  const btn =
    "rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-40";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btn}
          disabled={busy}
          onClick={() => void run(() => toGrayscalePdf(bytes), "bw")}
        >
          {t("grayscale")}
        </button>
        <button
          type="button"
          className={btn}
          disabled={busy}
          onClick={() => void run(() => compressPdf(bytes), "compressed")}
        >
          {t("compress")}
        </button>
        {PRINT_CHECK_ENABLED && (
          <button
            type="button"
            className={btn}
            onClick={() => {
              setScan((s) => !s);
              if (scan) setBoxes([]);
            }}
          >
            {t("scan_print")}
          </button>
        )}
        <button
          type="button"
          className={btn}
          disabled={busy}
          onClick={() => void run(() => rotatePages(bytes, 90), "rotated")}
        >
          {t("rotate")}
        </button>
        <button
          type="button"
          className={btn}
          disabled={busy}
          onClick={() =>
            void run(() => extractPages(bytes, [page - 1]), `page-${page}`)
          }
        >
          {t("split")}
        </button>
        <label className={`${btn} cursor-pointer`}>
          {t("merge")}
          <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => void onMergeInput(e)} />
        </label>
        {extraMergeBytes.length > 0 && (
          <button
            type="button"
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium"
            onClick={() =>
              void run(
                () => mergePdfs([bytes, ...extraMergeBytes]),
                "merged"
              )
            }
          >
            {t("merge")} ({extraMergeBytes.length + 1})
          </button>
        )}
        <button type="button" className={btn} onClick={() => setLockOpen(true)}>
          {t("lock")}
        </button>
        <button
          type="button"
          className={btn}
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          {t("prev")}
        </button>
        <span className="self-center text-sm text-slate-400">
          {t("page", { n: page, total: pageCount })}
        </span>
        <button
          type="button"
          className={btn}
          disabled={page >= pageCount}
          onClick={() => setPage(page + 1)}
        >
          {t("next")}
        </button>
      </div>

      {PRINT_CHECK_ENABLED && scan && (
        <p className="text-sm text-amber-300">
          {boxes.length ? t("scan_hits", { n: boxes.length }) : t("scan_ok")}
        </p>
      )}

      <div className="overflow-auto rounded-xl bg-slate-900 p-2">
        <PdfCanvas
          bytes={bytes}
          page={page}
          scan={PRINT_CHECK_ENABLED && scan}
          scanBoxes={PRINT_CHECK_ENABLED ? boxes : []}
          onScanBoxes={PRINT_CHECK_ENABLED ? setBoxes : undefined}
        />
      </div>

      {lockOpen && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/50 p-4">
          <form
            className="w-full max-w-sm space-y-3 rounded-2xl bg-slate-900 p-5 ring-1 ring-white/10"
            onSubmit={(e) => {
              e.preventDefault();
              setLockOpen(false);
              void run(() => encryptPdf(bytes, lockPw), "locked");
              setLockPw("");
            }}
          >
            <h2 className="font-semibold">{t("lock_title")}</h2>
            <input
              type="password"
              required
              value={lockPw}
              onChange={(e) => setLockPw(e.target.value)}
              placeholder={t("set_password")}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg bg-slate-800 py-2"
                onClick={() => setLockOpen(false)}
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-sky-500 py-2 font-semibold text-slate-950"
              >
                {t("lock")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
