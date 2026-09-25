import { createTrackedObjectUrl, revokeTrackedObjectUrl } from "./memory";

export function downloadBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = createTrackedObjectUrl(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  queueMicrotask(() => revokeTrackedObjectUrl(url));
}

export function stem(name: string): string {
  return name.replace(/\.pdf$/i, "") || "document";
}
