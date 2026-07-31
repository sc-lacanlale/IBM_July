import { SIGN_COOLDOWN_MS, STABLE_SIGN_MS } from "./config";

/**
 * Time-based port of the desktop StableSignDetector: a sign is recorded when
 * the model holds the same confident label for STABLE_SIGN_MS, followed by a
 * cooldown. Used by the continuous (sliding-window) mode.
 */
export class StableSignDetector {
  private candidate: string | null = null;
  private candidateSince = 0;
  private cooldownUntil = 0;

  reset(): void {
    this.candidate = null;
    this.candidateSince = 0;
    this.cooldownUntil = 0;
  }

  update(
    label: string | null,
    confidence: number,
    threshold: number,
    nowMs: number
  ): string | null {
    if (nowMs < this.cooldownUntil) return null;

    if (!label || confidence < threshold) {
      this.candidate = null;
      return null;
    }

    if (label !== this.candidate) {
      this.candidate = label;
      this.candidateSince = nowMs;
      return null;
    }

    if (nowMs - this.candidateSince >= STABLE_SIGN_MS) {
      this.candidate = null;
      this.cooldownUntil = nowMs + SIGN_COOLDOWN_MS;
      return label;
    }
    return null;
  }
}
