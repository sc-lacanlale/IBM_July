import { createSignClassifier, type SignClassifier } from "./classifier";
import {
  CONFIDENCE_THRESHOLD,
  CONTINUOUS_CLASSIFY_MS,
  DEBUG_FRAME_EVENT_MS,
  DEFAULT_ASSETS_BASE,
  LANDMARK_TARGET_FPS,
  LIVE_PREVIEW_MS,
  MAX_SIGNS,
  MIN_GESTURE_FRAMES,
  MULTIVIEW_CROP_FRACTION,
  PRIOR_MIN_SAMPLES,
  SEQUENCE_LENGTH,
  TOP2_MARGIN,
} from "./config";
import { extractKeypoints, hasAnyHand } from "./features";
import { createHolisticTracker, type HolisticTracker } from "./landmarker";
import {
  clearStoredPriors,
  loadStoredPriors,
  PriorCalibrator,
  saveStoredPriors,
} from "./priors";
import { resampleToSequence, windowToSequence } from "./resample";
import { GestureSegmenter, type GestureSegment } from "./segmenter";
import { StableSignDetector } from "./stableSign";
import type {
  DebugEvent,
  FrameLandmarks,
  RecordedSign,
  SignPrediction,
  TranslatorStatus,
} from "./types";

/**
 * createFslTranslator - the library entry point.
 *
 * Owns the whole recognition pipeline: MediaPipe holistic landmarks -> 258-dim
 * features -> gesture segmentation -> scaled 30x258 sequence -> TFJS LSTM ->
 * thresholded, deduplicated sign events. Framework-free: feed it a
 * <video> element and subscribe to callbacks.
 *
 * Anti-guessing measures on each finished gesture:
 *  - three temporal views (full / head-cropped / tail-cropped) must agree on
 *    the same top-1 label; confidence + margin thresholds apply to the mean
 *    probabilities. Partial-sequence lock-ins do not survive cropping.
 *  - optional idle-prior correction (see priors.ts) discounts classes the
 *    model over-predicts on non-sign input; calibrate via setCalibrating().
 *
 * Modes:
 *  - "gesture" (default): motion-gated segmentation; each detected sign
 *    gesture is resampled to 30 frames exactly like the training clips.
 *  - "continuous": legacy desktop behavior (sliding 30-frame window +
 *    stability detector), kept for comparison/debugging.
 */
export interface FslTranslatorOptions {
  video: HTMLVideoElement;
  assetsBaseUrl?: string;
  wasmBaseUrl?: string;
  mode?: "gesture" | "continuous";
  targetFps?: number;
  confidenceThreshold?: number;
  onStatus?: (status: TranslatorStatus) => void;
  /** Latest landmarks every processed frame (for skeleton overlays). */
  onLandmarks?: (frame: FrameLandmarks) => void;
  /** Best current guess (live preview); null when idle / no hands. */
  onLiveSign?: (prediction: SignPrediction | null) => void;
  /** A sign was committed to the sentence. */
  onSignRecorded?: (sign: RecordedSign) => void;
  /** Full committed sign list changed (recorded or cleared). */
  onSignsChanged?: (signs: RecordedSign[]) => void;
  /** Instrumentation stream for the debug HUD / tooling. */
  onDebug?: (event: DebugEvent) => void;
  onError?: (error: Error) => void;
}

export interface FslTranslator {
  /** Load models (idempotent) and start the recognition loop. */
  start(): Promise<void>;
  /** Pause the recognition loop (models stay loaded). */
  stop(): void;
  /** Clear the committed sign sentence. */
  clearSigns(): void;
  /**
   * Toggle idle-prior calibration: while on, nothing is committed and every
   * classification is accumulated into the background prior; turning it off
   * computes, applies, and persists the prior (if enough samples).
   */
  setCalibrating(on: boolean): void;
  /** Clear the stored idle prior and disable correction. */
  resetPriors(): void;
  getClassPriors(): number[] | null;
  /** Most recent finished gesture segment (for debug download). */
  getLastSegment(): GestureSegment | null;
  readonly calibrating: boolean;
  readonly status: TranslatorStatus;
  readonly signs: readonly RecordedSign[];
  /** Stop and release the landmarker + TFJS model. */
  dispose(): void;
}

export function createFslTranslator(options: FslTranslatorOptions): FslTranslator {
  const {
    video,
    assetsBaseUrl = DEFAULT_ASSETS_BASE,
    wasmBaseUrl,
    mode = "gesture",
    targetFps = LANDMARK_TARGET_FPS,
    confidenceThreshold = CONFIDENCE_THRESHOLD,
    onStatus,
    onLandmarks,
    onLiveSign,
    onSignRecorded,
    onSignsChanged,
    onDebug,
    onError,
  } = options;

  let status: TranslatorStatus = "idle";
  let tracker: HolisticTracker | null = null;
  let classifier: SignClassifier | null = null;
  let rafId: number | null = null;
  let disposed = false;
  let running = false;

  const segmenter = new GestureSegmenter();
  const stableDetector = new StableSignDetector();
  const calibrator = new PriorCalibrator();
  const windowFrames: Float32Array[] = [];
  const signs: RecordedSign[] = [];

  let lastLoopTime = 0;
  let lastVideoTime = -1;
  let lastPreviewTime = 0;
  let lastContinuousTime = 0;
  let classifyBusy = false;
  let liveSignVisible = false;
  let calibrating = false;
  let priorSamples = 0;
  let lastSegment: GestureSegment | null = null;
  let lastDebugFrameTime = 0;
  let lastProcessedTime = 0;
  let fpsEma = 0;

  const frameInterval = 1000 / targetFps;

  function setStatus(next: TranslatorStatus) {
    if (status === next) return;
    status = next;
    onStatus?.(next);
  }

  function fail(err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.warn("[fsl/translator]", error);
    setStatus("error");
    onError?.(error);
  }

  function emitStateDebug() {
    if (!onDebug) return;
    onDebug({
      type: "state",
      atMs: performance.now(),
      calibrating,
      calibrationSamples: calibrating ? calibrator.samples : priorSamples,
      priorsActive: Boolean(classifier?.getClassPriors()),
      priors: classifier?.getClassPriors() ?? null,
    });
  }

  function emitClassificationDebug(
    kind: "segment" | "preview" | "continuous",
    prediction: SignPrediction,
    views: SignPrediction[] | null,
    agreed: boolean | null,
    committed: boolean,
    rejectReason: string | null,
    segment: GestureSegment | null
  ) {
    if (!onDebug) return;
    onDebug({
      type: "classification",
      atMs: performance.now(),
      kind,
      prediction,
      views,
      agreed,
      committed,
      rejectReason,
      segmentDurationMs: segment ? segment.endMs - segment.startMs : null,
      segmentFrameCount: segment ? segment.frames.length : null,
      segmentHandFraction: segment ? segment.handFraction : null,
    });
  }

  function emitFrameDebug(t: number, frame: FrameLandmarks, features: Float32Array) {
    if (!onDebug || t - lastDebugFrameTime < DEBUG_FRAME_EVENT_MS) return;
    lastDebugFrameTime = t;

    let poseVisibility: number | null = null;
    if (frame.pose && frame.pose.length > 0) {
      let sum = 0;
      for (const lm of frame.pose) sum += lm.visibility ?? 0;
      poseVisibility = sum / frame.pose.length;
    }

    onDebug({
      type: "frame",
      atMs: t,
      fps: fpsEma,
      phase: segmenter.currentPhase,
      handsPresent: hasAnyHand(frame),
      motionEma: segmenter.motion,
      poseVisibility,
      domainGap:
        classifier?.domainGap(
          features,
          Boolean(frame.pose),
          Boolean(frame.leftHand),
          Boolean(frame.rightHand)
        ) ?? null,
    });
  }

  async function ensureLoaded(): Promise<void> {
    if (tracker && classifier) return;
    setStatus("loading");
    const [t, c] = await Promise.all([
      createHolisticTracker({ assetsBaseUrl, wasmBaseUrl }),
      createSignClassifier({ assetsBaseUrl }),
    ]);
    if (disposed) {
      t.close();
      c.dispose();
      return;
    }
    tracker = t;
    classifier = c;

    const stored = loadStoredPriors(c.labels.actions);
    if (stored) {
      c.setClassPriors(stored.priors);
      priorSamples = stored.samples;
    }
    emitStateDebug();
    setStatus("ready");
  }

  function recordSign(prediction: SignPrediction, source: RecordedSign["source"]) {
    // No consecutive duplicates (desktop append_sign_no_spam).
    if (signs.length > 0 && signs[signs.length - 1].label === prediction.label) return;
    const recorded: RecordedSign = { ...prediction, atMs: performance.now(), source };
    signs.push(recorded);
    if (signs.length > MAX_SIGNS) signs.splice(0, signs.length - MAX_SIGNS);
    onSignRecorded?.(recorded);
    onSignsChanged?.([...signs]);
  }

  function emitLiveSign(prediction: SignPrediction | null) {
    if (prediction === null && !liveSignVisible) return;
    liveSignVisible = prediction !== null;
    onLiveSign?.(prediction);
  }

  /**
   * Multi-view agreement: classify the full segment plus head/tail-cropped
   * views. A real sign classifies consistently across crops; a partial-motion
   * lock-in (e.g. every hand-raise looking like a number sign) does not.
   */
  function classifyGesture(segment: GestureSegment) {
    if (!classifier || classifyBusy) return;
    classifyBusy = true;
    lastSegment = segment;

    const frames = segment.frames;
    const crop = Math.max(1, Math.floor(frames.length * MULTIVIEW_CROP_FRACTION));
    const viewFrames = [
      frames,
      frames.slice(crop),
      frames.slice(0, frames.length - crop),
    ];

    Promise.all(viewFrames.map((f) => classifier!.classify(resampleToSequence(f))))
      .then((views) => {
        const k = views[0].probs.length;
        const meanProbs = new Float32Array(k);
        const meanRaw = new Float32Array(k);
        for (const v of views) {
          for (let i = 0; i < k; i++) {
            meanProbs[i] += v.probs[i] / views.length;
            meanRaw[i] += v.rawProbs[i] / views.length;
          }
        }
        const prediction = classifier!.fromProbs(meanProbs, meanRaw);
        const agreed = views.every((v) => v.label === views[0].label);

        if (calibrating) {
          for (const v of views) calibrator.add(v.rawProbs);
          emitStateDebug();
          emitClassificationDebug("segment", prediction, views, agreed, false, "calibrating", segment);
          emitLiveSign(null);
          return;
        }

        let rejectReason: string | null = null;
        if (!agreed) rejectReason = "views disagree";
        else if (prediction.confidence < confidenceThreshold) rejectReason = "low confidence";
        else if (prediction.margin < TOP2_MARGIN) rejectReason = "ambiguous (margin)";

        if (!rejectReason) {
          recordSign(prediction, "gesture");
          emitLiveSign(prediction);
        } else {
          emitLiveSign(null);
        }
        emitClassificationDebug(
          "segment",
          prediction,
          views,
          agreed,
          !rejectReason,
          rejectReason,
          segment
        );
      })
      .catch(fail)
      .finally(() => {
        classifyBusy = false;
      });
  }

  function classifyPreview(frames: Float32Array[]) {
    if (!classifier || classifyBusy) return;
    classifyBusy = true;
    const flat = resampleToSequence(frames);
    classifier
      .classify(flat)
      .then((prediction) => {
        if (calibrating) {
          calibrator.add(prediction.rawProbs);
          emitStateDebug();
          emitClassificationDebug("preview", prediction, null, null, false, "calibrating", null);
          emitLiveSign(null);
          return;
        }
        // Preview is informational; show only reasonably confident guesses.
        emitLiveSign(prediction.confidence >= 0.4 ? prediction : null);
        emitClassificationDebug("preview", prediction, null, null, false, null, null);
      })
      .catch(() => {
        /* preview errors are non-fatal */
      })
      .finally(() => {
        classifyBusy = false;
      });
  }

  function classifyContinuous(nowMs: number) {
    if (!classifier || classifyBusy || windowFrames.length < SEQUENCE_LENGTH) return;
    classifyBusy = true;
    const flat = windowToSequence(windowFrames);
    classifier
      .classify(flat)
      .then((prediction) => {
        emitLiveSign(prediction.confidence >= 0.4 ? prediction : null);
        const stable = stableDetector.update(
          prediction.label,
          prediction.confidence,
          confidenceThreshold,
          nowMs
        );
        if (stable) recordSign(prediction, "continuous");
        emitClassificationDebug("continuous", prediction, null, null, Boolean(stable), null, null);
      })
      .catch(fail)
      .finally(() => {
        classifyBusy = false;
      });
  }

  function loop(t: number) {
    if (!running) return;
    rafId = requestAnimationFrame(loop);

    if (t - lastLoopTime < frameInterval) return;
    lastLoopTime = t;

    if (!tracker || video.readyState < 2 || video.videoWidth === 0) return;
    if (video.currentTime === lastVideoTime) return;
    lastVideoTime = video.currentTime;

    if (lastProcessedTime > 0) {
      const dt = t - lastProcessedTime;
      if (dt > 0) fpsEma = fpsEma === 0 ? 1000 / dt : fpsEma * 0.9 + (1000 / dt) * 0.1;
    }
    lastProcessedTime = t;

    let frame: FrameLandmarks;
    try {
      frame = tracker.detect(video, performance.now());
    } catch (err) {
      fail(err);
      stopLoop();
      return;
    }

    onLandmarks?.(frame);
    const features = extractKeypoints(frame);
    const handsPresent = hasAnyHand(frame);

    if (mode === "gesture") {
      const segment = segmenter.push(features, handsPresent, frame.timestampMs);
      emitFrameDebug(t, frame, features);
      if (segment) {
        classifyGesture(segment);
      } else if (segmenter.currentPhase === "recording") {
        const inProgress = segmenter.inProgressFrames;
        if (inProgress.length >= MIN_GESTURE_FRAMES && t - lastPreviewTime >= LIVE_PREVIEW_MS) {
          lastPreviewTime = t;
          classifyPreview(inProgress);
        }
      } else if (!handsPresent) {
        emitLiveSign(null);
      }
      return;
    }

    // continuous mode
    emitFrameDebug(t, frame, features);
    if (!handsPresent) {
      // Hand gating: never classify an empty scene (idle misfire fix).
      windowFrames.length = 0;
      stableDetector.reset();
      emitLiveSign(null);
      return;
    }
    windowFrames.push(features);
    if (windowFrames.length > SEQUENCE_LENGTH) windowFrames.shift();
    if (t - lastContinuousTime >= CONTINUOUS_CLASSIFY_MS) {
      lastContinuousTime = t;
      classifyContinuous(t);
    }
  }

  function stopLoop() {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  return {
    get status() {
      return status;
    },
    get signs(): readonly RecordedSign[] {
      return signs;
    },
    get calibrating() {
      return calibrating;
    },
    async start() {
      if (disposed) throw new Error("Translator is disposed");
      if (running) return;
      try {
        await ensureLoaded();
      } catch (err) {
        fail(err);
        throw err;
      }
      if (disposed) return;
      segmenter.reset();
      stableDetector.reset();
      windowFrames.length = 0;
      lastVideoTime = -1;
      running = true;
      setStatus("running");
      rafId = requestAnimationFrame(loop);
    },
    stop() {
      stopLoop();
      emitLiveSign(null);
      if (status === "running") setStatus("stopped");
    },
    clearSigns() {
      signs.length = 0;
      onSignsChanged?.([]);
    },
    setCalibrating(on: boolean) {
      if (on === calibrating) return;
      calibrating = on;
      if (on) {
        calibrator.reset();
        emitLiveSign(null);
      } else if (classifier && calibrator.samples >= PRIOR_MIN_SAMPLES) {
        const priors = calibrator.compute();
        if (priors) {
          classifier.setClassPriors(priors);
          priorSamples = calibrator.samples;
          saveStoredPriors({
            labels: classifier.labels.actions,
            priors,
            samples: calibrator.samples,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      emitStateDebug();
    },
    resetPriors() {
      clearStoredPriors();
      classifier?.setClassPriors(null);
      priorSamples = 0;
      emitStateDebug();
    },
    getClassPriors() {
      return classifier?.getClassPriors() ?? null;
    },
    getLastSegment() {
      return lastSegment;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stopLoop();
      tracker?.close();
      tracker = null;
      classifier?.dispose();
      classifier = null;
      setStatus("idle");
    },
  };
}
