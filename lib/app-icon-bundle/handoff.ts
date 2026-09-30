import { APP_ICON_HANDOFF_KEY } from "./targets";
import type { IconBundleHandoff } from "./types";

export function storeIconBundleHandoff(handoff: IconBundleHandoff): void {
  sessionStorage.setItem(APP_ICON_HANDOFF_KEY, JSON.stringify(handoff));
}

export function takeIconBundleHandoff(): IconBundleHandoff | null {
  const stored = sessionStorage.getItem(APP_ICON_HANDOFF_KEY);
  if (!stored) return null;

  sessionStorage.removeItem(APP_ICON_HANDOFF_KEY);
  const parsed = JSON.parse(stored) as IconBundleHandoff;
  if (typeof parsed.filename !== "string" || typeof parsed.svg !== "string") {
    return null;
  }
  return parsed;
}
