import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";

function lineBudget() {
  const wide = window.matchMedia("(min-width: 1024px)").matches;
  const shortLandscape = window.matchMedia("(max-height: 500px) and (min-width: 540px)").matches;
  return wide || shortLandscape ? 1 : 2;
}

function fitDocumentName(el: HTMLElement, name: string) {
  const clean = name.trim() || "document.pdf";
  const lines = lineBudget();
  const line = parseFloat(getComputedStyle(el).lineHeight) || 20;
  const limit = line * lines + 1;
  const fits = (text: string) => {
    el.textContent = text;
    if (lines === 1) return el.scrollWidth <= el.clientWidth + 1;
    return el.scrollHeight <= limit;
  };
  if (fits(clean)) return clean;
  const ext = clean.toLowerCase().endsWith(".pdf") ? clean.slice(-4) : "";
  const base = ext ? clean.slice(0, -ext.length) : clean;
  let low = 1;
  let high = base.length;
  let best = `…${ext}`;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = `${base.slice(0, mid)}…${ext}`;
    if (fits(candidate)) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  el.textContent = best;
  return best;
}

export function DocumentIdentity({
  name,
  meta,
  onShowInfo,
}: {
  name: string;
  meta: string;
  onShowInfo: () => void;
}) {
  const full = name.trim() || "document.pdf";
  const measureRef = useRef<HTMLButtonElement>(null);
  const [label, setLabel] = useState(full);

  useEffect(() => {
    const root = measureRef.current;
    const probe = root?.querySelector("p");
    if (!root || !(probe instanceof HTMLElement)) return;
    const fit = () => {
      if (root.clientWidth < 48) return;
      setLabel(fitDocumentName(probe, full));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(root);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [full]);

  return (
    <button
      ref={measureRef}
      type="button"
      onClick={onShowInfo}
      title={full}
      aria-label={`${full}. ${meta}`}
      className="block w-full min-w-0 max-w-full overflow-hidden text-left"
    >
      <p className="doc-filename text-[15px] font-medium leading-5 text-text-primary">{label}</p>
      <p className="mt-0.5 truncate text-[13px] leading-4 text-text-muted">{meta}</p>
    </button>
  );
}

export function DocumentHeader({
  name,
  meta,
  privacy,
  canUndo,
  canRedo,
  busy,
  onUndo,
  onRedo,
  onDownload,
  onShowInfo,
  undoTitle,
  redoTitle,
  more,
}: {
  name: string;
  meta: string;
  privacy?: ReactNode;
  canUndo: boolean;
  canRedo: boolean;
  busy?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDownload: () => void;
  onShowInfo: () => void;
  undoTitle: string;
  redoTitle: string;
  more: ReactNode;
}) {
  const { t } = useTranslation();
  const iconBtn =
    "ui-btn-ghost inline-flex h-11 w-11 shrink-0 items-center justify-center px-0 disabled:opacity-40";
  return (
    <header className="ui-glass-header shrink-0 border-b border-border px-4 py-2 min-[390px]:px-5 min-[1024px]:px-6 min-[1024px]:py-0">
      <div className="doc-header">
        <div className="flex min-h-11 min-w-0 items-center [grid-area:brand] min-[1024px]:border-r min-[1024px]:border-border min-[1024px]:pr-3">
          <span className="inline-flex min-h-11 min-w-0 items-center gap-2 text-sm font-semibold text-text-primary">
            <Icon name="brand" className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate">{t("app_name")}</span>
          </span>
        </div>
        <div className="justify-self-end [grid-area:more]">{more}</div>
        <div className="min-w-0 [grid-area:identity]">
          <DocumentIdentity name={name} meta={meta} onShowInfo={onShowInfo} />
        </div>
        <div className="doc-actions flex min-w-0 flex-wrap items-center gap-1 [grid-area:actions]">
          {privacy}
          <button type="button" className={iconBtn} disabled={!canUndo || busy} onClick={onUndo} title={undoTitle} aria-label={t("undo")}>
            <Icon name="undo" />
          </button>
          <button type="button" className={iconBtn} disabled={!canRedo || busy} onClick={onRedo} title={redoTitle} aria-label={t("redo")}>
            <Icon name="redo" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDownload}
            className="doc-download ui-btn-primary inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 px-3.5 text-sm"
            aria-label={t("download")}
          >
            <Icon name="download" className="h-4 w-4" />
            <span>{t("download")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
