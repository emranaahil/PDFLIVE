import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AUTHOR } from "../lib/author";
import { Icon } from "./Icon";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LinkedInIcon } from "./LinkedInIcon";

type HeaderProps = {
  onHome: () => void;
};

export function SiteHeader({ onHome }: HeaderProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const go = (id: string) => {
    setOpen(false);
    onHome();
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-header">
      <div className="ui-wrap flex h-14 items-center gap-3">
        <button
          type="button"
          onClick={onHome}
          className="inline-flex min-h-11 min-w-0 items-center gap-2 text-sm font-semibold text-text-primary"
        >
          <Icon name="brand" className="h-5 w-5 shrink-0 text-primary" />
          <span className="truncate">{t("app_name")}</span>
        </button>
        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label={t("nav_main")}>
          <button type="button" className="ui-btn-ghost min-h-11 px-3 text-sm" onClick={() => go("tools")}>
            {t("nav_tools")}
          </button>
          <button type="button" className="ui-btn-ghost min-h-11 px-3 text-sm" onClick={() => go("about")}>
            {t("nav_about")}
          </button>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <LanguageSwitcher />
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-primary md:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={t("nav_menu")}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name="rail" />
          </button>
        </div>
      </div>
      {open && (
        <nav id="site-menu" className="border-t border-border bg-header px-[clamp(16px,4vw,32px)] py-3 md:hidden" aria-label={t("nav_main")}>
          <button type="button" className="ui-menu-item min-h-11" onClick={() => go("tools")}>
            {t("nav_tools")}
          </button>
          <button type="button" className="ui-menu-item min-h-11" onClick={() => go("about")}>
            {t("nav_about")}
          </button>
          <div className="mt-2 border-t border-border/60 pt-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">{t("language")}</span>
            <LanguageSwitcher />
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter({ onPick }: { onPick: (id: string) => void }) {
  const { t } = useTranslation();
  const tools: { id: string; label: string }[] = [
    { id: "compress", label: "tool_compress" },
    { id: "merge", label: "tool_merge" },
    { id: "rotate", label: "tool_rotate" },
    { id: "sign", label: "tool_sign" },
    { id: "protect", label: "tool_protect" },
    { id: "unlock", label: "tool_unlock" },
    { id: "hide", label: "tool_hide" },
    { id: "pages", label: "tool_pages" },
    { id: "bw", label: "tool_bw" },
    { id: "text", label: "tool_text_editor" },
  ];

  return (
    <footer className="mt-auto border-t border-border bg-header">
      <div className="ui-wrap grid gap-6 py-8 sm:grid-cols-2 sm:gap-8 sm:py-10 lg:grid-cols-3">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Icon name="brand" className="h-5 w-5 text-primary" />
            {t("app_name")}
          </p>
          <p className="ui-small mt-2 max-w-xs text-text-secondary">{t("footer_blurb")}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">{t("nav_tools")}</p>
          <ul className="mt-2 grid grid-cols-2 gap-1">
            {tools.map((item) => (
              <li key={item.id}>
                <button type="button" className="ui-small min-h-11 w-full break-words text-left text-text-secondary hover:text-primary" onClick={() => onPick(item.id)}>
                  {t(item.label)}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">{t("nav_privacy")}</p>
          <button type="button" className="ui-small mt-2 block min-h-11 text-left text-text-secondary hover:text-primary" onClick={() => document.getElementById("privacy")?.scrollIntoView({ behavior: "smooth" })}>
            {t("privacy_badge")}
          </button>
          <button type="button" className="ui-small block min-h-11 text-left text-text-secondary hover:text-primary" onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}>
            {t("nav_about")}
          </button>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="ui-wrap flex flex-col gap-2 py-4 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {t("app_name")}</p>
          <a
            href={AUTHOR.linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 text-text-secondary hover:text-primary"
          >
            {t("created_by")} {AUTHOR.name}
            <LinkedInIcon className="h-3.5 w-3.5 text-[#0A66C2]" />
          </a>
        </div>
      </div>
    </footer>
  );
}
