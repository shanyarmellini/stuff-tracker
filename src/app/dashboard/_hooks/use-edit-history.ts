import { useRef, useState } from "react";
import type { HistoryRecord } from "../_lib/types";

type History = { stack: HistoryRecord[]; index: number };

const EMPTY_HISTORY: History = { stack: [], index: -1 };

/** Undo/redo stack; `apply` replays a record forwards or backwards. */
export function useEditHistory(
  apply: (record: HistoryRecord, isUndo: boolean) => void,
) {
  const [history, setHistory] = useState(EMPTY_HISTORY);
  const historyRef = useRef(history);
  historyRef.current = history;

  const push = (record: HistoryRecord) =>
    setHistory((cur) => ({
      stack: [...cur.stack.slice(0, cur.index + 1), record],
      index: cur.index + 1,
    }));

  const undo = () => {
    const cur = historyRef.current;
    if (cur.index < 0) return;
    apply(cur.stack[cur.index], true);
    setHistory((prev) => ({ ...prev, index: prev.index - 1 }));
  };

  const redo = () => {
    const cur = historyRef.current;
    if (cur.index >= cur.stack.length - 1) return;
    apply(cur.stack[cur.index + 1], false);
    setHistory((prev) => ({ ...prev, index: prev.index + 1 }));
  };

  return {
    push,
    undo,
    redo,
    reset: () => setHistory(EMPTY_HISTORY),
    canUndo: history.index >= 0,
    canRedo: history.index < history.stack.length - 1,
  };
}
