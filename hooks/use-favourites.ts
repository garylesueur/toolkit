"use client";
import { useSyncExternalStore, useCallback, useMemo } from "react";

import {
  createFavouritesStore,
  parseFavourites,
} from "@/lib/shared/favourites-store";

const store = createFavouritesStore(() => window.localStorage);
const getServerSnapshot = () => "[]";
function subscribe(callback: () => void) {
  const unsubscribe = store.subscribe(callback);
  const handleStorage = (event: StorageEvent) => {
    try {
      if (event.storageArea !== window.localStorage) return;
    } catch {
      return;
    }
    store.storageChanged(event.key);
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    unsubscribe();
    window.removeEventListener("storage", handleStorage);
  };
}

export function useFavourites() {
  const raw = useSyncExternalStore(
    subscribe,
    store.getSnapshot,
    getServerSnapshot,
  );
  const favourites = useMemo(() => new Set(parseFavourites(raw)), [raw]);
  const isFavourite = useCallback(
    (href: string) => favourites.has(href),
    [favourites],
  );
  return { favourites, toggleFavourite: store.toggle, isFavourite };
}
