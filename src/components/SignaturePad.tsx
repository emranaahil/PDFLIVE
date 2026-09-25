import { useEffect, useRef } from "react";
import { Canvas, PencilBrush } from "fabric";
import { useTranslation } from "react-i18next";

type Props = {
  onApply: (dataUrl: string) => void;
  onClose: () => void;
};

function inkOnlyPng(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const pix = ctx.getImageData(0, 0, c.width, c.height);
      const d = pix.data;
      let minX = c.width;
      let minY = c.height;
      let maxX = 0;
      let maxY = 0;
      for (let i = 0; i < d.length; i += 4) {
        const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        if (lum > 242) {
          d[i + 3] = 0;
          continue;
        }
        const p = i / 4;
        const x = p % c.width;
        const y = (p / c.width) | 0;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      ctx.putImageData(pix, 0, 0);
      if (maxX <= minX || maxY <= minY) {
        resolve(src);
        return;
      }
      const pad = 6;
      const x = Math.max(0, minX - pad);
      const y = Math.max(0, minY - pad);
      const w = Math.min(c.width - x, maxX - minX + pad * 2);
      const h = Math.min(c.height - y, maxY - minY + pad * 2);
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      out.getContext("2d")?.drawImage(c, x, y, w, h, 0, 0, w, h);
      resolve(out.toDataURL("image/png"));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

export function SignaturePad({ onApply, onClose }: Props) {
  const { t } = useTranslation();
  const boxRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<Canvas | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let canvas: Canvas | null = null;
    let brush: PencilBrush | null = null;
    const el = document.createElement("canvas");
    el.style.display = "block";
    el.style.touchAction = "none";
    box.appendChild(el);

    const fit = () => {
      const width = Math.max(1, box.clientWidth);
      const height = Math.max(1, box.clientHeight);
      if (!canvas) {
        if (width < 8 || height < 8) return;
        canvas = new Canvas(el, {
          isDrawingMode: true,
          backgroundColor: "#ffffff",
          width,
          height,
          allowTouchScrolling: false,
          enableRetinaScaling: true,
        });
        brush = new PencilBrush(canvas);
        brush.color = "#0f172a";
        brush.width = Math.max(2.2, width / 140);
        canvas.freeDrawingBrush = brush;
        canvas.on("path:created", () => canvas?.requestRenderAll());
        fabricRef.current = canvas;
      } else {
        canvas.setDimensions({ width, height });
        if (brush) brush.width = Math.max(2.2, width / 140);
      }
      canvas.calcOffset();
      canvas.requestRenderAll();
    };

    const ro = new ResizeObserver(fit);
    ro.observe(box);
    fit();
    const onWin = () => canvas?.calcOffset();
    window.addEventListener("resize", onWin);
    window.addEventListener("orientationchange", onWin);

    return () => {
      document.body.style.overflow = prevOverflow;
      ro.disconnect();
      window.removeEventListener("resize", onWin);
      window.removeEventListener("orientationchange", onWin);
      canvas?.dispose();
      fabricRef.current = null;
      box.replaceChildren();
    };
  }, []);

  const clearPad = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.requestRenderAll();
  };

  const applyPad = () => {
    const canvas = fabricRef.current;
    if (!canvas || canvas.getObjects().length === 0) return;
    const data = canvas.toDataURL({ format: "png", multiplier: 2 });
    void inkOnlyPng(data).then((src) => {
      onApply(src);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="ui-glass-dialog flex max-h-dvh w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl">
        <p className="mb-1 text-sm font-medium text-text-primary">{t("sign")}</p>
        <p className="mb-3 text-xs text-text-secondary">{t("sign_pad_help")}</p>
        <div
          ref={boxRef}
          className="relative h-44 w-full shrink-0 touch-none overflow-hidden rounded-md border border-border bg-pdf-background sm:h-52 md:h-56"
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            className="ui-btn-secondary min-h-11 px-1 py-2.5 text-xs sm:text-sm"
            onClick={onClose}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            className="ui-btn-secondary min-h-11 px-1 py-2.5 text-xs sm:text-sm"
            onClick={clearPad}
          >
            {t("sign_clear")}
          </button>
          <button
            type="button"
            className="ui-btn-primary min-h-11 py-2.5 text-sm"
            onClick={applyPad}
          >
            {t("done")}
          </button>
        </div>
      </div>
    </div>
  );
}
