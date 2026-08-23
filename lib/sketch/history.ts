import { MAX_HISTORY } from "@/lib/sketch/constants";
import type { HistoryState, SketchElement } from "@/lib/sketch/types";

export function createHistoryState(
  present: SketchElement[] = [],
): HistoryState {
  return { past: [], present, future: [] };
}

export function pushHistory(
  state: HistoryState,
  next: SketchElement[],
): HistoryState {
  const past = [...state.past, state.present];
  if (past.length > MAX_HISTORY) {
    past.shift();
  }
  return { past, present: next, future: [] };
}

export function undoHistory(state: HistoryState): HistoryState {
  const previous = state.past[state.past.length - 1];
  if (!previous) return state;
  return {
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
  };
}

export function redoHistory(state: HistoryState): HistoryState {
  const next = state.future[0];
  if (!next) return state;
  return {
    past: [...state.past, state.present],
    present: next,
    future: state.future.slice(1),
  };
}
