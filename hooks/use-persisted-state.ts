"use client";

import { useSyncExternalStore, useRef, useCallback } from "react";

interface Envelope<T> {
  _v: number;
  state: T;
}

type Listener = () => void;
type SetState<T> = (update: T | ((prev: T) => T)) => void;

/** Per-key listener lists so multiple hooks sharing a key stay in sync. */
const listenersByKey = new Map<string, Listener[]>();

function getListeners(key: string): Listener[] {
  let list = listenersByKey.get(key);
  if (!list) {
    list = [];
    listenersByKey.set(key, list);
  }
  return list;
}

function emitChange(key: string) {
  for (const listener of getListeners(key)) {
    listener();
  }
}

function readStorage<T>(key: string, version: number, defaultState: T): T {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultState;
    const envelope = JSON.parse(raw) as Envelope<T>;
    if (envelope._v !== version) return defaultState;
    return envelope.state;
  } catch {
    return defaultState;
  }
}

function writeStorage<T>(key: string, version: number, state: T) {
  const envelope: Envelope<T> = { _v: version, state };
  localStorage.setItem(key, JSON.stringify(envelope));
  emitChange(key);
}

/**
 * SSR-safe hook that persists state to localStorage with versioning.
 *
 * Uses `useSyncExternalStore` (same pattern as `use-favourites.ts`)
 * so the component re-renders on changes — including across browser tabs.
 *
 * Key convention: `toolkit:<tool-slug>` (e.g. `toolkit:logo-generator`).
 * Bump `version` when the state shape changes; stale data is discarded.
 */
export function usePersistedState<T>(
  key: string,
  version: number,
  defaultState: T,
): [T, SetState<T>] {
  const defaultRef = useRef(defaultState);

  const getSnapshot = useCallback(() => localStorage.getItem(key) ?? "", [key]);

  const getServerSnapshot = useCallback(() => "", []);

  const subscribe = useCallback(
    (callback: Listener): (() => void) => {
      const listeners = getListeners(key);
      listeners.push(callback);

      const handleStorage = (event: StorageEvent) => {
        if (event.key === key) emitChange(key);
      };
      window.addEventListener("storage", handleStorage);

      return () => {
        const list = getListeners(key);
        const idx = list.indexOf(callback);
        if (idx !== -1) list.splice(idx, 1);
        window.removeEventListener("storage", handleStorage);
      };
    },
    [key],
  );

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Parse the stored value, falling back to defaults on mismatch or error
  let state: T;
  if (!raw) {
    state = defaultRef.current;
  } else {
    try {
      const envelope = JSON.parse(raw) as Envelope<T>;
      state = envelope._v === version ? envelope.state : defaultRef.current;
    } catch {
      state = defaultRef.current;
    }
  }

  const setState: SetState<T> = useCallback(
    (update) => {
      const current = readStorage(key, version, defaultRef.current);
      const next =
        typeof update === "function"
          ? (update as (prev: T) => T)(current)
          : update;
      writeStorage(key, version, next);
    },
    [key, version],
  );

  return [state, setState];
}
