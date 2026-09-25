import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FONT_CHOICES, FONT_SIZES, type FontId } from "../lib/fonts";
import type { PdfTextLine } from "../lib/pdfjs";

type Props = {
  line: PdfTextLine;
  onSave: (payload: { text: string; fontFamily: FontId; fontSize: number }) => void;
  onCancel: () => void;
  busy?: boolean;
};

export function EditTextPopup({ line, onSave, onCancel, busy }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState(line.str);
  const [fontFamily, setFontFamily] = useState<FontId>(line.fontFamily);
  const [fontSize, setFontSize] = useState(Math.round(line.fontSize));

  useEffect(() => {
    setText(line.str);
    setFontFamily(line.fontFamily);
    setFontSize(Math.round(line.fontSize));
  }, [line]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ text: text.trim(), fontFamily, fontSize });
  };

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/65 p-4"
      onMouseDown={onCancel}
    >
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="ui-glass-dialog w-full max-w-lg rounded-2xl p-5"
      >
        <h2 className="text-lg font-semibold text-text-primary">{t("edit_popup_title")}</h2>
        <p className="mt-1 text-xs text-text-secondary">{t("edit_popup_hint")}</p>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="ui-field mt-3 text-base"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="text-xs text-text-muted">
            {t("font_family")}
            <select
              className="ui-field mt-1 block text-sm"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value as FontId)}
            >
              {FONT_CHOICES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-text-muted">
            {t("font_size")}
            <select
              className="ui-field mt-1 block text-sm"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
            >
              {FONT_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}px
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            className="ui-btn-secondary flex-1 py-2 text-sm"
            onClick={onCancel}
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="ui-btn-primary flex-1 py-2 text-sm"
          >
            {t("save_change")}
          </button>
        </div>
      </form>
    </div>
  );
}
