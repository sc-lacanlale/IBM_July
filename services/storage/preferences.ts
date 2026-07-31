"use client";

import { Capacitor } from "@capacitor/core";

const PREFIX = "tanaw:";

async function nativeGet(key: string): Promise<string | null> {
  const { Preferences } = await import("@capacitor/preferences");
  const { value } = await Preferences.get({ key: PREFIX + key });
  return value;
}

async function nativeSet(key: string, value: string): Promise<void> {
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.set({ key: PREFIX + key, value });
}

async function nativeRemove(key: string): Promise<void> {
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.remove({ key: PREFIX + key });
}

function webGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PREFIX + key);
}

function webSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFIX + key, value);
}

function webRemove(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PREFIX + key);
}

export async function getItem(key: string): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      return await nativeGet(key);
    } catch {
      return webGet(key);
    }
  }
  return webGet(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await nativeSet(key, value);
      return;
    } catch {
      /* fall through */
    }
  }
  webSet(key, value);
}

export async function removeItem(key: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await nativeRemove(key);
      return;
    } catch {
      /* fall through */
    }
  }
  webRemove(key);
}

export async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setJson(key: string, value: unknown): Promise<void> {
  await setItem(key, JSON.stringify(value));
}

/** Sync helpers for hot paths that already ran on the client (face descriptors). */
export function getJsonSync<T>(key: string, fallback: T): T {
  try {
    const raw = webGet(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJsonSync(key: string, value: unknown): void {
  webSet(key, JSON.stringify(value));
}
