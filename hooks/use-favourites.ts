"use client"

import { useSyncExternalStore, useCallback } from "react"

const STORAGE_KEY = "toolkit-favourites"

type FavouritesStore = {
  favourites: Set<string>
  toggleFavourite: (href: string) => void
  isFavourite: (href: string) => boolean
}

let listeners: Array<() => void> = []

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function readFavourites(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === "string")
  } catch {
    return []
  }
}

function writeFavourites(hrefs: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hrefs))
  emitChange()
}

/**
 * A snapshot string that changes whenever favourites change.
 * `useSyncExternalStore` compares snapshots by reference, so we
 * return a serialised string and parse it in the selector.
 */
function getSnapshot(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "[]"
}

function getServerSnapshot(): string {
  return "[]"
}

function subscribe(callback: () => void): () => void {
  listeners.push(callback)

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) emitChange()
  }
  window.addEventListener("storage", handleStorage)

  return () => {
    listeners = listeners.filter((l) => l !== callback)
    window.removeEventListener("storage", handleStorage)
  }
}

/**
 * SSR-safe hook for managing favourite tools in localStorage.
 * Uses `useSyncExternalStore` so the component re-renders when
 * favourites change — including across browser tabs.
 */
export function useFavourites(): FavouritesStore {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const favourites = new Set<string>(JSON.parse(raw) as string[])

  const toggleFavourite = useCallback((href: string) => {
    const current = readFavourites()
    const next = current.includes(href)
      ? current.filter((h) => h !== href)
      : [...current, href]
    writeFavourites(next)
  }, [])

  const isFavourite = useCallback(
    (href: string) => favourites.has(href),
    [favourites],
  )

  return { favourites, toggleFavourite, isFavourite }
}
