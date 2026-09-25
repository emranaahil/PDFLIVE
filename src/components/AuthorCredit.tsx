import { useTranslation } from "react-i18next";
import { AUTHOR } from "../lib/author";
import { LinkedInIcon } from "./LinkedInIcon";

type Props = { variant?: "header" | "stack" | "menu" };

export function AuthorCredit({ variant = "header" }: Props) {
  const { t } = useTranslation();
  const label = `${t("created_by")} ${AUTHOR.name}`;

  if (variant === "menu") {
    return (
      <a
        href={AUTHOR.linkedInUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} — LinkedIn`}
        className="flex flex-col gap-0.5 px-1 py-0.5"
      >
        <span className="text-[10px] text-text-muted">{t("created_by")}</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-primary">
          {AUTHOR.name}
          <LinkedInIcon className="h-3.5 w-3.5 text-[#0A66C2]" />
        </span>
      </a>
    );
  }

  if (variant === "stack") {
    return (
      <a
        href={AUTHOR.linkedInUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} — LinkedIn`}
        className="inline-flex flex-col items-center gap-0.5 text-center"
      >
        <span className="text-[11px] text-text-muted">{t("created_by")}</span>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text-primary">
          {AUTHOR.name}
          <LinkedInIcon className="h-3.5 w-3.5 text-[#0A66C2]" />
        </span>
      </a>
    );
  }

  return (
    <a
      href={AUTHOR.linkedInUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} — LinkedIn`}
      title={label}
      className="inline-flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-surface"
    >
      <LinkedInIcon className="h-3.5 w-3.5 shrink-0 text-[#0A66C2]" />
      <span className="hidden min-w-0 flex-col leading-tight sm:flex">
        <span className="text-[10px] text-text-muted">{t("created_by")}</span>
        <span className="truncate text-xs font-medium text-text-primary">{AUTHOR.name}</span>
      </span>
    </a>
  );
}
