/**
 * TANAW FSL recognition library (on-device Holistic → LSTM).
 *
 *   import { createFslTranslator } from "@/features/hearing/fsl";
 */

export * from "./types";
export * from "./config";
export { extractKeypoints, hasAnyHand, motionBetween } from "./features";
export { resampleToSequence, windowToSequence } from "./resample";
export { loadScaler, type Scaler } from "./scaler";
export { loadLabels, toTagalog } from "./labels";
export {
  createHolisticTracker,
  type HolisticTracker,
  type HolisticTrackerOptions,
} from "./landmarker";
export {
  createSignClassifier,
  type SignClassifier,
  type ClassifierOptions,
} from "./classifier";
export {
  GestureSegmenter,
  type GestureSegment,
  type SegmenterPhase,
} from "./segmenter";
export { StableSignDetector } from "./stableSign";
export {
  PriorCalibrator,
  loadStoredPriors,
  saveStoredPriors,
  clearStoredPriors,
  type StoredPriors,
} from "./priors";
export {
  createFslTranslator,
  type FslTranslator,
  type FslTranslatorOptions,
} from "./translator";
export { SEMANTIC_DEBOUNCE_MS } from "./config";
export { createDebouncedInterpreter, fallbackJoin } from "./semantic";
