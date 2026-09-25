import { usePdf } from "../store/PdfContext";

export function ActivityLog() {
  const { activity } = usePdf();
  if (!activity.length) return null;
  const latest = activity[0];
  return (
    <div className="ui-fade-in border-b border-border bg-header px-4 py-2">
      <p className="text-xs leading-relaxed text-text-secondary">
        <span className="tabular-nums text-text-muted">{latest.time}</span>
        <span className="mx-2 text-border">·</span>
        <span className="text-text-primary">{latest.text}</span>
      </p>
    </div>
  );
}
