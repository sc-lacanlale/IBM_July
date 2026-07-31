import type { LabelsData } from "./types";

/** Load the exported action keys + Tagalog display map (labels.json). */
export async function loadLabels(url: string): Promise<LabelsData> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load labels: ${url} (${res.status})`);
  const data = (await res.json()) as LabelsData;
  if (!Array.isArray(data.actions) || data.actions.length === 0) {
    throw new Error("labels.json has no actions");
  }
  return data;
}

/** Map a model key (e.g. "THANK_YOU") to its Tagalog display label. */
export function toTagalog(labels: LabelsData, key: string): string {
  if (!key) return "—";
  return labels.tagalog[key] ?? key.replace(/_/g, " ");
}
