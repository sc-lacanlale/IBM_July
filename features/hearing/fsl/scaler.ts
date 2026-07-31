import { KEYPOINT_DIM } from "./config";

/**
 * StandardScaler exported from training (scaler.json: mean/scale per feature).
 * Applied per frame across the flattened (30, 258) sequence, exactly like
 * `scaler.transform(seq.reshape(-1, 258))` in the desktop app.
 */
export interface Scaler {
  /** Scale a flat (frames * 258) sequence in place and return it. */
  apply(flat: Float32Array): Float32Array;
  /**
   * Mean |z-score| of a single 258-dim feature vector over the given dim
   * ranges. Used as a domain-gap indicator: large values mean the live input
   * is far from the training distribution (framing/distance mismatch).
   */
  meanAbsZ(vec: Float32Array, ranges: ReadonlyArray<readonly [number, number]>): number;
}

interface ScalerJson {
  mean: number[];
  scale: number[];
  dim: number;
}

export async function loadScaler(url: string): Promise<Scaler> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load scaler: ${url} (${res.status})`);
  const data = (await res.json()) as ScalerJson;
  if (data.dim !== KEYPOINT_DIM || data.mean.length !== KEYPOINT_DIM) {
    throw new Error(`Scaler dim mismatch: expected ${KEYPOINT_DIM}, got ${data.mean.length}`);
  }

  const mean = Float32Array.from(data.mean);
  const invScale = Float32Array.from(data.scale, (s) => (s !== 0 ? 1 / s : 0));

  return {
    apply(flat: Float32Array): Float32Array {
      for (let i = 0; i < flat.length; i++) {
        const d = i % KEYPOINT_DIM;
        flat[i] = (flat[i] - mean[d]) * invScale[d];
      }
      return flat;
    },
    meanAbsZ(vec: Float32Array, ranges: ReadonlyArray<readonly [number, number]>): number {
      let sum = 0;
      let count = 0;
      for (const [start, end] of ranges) {
        for (let d = start; d < end && d < KEYPOINT_DIM; d++) {
          sum += Math.abs((vec[d] - mean[d]) * invScale[d]);
          count++;
        }
      }
      return count > 0 ? sum / count : 0;
    },
  };
}
