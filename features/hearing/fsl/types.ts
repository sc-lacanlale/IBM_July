/** Shared types for the TANAW FSL recognition library (framework-free). */

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/** One camera frame's holistic landmarks (normalized 0..1 image coordinates). */
export interface FrameLandmarks {
  pose: LandmarkPoint[] | null;
  leftHand: LandmarkPoint[] | null;
  rightHand: LandmarkPoint[] | null;
  face: LandmarkPoint[] | null;
  timestampMs: number;
}

export interface SignCandidate {
  label: string;
  tagalog: string;
  confidence: number;
}

export interface SignPrediction {
  /** Model key, e.g. "THANK_YOU". */
  label: string;
  /** Tagalog display label, e.g. "Salamat". */
  tagalog: string;
  confidence: number;
  /** Margin between top-1 and top-2 probabilities. */
  margin: number;
  /** Class-prior-adjusted probabilities (equals rawProbs when no priors set). */
  probs: Float32Array;
  /** Raw model softmax output, before prior correction. */
  rawProbs: Float32Array;
  /** Top-5 candidates by adjusted probability. */
  top: SignCandidate[];
}

export interface RecordedSign extends SignPrediction {
  atMs: number;
  /** How the sign was committed. */
  source: "gesture" | "continuous";
}

export type TranslatorStatus =
  | "idle"
  | "loading"
  | "ready"
  | "running"
  | "stopped"
  | "error";

export interface LabelsData {
  actions: string[];
  tagalog: Record<string, string>;
}

/* ---------- Debug instrumentation (HUD / tooling) ---------- */

export interface DebugFrameEvent {
  type: "frame";
  atMs: number;
  fps: number;
  phase: "idle" | "recording";
  handsPresent: boolean;
  /** Smoothed hand-motion metric (compare against start/end thresholds). */
  motionEma: number;
  /** Mean pose landmark visibility (null when no pose tracked). */
  poseVisibility: number | null;
  /** Mean |z-score| of live features vs the training scaler; high = OOD. */
  domainGap: number | null;
}

export interface DebugClassificationEvent {
  type: "classification";
  atMs: number;
  kind: "segment" | "preview" | "continuous";
  /** Final (mean, prior-adjusted) prediction. */
  prediction: SignPrediction;
  /** Per-view predictions for multi-view segment classification. */
  views: SignPrediction[] | null;
  agreed: boolean | null;
  committed: boolean;
  rejectReason: string | null;
  segmentDurationMs: number | null;
  segmentFrameCount: number | null;
  segmentHandFraction: number | null;
}

export interface DebugStateEvent {
  type: "state";
  atMs: number;
  calibrating: boolean;
  calibrationSamples: number;
  priorsActive: boolean;
  priors: number[] | null;
}

export type DebugEvent = DebugFrameEvent | DebugClassificationEvent | DebugStateEvent;
