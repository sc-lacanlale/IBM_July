"use client";

import { getJson, setJson } from "./preferences";

export interface TaughtObject {
  id: string;
  name: string;
  note?: string;
  createdAt: number;
}

export interface SpatialAnchor {
  id: string;
  label: string;
  note?: string;
  createdAt: number;
}

const OBJECTS_KEY = "objects";
const ANCHORS_KEY = "anchors";

export async function listObjects(): Promise<TaughtObject[]> {
  return getJson<TaughtObject[]>(OBJECTS_KEY, []);
}

export async function saveObject(obj: Omit<TaughtObject, "id" | "createdAt">): Promise<TaughtObject> {
  const list = await listObjects();
  const entry: TaughtObject = {
    ...obj,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  list.unshift(entry);
  await setJson(OBJECTS_KEY, list);
  return entry;
}

export async function removeObject(id: string): Promise<void> {
  const list = await listObjects();
  await setJson(
    OBJECTS_KEY,
    list.filter((o) => o.id !== id),
  );
}

export async function listAnchors(): Promise<SpatialAnchor[]> {
  return getJson<SpatialAnchor[]>(ANCHORS_KEY, []);
}

export async function saveAnchor(
  anchor: Omit<SpatialAnchor, "id" | "createdAt">,
): Promise<SpatialAnchor> {
  const list = await listAnchors();
  const entry: SpatialAnchor = {
    ...anchor,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  list.unshift(entry);
  await setJson(ANCHORS_KEY, list);
  return entry;
}

export async function removeAnchor(id: string): Promise<void> {
  const list = await listAnchors();
  await setJson(
    ANCHORS_KEY,
    list.filter((a) => a.id !== id),
  );
}
