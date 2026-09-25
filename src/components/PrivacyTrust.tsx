import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";

type Props = { compact?: boolean };

export function PrivacyTrust({ compact = false }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 16 });

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (compact) {
    return (
      <span className="relative">
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-1.5 px-1.5 text-[13px] text-text-muted"
          aria-expanded={open}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const width = Math.min(288, window.innerWidth - 32);
            const left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));
            setPos({ top: rect.bottom + 6, left });
            setOpen((v) => !v);
          }}
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon name="protect" className="h-2.5 w-2.5" />
          </span>
          <span>{t("private_short")}</span>
        </button>
        {open &&
          createPortal(
            <p
              className="fixed z-50 w-[min(18rem,calc(100vw-2rem))] rounded-md border border-border bg-surface p-3 text-left text-[13px] leading-5 text-text-secondary shadow-sm"
              style={{ top: pos.top, left: pos.left }}
            >
              {t("private_local")}
            </p>,
            document.body
          )}
      </span>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3 text-left">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Icon name="protect" className="h-4 w-4 text-primary" />
        {t("privacy_badge")}
      </p>
      <p className="ui-small mt-2 text-text-secondary">{t("privacy_headline")}</p>
      <p className="ui-small text-text-secondary">{t("privacy_explain")}</p>
    </div>
  );
}
