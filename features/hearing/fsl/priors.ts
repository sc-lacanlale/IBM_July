import { PRIOR_UNIFORM_BLEND } from "./config";

/**
 * Idle-prior calibration.
 *
 * The model has no idle/negative class, so on non-sign input it must still
 * answer one of the 15 classes - and it systematically favors a few attractor
 * classes (e.g. SEVEN/"Pito"). Calibration measures that background prior:
 * the user moves their hands naturally WITHOUT signing while we average the
 * model's raw outputs. At runtime probabilities are divided by this prior and
 * renormalized, discounting each class by exactly how much it over-fires on
 * garbage. Persisted to localStorage per device/camera setup.
 */

const STORAGE_KEY = "tanaw:fsl.classPriors.v1";

export interface StoredPriors {
  labels: string[];
  priors: number[];
  samples: number;
  updatedAt: string;
}

export function loadStoredPriors(expectedLabels: string[]): StoredPriors | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredPriors;
    if (
      !Array.isArray(data.priors) ||
      !Array.isArray(data.labels) ||
      data.labels.length !== expectedLabels.length ||
      data.labels.some((l, i) => l !== expectedLabels[i])
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveStoredPriors(data: StoredPriors): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage full/blocked - non-fatal */
  }
}

export function clearStoredPriors(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Accumulates raw model outputs during a calibration session. */
export class PriorCalibrator {
  private sum: Float64Array | null = null;
  private n = 0;

  get samples(): number {
    return this.n;
  }

  reset(): void {
    this.sum = null;
    this.n = 0;
  }

  add(rawProbs: Float32Array): void {
    if (!this.sum) this.sum = new Float64Array(rawProbs.length);
    for (let i = 0; i < rawProbs.length; i++) this.sum[i] += rawProbs[i];
    this.n++;
  }

  /**
   * Mean measured prior, shrunk toward uniform so a single noisy session
   * cannot fully suppress a class. Returns null with no samples.
   */
  compute(uniformBlend: number = PRIOR_UNIFORM_BLEND): number[] | null {
    if (!this.sum || this.n === 0) return null;
    const k = this.sum.length;
    const uniform = 1 / k;
    const out = new Array<number>(k);
    let total = 0;
    for (let i = 0; i < k; i++) {
      const mean = this.sum[i] / this.n;
      out[i] = (1 - uniformBlend) * mean + uniformBlend * uniform;
      total += out[i];
    }
    if (total > 0) for (let i = 0; i < k; i++) out[i] /= total;
    return out;
  }
}
