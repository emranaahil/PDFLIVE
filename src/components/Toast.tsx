import { usePdf, type ToastKind } from "../store/PdfContext";

const KIND_CLASS: Record<ToastKind, string> = {
  error: "bg-danger text-background",
  ok: "bg-success text-background",
  info: "bg-primary text-background",
};

export function Toast() {
  const { toasts, dismissToast } = usePdf();
  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-12 z-[80] flex justify-end p-3 sm:bottom-4"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex w-full max-w-[min(92vw,26rem)] flex-col gap-2">
        {toasts.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => dismissToast(item.id)}
            className={`ui-toast-item w-full rounded-md px-3 py-2.5 text-left text-sm font-medium leading-snug ${KIND_CLASS[item.kind]}`}
          >
            <span className="sr-only">{index + 1} of {toasts.length}. </span>
            {item.message}
          </button>
        ))}
      </div>
    </div>
  );
}
