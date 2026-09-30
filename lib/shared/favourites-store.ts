export const FAVOURITES_STORAGE_KEY = "toolkit-favourites";
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type StorageAccess = Pick<Storage, "getItem" | "setItem">;

export function parseFavourites(raw: string | null): string[] {
  try {
    const value = JSON.parse(raw ?? "[]") as JsonValue;
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter((item): item is string => typeof item === "string"),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}

/** Persistence is optional; once it fails, session memory remains authoritative. */
export function createFavouritesStore(storage: () => StorageAccess) {
  let snapshot = "[]";
  let sessionOnly = false;
  const listeners = new Set<() => void>();
  const getSnapshot = () => {
    if (!sessionOnly) {
      try {
        snapshot = JSON.stringify(
          parseFavourites(storage().getItem(FAVOURITES_STORAGE_KEY)),
        );
      } catch {
        sessionOnly = true;
      }
    }
    return snapshot;
  };
  const emit = () => {
    for (const listener of listeners) listener();
  };
  const toggle = (href: string) => {
    const current = parseFavourites(getSnapshot());
    snapshot = JSON.stringify(
      current.includes(href)
        ? current.filter((item) => item !== href)
        : [...current, href],
    );
    if (!sessionOnly) {
      try {
        storage().setItem(FAVOURITES_STORAGE_KEY, snapshot);
      } catch {
        sessionOnly = true;
      }
    }
    emit();
  };
  const storageChanged = (key: string | null) => {
    if (key !== null && key !== FAVOURITES_STORAGE_KEY) return;
    getSnapshot();
    emit();
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  return { getSnapshot, toggle, storageChanged, subscribe };
}
