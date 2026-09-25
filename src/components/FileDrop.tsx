import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MAX_FILE_BYTES } from "../lib/constants";
import { FileTooLargeError, assertPdfFileSize } from "../lib/fileGate";
import { usePdf } from "../store/PdfContext";

export function FileDrop({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { openFiles, showToast } = usePdf();
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  const gateAndOpen = async (files: FileList | File[]) => {
    const first = Array.from(files)[0];
    if (!first) return;
    try {
      assertPdfFileSize(first);
    } catch (e) {
      if (e instanceof FileTooLargeError) {
        showToast("error", t("file_too_large"));
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }
    await openFiles(files);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e: DragEvent) => {
        e.preventDefault();
        setHover(false);
        if (e.dataTransfer.files.length) void gateAndOpen(e.dataTransfer.files);
      }}
      className={`cursor-pointer border border-dashed text-center transition-colors ${
        hover
          ? "border-primary bg-primary-soft"
          : "border-primary/30 bg-white"
      } ${compact ? "rounded-md px-3 py-4" : "rounded-lg px-5 py-8 sm:px-6 sm:py-10"}`}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      aria-label={t("drop_here")}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (e.target.files?.length) void gateAndOpen(e.target.files);
        }}
      />
      <p className="text-base font-medium text-text-primary">{t("drop_here")}</p>
      <p className="mt-1 text-sm text-primary">{t("or_browse")}</p>
      <p className="mt-3 text-xs text-text-muted">
        {t("pdf_max", { mb: Math.round(MAX_FILE_BYTES / 1048576) })}
      </p>
    </div>
  );
}
