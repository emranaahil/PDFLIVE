import { MAX_FILE_BYTES } from "./constants";

export class FileTooLargeError extends Error {
  readonly bytes: number;
  constructor(bytes: number) {
    super("FILE_TOO_LARGE");
    this.name = "FileTooLargeError";
    this.bytes = bytes;
  }
}

/** Instant size check — never read the file if over 10 MB. */
export function assertPdfFileSize(file: File): void {
  if (file.size > MAX_FILE_BYTES) {
    throw new FileTooLargeError(file.size);
  }
}

export function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

export async function readPdfBytes(file: File): Promise<Uint8Array> {
  assertPdfFileSize(file);
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}
