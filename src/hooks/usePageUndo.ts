import { useCallback, useRef, useState } from "react";
import type { OverlayBox } from "../components/TextOverlay";

const MAX = 8;

export type PageSnap = {
  bytes: Uint8Array;
  overlays: OverlayBox[];
  page: number;
};

function cloneOverlays(list: OverlayBox[]): OverlayBox[] {
  return list.map((b) => ({ ...b }));
}

export function usePageUndo() {
  const [undoLen, setUndoLen] = useState(0);
  const [redoLen, setRedoLen] = useState(0);
  const undo = useRef<PageSnap[]>([]);
  const redo = useRef<PageSnap[]>([]);

  const reset = useCallback(() => {
    undo.current = [];
    redo.current = [];
    setUndoLen(0);
    setRedoLen(0);
  }, []);

  const dropLast = useCallback(() => {
    undo.current.pop();
    setUndoLen(undo.current.length);
  }, []);

  const push = useCallback((bytes: Uint8Array, overlays: OverlayBox[], page: number) => {
    undo.current = [
      ...undo.current.slice(-(MAX - 1)),
      { bytes: bytes.slice(), overlays: cloneOverlays(overlays), page },
    ];
    redo.current = [];
    setUndoLen(undo.current.length);
    setRedoLen(0);
  }, []);

  const popUndo = useCallback((current: PageSnap): PageSnap | null => {
    const prev = undo.current.pop();
    if (!prev) return null;
    redo.current.push({
      bytes: current.bytes.slice(),
      overlays: cloneOverlays(current.overlays),
      page: current.page,
    });
    setUndoLen(undo.current.length);
    setRedoLen(redo.current.length);
    return prev;
  }, []);

  const popRedo = useCallback((current: PageSnap): PageSnap | null => {
    const next = redo.current.pop();
    if (!next) return null;
    undo.current.push({
      bytes: current.bytes.slice(),
      overlays: cloneOverlays(current.overlays),
      page: current.page,
    });
    setUndoLen(undo.current.length);
    setRedoLen(redo.current.length);
    return next;
  }, []);

  return { undoLen, redoLen, push, popUndo, popRedo, reset, dropLast };
}
