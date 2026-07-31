import type { ModeId } from "./modes";

const KEY = "tanaw:lastMode";
const DEFAULT: ModeId = "outdoor";

export function getLastMode(): ModeId {
  if (typeof window === "undefined") return DEFAULT;
  const v = window.localStorage.getItem(KEY) as ModeId | null;
  return v ?? DEFAULT;
}

export function setLastMode(id: ModeId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
}
