import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePdf } from "../store/PdfContext";

export function PasswordModal() {
  const { t } = useTranslation();
  const { passwordOpen, submitPassword, cancelPassword, busy } = usePdf();
  const [value, setValue] = useState("");
  if (!passwordOpen) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await submitPassword(value);
    setValue("");
  };

  return (
    <div className="ui-modal-backdrop fixed inset-0 z-40 grid place-items-center bg-black/60 p-4">
      <form
        onSubmit={onSubmit}
        className="ui-modal-card ui-glass-dialog w-full max-w-sm rounded-2xl p-5"
      >
        <h2 className="text-lg font-semibold text-text-primary">{t("password_needed")}</h2>
        <label className="mt-4 block text-sm text-text-secondary">
          {t("password_label")}
          <input
            type="password"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("password_placeholder")}
            className="ui-field mt-1 text-base"
          />
        </label>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={cancelPassword}
            className="ui-btn-secondary min-h-11 flex-1 py-2 text-sm"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={busy || !value}
            className="ui-btn-primary min-h-11 flex-1 py-2 text-sm"
          >
            {t("unlock")}
          </button>
        </div>
      </form>
    </div>
  );
}
