import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { FileTooLargeError, isPdfFile, readPdfBytes } from "../lib/fileGate";
import { getPdfDocument, isPasswordError } from "../lib/pdfjs";
import { decryptPdf } from "../lib/qpdf";
import { revokeAllObjectUrls } from "../lib/memory";
import { formatClock, formatFileSize } from "../lib/format";

export type ToastKind = "error" | "info" | "ok";

export type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
};

export type ActivityItem = {
  id: string;
  time: string;
  text: string;
};

type PdfState = {
  bytes: Uint8Array | null;
  name: string;
  pageCount: number;
  page: number;
  busy: boolean;
  toasts: ToastItem[];
  dismissToast: (id: string) => void;
  passwordOpen: boolean;
  pendingFile: File | null;
  setPage: (n: number) => void;
  setBytes: (bytes: Uint8Array, name?: string) => Promise<void>;
  openFiles: (files: FileList | File[]) => Promise<void>;
  submitPassword: (password: string) => Promise<void>;
  cancelPassword: () => void;
  clear: () => void;
  showToast: (kind: ToastKind, message: string) => void;
  log: (text: string) => void;
  activity: ActivityItem[];
  extraMergeBytes: Uint8Array[];
  addMergeFile: (file: File) => Promise<void>;
  clearMerge: () => void;
  /** Increments on Clear so UI remounts (no leftover PDF/editor). */
  session: number;
};

const Ctx = createContext<PdfState | null>(null);

export function PdfProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [bytes, setBytesState] = useState<Uint8Array | null>(null);
  const [name, setName] = useState("document.pdf");
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [extraMergeBytes, setExtraMerge] = useState<Uint8Array[]>([]);
  const [session, setSession] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const toastTimers = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimers.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((kind: ToastKind, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, kind, message }].slice(-8));
    const timer = window.setTimeout(() => {
      toastTimers.current.delete(id);
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 5200);
    toastTimers.current.set(id, timer);
  }, []);

  const log = useCallback((text: string) => {
    setActivity((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          time: formatClock(),
          text,
        },
        ...prev,
      ].slice(0, 8)
    );
  }, []);

  const ingest = useCallback(
    async (
      data: Uint8Array,
      fileName: string,
      password?: string,
      opts?: { keepPage?: boolean }
    ) => {
      const doc = await getPdfDocument(data, password);
      const n = doc.numPages;
      await doc.destroy();
      setBytesState(data);
      setName(fileName);
      setPageCount(n);
      if (!opts?.keepPage) setPage(1);
      else setPage((p) => Math.min(Math.max(1, p), n));
      return n;
    },
    []
  );

  const setBytes = useCallback(
    async (data: Uint8Array, fileName?: string) => {
      await ingest(data, fileName ?? name, undefined, { keepPage: true });
    },
    [ingest, name]
  );

  const openOne = useCallback(
    async (file: File, password?: string) => {
      if (!isPdfFile(file)) {
        showToast("error", t("not_pdf"));
        return;
      }
      try {
        const raw = await readPdfBytes(file);
        if (password) {
          try {
            const unlocked = await decryptPdf(raw, password);
            const pages = await ingest(unlocked, file.name);
            setPasswordOpen(false);
            setPendingFile(null);
            log(
              t("log_opened", {
                name: file.name,
                size: formatFileSize(file.size),
                pages,
              })
            );
            return;
          } catch {
            showToast("error", t("wrong_password"));
            return;
          }
        }
        try {
          const pages = await ingest(raw, file.name);
          setPasswordOpen(false);
          setPendingFile(null);
          log(
            t("log_opened", {
              name: file.name,
              size: formatFileSize(file.size),
              pages,
            })
          );
        } catch (err) {
          if (isPasswordError(err)) {
            setPendingFile(file);
            setPasswordOpen(true);
            return;
          }
          throw err;
        }
      } catch (err) {
        if (err instanceof FileTooLargeError) {
          showToast("error", t("file_too_large"));
          return;
        }
        showToast("error", t("error"));
      }
    },
    [ingest, showToast, t, log]
  );

  const openFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list[0]) return;
      setBusy(true);
      try {
        await openOne(list[0]);
      } finally {
        setBusy(false);
      }
    },
    [openOne]
  );

  const submitPassword = useCallback(
    async (password: string) => {
      if (!pendingFile) return;
      setBusy(true);
      try {
        await openOne(pendingFile, password);
      } finally {
        setBusy(false);
      }
    },
    [openOne, pendingFile]
  );

  const cancelPassword = useCallback(() => {
    setPasswordOpen(false);
    setPendingFile(null);
  }, []);

  const clear = useCallback(() => {
    setBytesState(null);
    setName("");
    setPageCount(0);
    setPage(1);
    setExtraMerge([]);
    setPendingFile(null);
    setPasswordOpen(false);
    setBusy(false);
    toastTimers.current.forEach((timer) => window.clearTimeout(timer));
    toastTimers.current.clear();
    setToasts([]);
    setActivity([]);
    revokeAllObjectUrls();
    setSession((n) => n + 1);
  }, []);

  const addMergeFile = useCallback(
    async (file: File) => {
      try {
        const raw = await readPdfBytes(file);
        setExtraMerge((prev) => [...prev, raw]);
      } catch (err) {
        if (err instanceof FileTooLargeError) showToast("error", t("file_too_large"));
        else showToast("error", t("error"));
      }
    },
    [showToast, t]
  );

  const value = useMemo<PdfState>(
    () => ({
      bytes,
      name,
      pageCount,
      page,
      busy,
      toasts,
      dismissToast,
      passwordOpen,
      pendingFile,
      setPage,
      setBytes,
      openFiles,
      submitPassword,
      cancelPassword,
      clear,
      showToast,
      log,
      activity,
      extraMergeBytes,
      addMergeFile,
      clearMerge: () => setExtraMerge([]),
      session,
    }),
    [
      bytes,
      name,
      pageCount,
      page,
      busy,
      toasts,
      dismissToast,
      passwordOpen,
      pendingFile,
      setBytes,
      openFiles,
      submitPassword,
      cancelPassword,
      clear,
      showToast,
      log,
      activity,
      extraMergeBytes,
      addMergeFile,
      session,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePdf() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePdf outside PdfProvider");
  return ctx;
}
