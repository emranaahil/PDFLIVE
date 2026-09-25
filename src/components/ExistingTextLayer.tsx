import type { PdfTextLine } from "../lib/pdfjs";
import { cssForFont } from "../lib/fonts";

type Props = {
  lines: PdfTextLine[];
  hiddenIds: Set<string>;
  onPick: (line: PdfTextLine) => void;
  enabled: boolean;
};

/** Clickable highlights over real PDF text — pick a line to edit in place. */
export function ExistingTextLayer({ lines, hiddenIds, onPick, enabled }: Props) {
  if (!enabled) return null;
  return (
    <div className="pointer-events-none absolute inset-0">
      {lines.map((line) => {
        if (hiddenIds.has(line.id)) return null;
        return (
          <button
            key={line.id}
            type="button"
            title={line.str}
            className="pdf-text-hit pointer-events-auto absolute overflow-hidden text-left"
            style={{
              left: line.x,
              top: line.y,
              width: line.width,
              height: line.height,
              fontSize: line.fontSize,
              fontFamily: cssForFont(line.fontFamily),
              fontWeight: line.bold ? 700 : 400,
              fontStyle: line.italic ? "italic" : "normal",
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPick(line);
            }}
          >
            <span className="sr-only">{line.str}</span>
          </button>
        );
      })}
    </div>
  );
}
