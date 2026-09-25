/** Track blob URLs so we always revoke them (developer-rules.md). */
const urls = new Set<string>();

export function createTrackedObjectUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  urls.add(url);
  return url;
}

export function revokeTrackedObjectUrl(url: string | null | undefined): void {
  if (!url) return;
  URL.revokeObjectURL(url);
  urls.delete(url);
}

export function revokeAllObjectUrls(): void {
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls.clear();
}

export function clearCanvas(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = 0;
  canvas.height = 0;
}
