import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";

export type RailTool =
  | "select"
  | "text"
  | "hide"
  | "sign"
  | "pages"
  | "rotate"
  | "compress"
  | "bw"
  | "merge"
  | "protect";

type Item = { id: RailTool; icon: string; labelKey: string };

const ITEMS: Item[] = [
  { id: "select", icon: "select", labelKey: "tool_select" },
  { id: "text", icon: "text", labelKey: "tool_text_editor" },
  { id: "hide", icon: "hide", labelKey: "tool_hide" },
  { id: "sign", icon: "sign", labelKey: "tool_sign" },
  { id: "pages", icon: "pages", labelKey: "tool_pages" },
  { id: "rotate", icon: "rotate", labelKey: "tool_rotate" },
  { id: "compress", icon: "compress", labelKey: "tool_compress" },
  { id: "bw", icon: "bw", labelKey: "tool_bw" },
  { id: "merge", icon: "merge", labelKey: "tool_merge" },
  { id: "protect", icon: "protect", labelKey: "tool_protect" },
];

type Props = {
  active: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelect: (id: RailTool) => void;
  className?: string;
};

export function ToolRail({
  active,
  collapsed,
  onToggleCollapse,
  onSelect,
  className = "",
}: Props) {
  const { t } = useTranslation();
  return (
    <aside
      className={`ui-glass flex h-full shrink-0 flex-col rounded-none border-y-0 border-l-0 ${
        collapsed ? "w-12" : "w-[13.5rem] lg:w-[4.25rem]"
      } ${className}`}
    >
      <button
        type="button"
        className="flex h-11 min-h-11 items-center justify-center text-text-muted hover:text-text-primary"
        onClick={onToggleCollapse}
        title={t("rail_toggle")}
        aria-label={t("rail_toggle")}
        aria-expanded={!collapsed}
      >
        <Icon name="rail" />
      </button>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {ITEMS.map((item, i) => (
          <div key={item.id}>
            {i === 4 && <div className="my-1.5 h-px bg-border" />}
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              title={t(item.labelKey)}
              aria-label={t(item.labelKey)}
              aria-pressed={active === item.id}
              className={`flex min-h-11 w-full items-center gap-2.5 rounded-md px-2 py-2 text-xs lg:min-h-0 lg:flex-col lg:gap-0.5 lg:px-0.5 lg:py-1.5 lg:text-[10px] ${
                collapsed ? "justify-center" : "justify-start lg:justify-center"
              } ${
                active === item.id
                  ? "ui-tool-active"
                  : "text-text-secondary hover:bg-primary-soft hover:text-text-primary"
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5 shrink-0 lg:h-4 lg:w-4" />
              {!collapsed && (
                <span className="max-w-full truncate lg:text-center">{t(item.labelKey)}</span>
              )}
            </button>
          </div>
        ))}
      </nav>
    </aside>
  );
}
