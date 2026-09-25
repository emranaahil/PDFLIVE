import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";

type Props = {
  page: number;
  pageCount: number;
  zoom: number;
  busy?: boolean;
  status?: string;
  onPage: (n: number) => void;
  onZoom: (z: number) => void;
  onFitWidth: () => void;
  onFitPage: () => void;
};

export function BottomBar({
  page,
  pageCount,
  zoom,
  busy,
  status,
  onPage,
  onZoom,
  onFitWidth,
  onFitPage,
}: Props) {
  const { t } = useTranslation();
  const pct = Math.round(zoom * 100);
  const btn =
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-primary-soft hover:text-text-primary disabled:opacity-40";
  return (
    <div className="pointer-events-none shrink-0 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 min-[390px]:px-5">
      <div className="ui-glass pointer-events-auto mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-1 rounded-xl px-1 py-1 text-text-muted">
        <div className="flex items-center justify-center">
          <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t("prev")} title={t("prev")}>
            <Icon name="prev" />
          </button>
          <span className="min-w-[4.5rem] px-1 text-center text-sm tabular-nums text-text-primary">
            {page} / {pageCount}
          </span>
          <button type="button" className={btn} disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label={t("next")} title={t("next")}>
            <Icon name="next" />
          </button>
        </div>
        <div className="flex items-center justify-center">
          <button type="button" className={btn} onClick={() => onZoom(Math.max(0.2, zoom - 0.1))} aria-label={t("zoom_out")} title={t("zoom_out")}>
            <Icon name="zoom-out" />
          </button>
          <span className="w-12 text-center text-sm tabular-nums text-text-primary">{pct}%</span>
          <button type="button" className={btn} onClick={() => onZoom(Math.min(2.5, zoom + 0.1))} aria-label={t("zoom_in")} title={t("zoom_in")}>
            <Icon name="zoom-in" />
          </button>
          <button type="button" className={btn} onClick={onFitWidth} aria-label={t("fit_width")} title={t("fit_width")}>
            <Icon name="fit-width" />
          </button>
          <button type="button" className={btn} onClick={onFitPage} aria-label={t("fit_page")} title={t("fit_page")}>
            <Icon name="fit-page" />
          </button>
        </div>
        <span className="hidden min-w-0 truncate px-2 text-[13px] text-text-muted sm:inline">
          {busy ? t("working") : status || t("privacy_badge")}
        </span>
      </div>
    </div>
  );
}
