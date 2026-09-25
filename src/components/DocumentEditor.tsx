import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Underline from "@tiptap/extension-underline";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FontSize } from "../extensions/FontSize";
import { FONT_CHOICES, FONT_SIZES, cssForFont, type FontId } from "../lib/fonts";

type Props = {
  html: string;
  onHtml: (html: string) => void;
};

export function DocumentEditor({ html, onHtml }: Props) {
  const { t } = useTranslation();
  const [, tick] = useState(0);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Placeholder.configure({ placeholder: t("doc_placeholder") }),
    ],
    content: html || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "tiptap min-h-[16rem] rounded-b-lg bg-pdf-background px-4 py-3 text-[15px] leading-relaxed text-neutral-900 sm:min-h-[28rem] sm:px-5 sm:py-4",
      },
    },
    onUpdate: ({ editor: ed }) => onHtml(ed.getHTML()),
    onTransaction: () => tick((n) => n + 1),
  });

  if (!editor) return null;

  const setFont = (id: FontId) => {
    editor.chain().focus().setFontFamily(cssForFont(id)).run();
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-pdf-background">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-surface p-2 text-text-primary">
        <button
          type="button"
          className="ui-btn-secondary px-2 py-1 text-sm"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          {t("undo")}
        </button>
        <button
          type="button"
          className="ui-btn-secondary px-2 py-1 text-sm"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          {t("redo")}
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <select
          className="ui-field w-auto px-2 py-1 text-sm"
          defaultValue="helvetica"
          onChange={(e) => setFont(e.target.value as FontId)}
          aria-label={t("font_family")}
        >
          {FONT_CHOICES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          className="ui-field w-auto px-2 py-1 text-sm"
          defaultValue="14"
          onChange={(e) =>
            editor.chain().focus().setFontSize(`${e.target.value}px`).run()
          }
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
          className={`rounded px-2 py-1 text-sm font-bold ${editor.isActive("bold") ? "bg-primary text-background" : "ui-btn-secondary"}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          className={`rounded px-2 py-1 text-sm italic ${editor.isActive("italic") ? "bg-primary text-background" : "ui-btn-secondary"}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          type="button"
          className={`rounded px-2 py-1 text-sm underline ${editor.isActive("underline") ? "bg-primary text-background" : "ui-btn-secondary"}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          U
        </button>
        <button
          type="button"
          className={`rounded px-2 py-1 text-sm ${editor.isActive("heading", { level: 2 }) ? "bg-primary text-background" : "ui-btn-secondary"}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H
        </button>
        <button
          type="button"
          className="ui-btn-secondary px-2 py-1 text-sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
