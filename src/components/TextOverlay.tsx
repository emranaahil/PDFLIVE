import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FontSize } from "../extensions/FontSize";
import { FONT_CHOICES, FONT_SIZES, cssForFont, type FontId } from "../lib/fonts";

export type OverlayBox = {
  id: string;
  kind: "text" | "cover" | "replace" | "sign";
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  html: string;
  src?: string;
  fontSize: number;
  fontFamily: FontId;
  sourceLineId?: string;
};

type Props = {
  box: OverlayBox;
  active: boolean;
  onChange: (patch: Partial<OverlayBox>) => void;
  onActivate: () => void;
  onRemove: () => void;
  onDone: () => void;
};

export function TextOverlay({
  box,
  active,
  onChange,
  onActivate,
  onRemove,
  onDone,
}: Props) {
  const { t } = useTranslation();
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Placeholder.configure({ placeholder: t("text_placeholder") }),
    ],
    content: box.html || "<p></p>",
    editorProps: {
      attributes: { class: "tiptap px-1 py-0.5" },
    },
    onUpdate: ({ editor: ed }) => {
      onChange({ html: ed.getHTML() });
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setFontFamily(cssForFont(box.fontFamily));
    editor.commands.setFontSize(`${box.fontSize}px`);
  }, [editor, box.fontFamily, box.fontSize]);

  useEffect(() => {
    if (active && box.kind === "text") editor?.commands.focus("end");
  }, [active, editor, box.kind]);

  const startDrag = (e: React.PointerEvent) => {
    onActivate();
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = box.x;
    const oy = box.y;
    const move = (ev: PointerEvent) => {
      onChange({ x: ox + ev.clientX - startX, y: oy + ev.clientY - startY });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    onActivate();
    const sx = e.clientX;
    const sy = e.clientY;
    const sw = box.width;
    const sh = box.height;
    const move = (ev: PointerEvent) => {
      onChange({
        width: Math.max(80, sw + ev.clientX - sx),
        height: Math.max(24, sh + ev.clientY - sy),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (box.kind === "sign") {
    return (
      <div
        className={`absolute touch-none ${active ? "z-20 ring-2 ring-primary" : "z-10 ring-1 ring-border"}`}
        style={{
          left: box.x,
          top: box.y,
          width: box.width,
          height: box.height,
        }}
        onPointerDown={startDrag}
      >
        <img
          src={box.src || ""}
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full select-none object-contain"
        />
        {active && (
          <>
            <div
              className="absolute -top-7 right-0 flex gap-1"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="rounded bg-danger px-1.5 py-0.5 text-[10px] text-background"
                onClick={onRemove}
              >
                {t("remove_box")}
              </button>
              <button
                type="button"
                className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-background"
                onClick={onDone}
              >
                {t("done")}
              </button>
            </div>
            <div
              className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize bg-primary"
              onPointerDown={startResize}
            />
          </>
        )}
      </div>
    );
  }

  if (box.kind === "cover") {
    return (
      <div
        className={`absolute touch-none ${active ? "z-20 ring-2 ring-warning" : "z-10 ring-1 ring-border"}`}
        style={{
          left: box.x,
          top: box.y,
          width: box.width,
          height: box.height,
          background: "#fff",
        }}
        onPointerDown={startDrag}
      >
        {active && (
          <>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-text-muted">
              {t("cover_hint")}
            </div>
            <button
              type="button"
              className="absolute -top-6 right-0 rounded bg-danger px-1.5 py-0.5 text-[10px] text-background"
              onClick={onRemove}
            >
              {t("remove_box")}
            </button>
            <div
              className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize bg-warning"
              onPointerDown={startResize}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={`absolute touch-none ${active ? "z-20 ring-2 ring-primary" : "z-10 ring-1 ring-border"}`}
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        minHeight: box.height,
        fontFamily: cssForFont(box.fontFamily),
        fontSize: box.fontSize,
      }}
      onPointerDown={startDrag}
    >
      {active && (
        <div
          className="mb-1 flex flex-wrap items-center gap-1 rounded-md bg-surface-elevated p-1 text-[11px] text-text-primary"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <select
            value={box.fontFamily}
            className="rounded bg-toolbar px-1 py-0.5"
            onChange={(e) => onChange({ fontFamily: e.target.value as FontId })}
            aria-label={t("font_family")}
          >
            {FONT_CHOICES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            value={box.fontSize}
            className="rounded bg-toolbar px-1 py-0.5"
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            aria-label={t("font_size")}
          >
            {FONT_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}px
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`rounded px-1.5 py-0.5 font-bold ${editor?.isActive("bold") ? "bg-primary text-background" : "bg-toolbar"}`}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            B
          </button>
          <button
            type="button"
            className={`rounded px-1.5 py-0.5 italic ${editor?.isActive("italic") ? "bg-primary text-background" : "bg-toolbar"}`}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            I
          </button>
          <button
            type="button"
            className={`rounded px-1.5 py-0.5 underline ${editor?.isActive("underline") ? "bg-primary text-background" : "bg-toolbar"}`}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            U
          </button>
          <button
            type="button"
            className="rounded bg-danger px-1.5 py-0.5 text-background"
            onClick={onRemove}
          >
            {t("remove_box")}
          </button>
          <button
            type="button"
            className="rounded bg-primary px-1.5 py-0.5 font-semibold text-background"
            onClick={onDone}
          >
            {t("done")}
          </button>
        </div>
      )}
      <div
        className="min-h-[1.6em] rounded bg-white/90 text-slate-900"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <EditorContent editor={editor} />
      </div>
      {active && (
        <div
          className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize bg-primary"
          onPointerDown={startResize}
        />
      )}
    </div>
  );
}
