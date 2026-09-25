import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";

export type CommandItem = {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  run: () => void;
};

type Props = {
  open: boolean;
  items: CommandItem[];
  onClose: () => void;
};

export function CommandPalette({ open, items, onClose }: Props) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) => i.label.toLowerCase().includes(s));
  }, [items, q]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setHi(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    setHi(0);
  }, [q]);

  if (!open) return null;

  const run = (item: CommandItem) => {
    onClose();
    item.run();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-label={t("cmd_title")}
        className="ui-glass-dialog w-full max-w-md overflow-hidden rounded-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("cmd_placeholder")}
          className="w-full border-b border-border bg-transparent px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setHi((n) => Math.min(filtered.length - 1, n + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHi((n) => Math.max(0, n - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const item = filtered[hi];
              if (item) run(item);
            }
          }}
        />
        <ul className="max-h-64 overflow-auto py-1">
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-xs text-text-muted">{t("cmd_empty")}</li>
          )}
          {filtered.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
                  i === hi ? "ui-tool-active" : "text-text-primary hover:bg-primary-soft"
                }`}
                onMouseEnter={() => setHi(i)}
                onClick={() => run(item)}
              >
                <Icon name={item.icon} className="h-4 w-4 shrink-0 opacity-80" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.shortcut && (
                  <kbd className="shrink-0 rounded border border-border bg-surface-elevated px-1.5 py-0.5 font-sans text-[10px] text-text-muted">
                    {item.shortcut}
                  </kbd>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
