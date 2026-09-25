import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";

export function Breadcrumbs({ current, onHome }: { current: string; onHome: () => void }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("breadcrumb")} className="flex min-w-0 items-center gap-1.5 text-[13px] leading-5 text-text-muted">
      <button type="button" onClick={onHome} className="inline-flex min-h-11 shrink-0 items-center rounded-sm hover:text-primary">
        {t("nav_home")}
      </button>
      <span aria-hidden className="text-border">/</span>
      <span className="truncate font-medium text-text-primary" aria-current="page">
        {current}
      </span>
    </nav>
  );
}

export function PrivacyNotice() {
  const { t } = useTranslation();
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

export function PrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`ui-btn-primary min-h-11 px-5 ${className}`} {...props}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`ui-btn-secondary min-h-11 px-4 ${className}`} {...props}>
      {children}
    </button>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <p className="ui-small text-text-secondary" role="status">
      {label || t("opening_pdf")}
    </p>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <p className="ui-small text-danger" role="alert">
      {message}
    </p>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {hint && <p className="ui-small mt-1 text-text-secondary">{hint}</p>}
    </div>
  );
}

export function ToolPageLayout({
  current,
  title,
  description,
  onHome,
  children,
}: {
  current: string;
  title: string;
  description: string;
  onHome: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[52rem]">
      <Breadcrumbs current={current} onHome={onHome} />
      <h1 className="ui-page-title mt-3 text-text-primary">{title}</h1>
      <p className="ui-body mt-2 text-text-secondary">{description}</p>
      <div className="mt-4">
        <PrivacyNotice />
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
