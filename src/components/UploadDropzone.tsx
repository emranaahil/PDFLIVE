import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MAX_FILE_BYTES } from "../lib/constants";
import { FileTooLargeError, assertPdfFileSize } from "../lib/fileGate";
import { usePdf } from "../store/PdfContext";
import { ErrorState, LoadingState, PrimaryButton } from "./ToolPage";

export function UploadDropzone() {
  const { t } = useTranslation();
  const { openFiles, showToast, busy } = usePdf();
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState("");

  const gateAndOpen = async (files: FileList | File[]) => {
    const first = Array.from(files)[0];
    if (!first) return;
    setError("");
    try {
      assertPdfFileSize(first);
    } catch (e) {
      if (e instanceof FileTooLargeError) {
        setError(t("file_too_large"));
        showToast("error", t("file_too_large"));
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }
    setPicked(first.name);
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
      className={`rounded-lg border border-dashed px-4 py-6 text-center transition-colors duration-150 sm:px-6 sm:py-8 ${
        hover ? "border-primary bg-primary-soft" : "border-border bg-surface"
      } ${busy ? "opacity-70" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (e.target.files?.length) void gateAndOpen(e.target.files);
        }}
      />
      <p className="text-base font-semibold text-text-primary">{t("upload_title")}</p>
      <p className="ui-small mt-2 hidden text-text-secondary sm:block">{t("upload_drop")}</p>
      <p className="ui-small mt-1 hidden text-text-muted sm:block">{t("upload_or")}</p>
      <PrimaryButton className="mt-4 w-full sm:w-auto" disabled={busy} onClick={() => inputRef.current?.click()}>
        {t("upload_browse")}
      </PrimaryButton>
      <p className="ui-small mt-3 text-text-muted">
        {t("upload_limit", { mb: Math.round(MAX_FILE_BYTES / 1048576) })}
      </p>
      {picked && !error && (
        <p className="ui-small mt-2 text-text-primary" role="status">
          {picked}
        </p>
      )}
      {busy && <div className="mt-3"><LoadingState /></div>}
      {error && <div className="mt-3"><ErrorState message={error} /></div>}
    </div>
  );
}
