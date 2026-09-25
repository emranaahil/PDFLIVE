import wasmUrl from "@jspawn/qpdf-wasm/qpdf.wasm?url";
import QpdfFactory from "@qpdf-engine";
import { PDFDocument } from "pdf-lib";

type QpdfModule = {
  callMain: (args: string[]) => number | Promise<number>;
  printErr?: (line: string) => void;
  FS: {
    writeFile: (path: string, data: Uint8Array | string) => void;
    readFile: (path: string, opts?: { encoding?: string }) => Uint8Array | string;
    unlink?: (path: string) => void;
  };
};

let modulePromise: Promise<QpdfModule> | null = null;

function factoryFrom(mod: unknown): ((opts?: Record<string, unknown>) => QpdfModule | Promise<QpdfModule>) {
  if (typeof mod === "function") return mod as (opts?: Record<string, unknown>) => QpdfModule | Promise<QpdfModule>;
  const record = mod as { default?: unknown; Module?: unknown };
  if (typeof record.default === "function") {
    return record.default as (opts?: Record<string, unknown>) => QpdfModule | Promise<QpdfModule>;
  }
  if (typeof record.Module === "function") {
    return record.Module as (opts?: Record<string, unknown>) => QpdfModule | Promise<QpdfModule>;
  }
  throw new Error("Could not load the PDF protection tool.");
}

async function getQpdf() {
  if (!modulePromise) {
    const factory = factoryFrom(QpdfFactory);
    modulePromise = Promise.resolve(
      factory({
        noInitialRun: true,
        locateFile: (f: string) => (f.endsWith(".wasm") ? wasmUrl : f),
      })
    ).catch((err) => {
      modulePromise = null;
      throw err;
    });
  }
  return modulePromise;
}

async function writeAndRun(
  qpdf: QpdfModule,
  input: Uint8Array,
  args: string[],
  appendFiles = true
): Promise<Uint8Array> {
  const inName = "/in.pdf";
  const outName = "/out.pdf";
  const notes: string[] = [];
  const prevErr = qpdf.printErr;
  try {
    qpdf.printErr = (line: string) => {
      notes.push(String(line));
    };
  } catch {
    /* keep the original logger */
  }
  try {
    const copy = new Uint8Array(input.byteLength);
    copy.set(input);
    qpdf.FS.writeFile(inName, copy);
    let failed: unknown;
    try {
      const argv = appendFiles ? [...args, inName, outName] : args;
      const result = qpdf.callMain(argv);
      if (result && typeof (result as Promise<unknown>).then === "function") {
        await result;
      }
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status !== 0) failed = err;
    }
    let out: Uint8Array | null = null;
    try {
      const raw = qpdf.FS.readFile(outName) as Uint8Array | string;
      let bytes: Uint8Array | null = null;
      if (raw instanceof Uint8Array) bytes = new Uint8Array(raw);
      else if (typeof raw === "string" && raw.length) {
        bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i) & 255;
      }
      if (bytes && bytes.byteLength > 5 && bytes[0] === 0x25) out = bytes;
    } catch {
      out = null;
    }
    if (out) return out;
    const detail = notes.filter(Boolean).slice(-4).join(" ").trim();
    const message = failed instanceof Error ? failed.message : "";
    throw new Error(detail || message || "qpdf produced no output");
  } finally {
    try {
      qpdf.printErr = prevErr;
    } catch {
      /* ignore */
    }
    try {
      qpdf.FS.unlink?.(inName);
    } catch {
      /* ignore */
    }
    try {
      qpdf.FS.unlink?.(outName);
    } catch {
      /* ignore */
    }
  }
}

/** Decrypt in RAM using qpdf-wasm. Never uploads the file. */
export async function decryptPdf(
  bytes: Uint8Array,
  password: string
): Promise<Uint8Array> {
  const qpdf = await getQpdf();
  return writeAndRun(qpdf, bytes, [`--password=${password}`, "--decrypt"]);
}

/** Encrypt before download using qpdf-wasm AES-256. Any 5–15 character password. */
export async function encryptPdf(
  bytes: Uint8Array,
  password: string
): Promise<Uint8Array> {
  const length = [...password].length;
  if (length < 5 || length > 15) {
    throw new Error("Password must be 5 to 15 characters.");
  }
  if (!bytes.byteLength) throw new Error("This PDF is empty.");
  const qpdf = await getQpdf();
  return writeAndRun(qpdf, bytes, [
    "--allow-weak-crypto",
    "--encrypt",
    password,
    password,
    "256",
    "--",
  ]);
}

/** Fallback if wasm CLI args fail: pdf-lib can still load an already-unlocked buffer. */
export async function assertLoadable(bytes: Uint8Array): Promise<void> {
  await PDFDocument.load(bytes, { ignoreEncryption: false });
}
