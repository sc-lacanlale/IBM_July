import type { FrameLandmarks, LandmarkPoint } from "./types";

/**
 * Thin wrapper around MediaPipe Tasks HolisticLandmarker (web).
 *
 * Uses the same holistic_landmarker.task model file as the Python desktop app,
 * so landmark semantics (33 pose points with visibility + 21 points per hand)
 * match the training pipeline. Loaded lazily to keep the initial bundle small.
 */
/** Frame sources MediaPipe can consume (canvas enables mirrored replay). */
export type TrackerSource = HTMLVideoElement | HTMLCanvasElement;

export interface HolisticTracker {
  /** Detect landmarks for the current video/canvas frame. */
  detect(source: TrackerSource, timestampMs: number): FrameLandmarks;
  close(): void;
}

export interface HolisticTrackerOptions {
  /** Base URL that contains holistic_landmarker.task (default /models). */
  assetsBaseUrl?: string;
  /** Base URL for the MediaPipe WASM runtime (default /mediapipe/wasm). */
  wasmBaseUrl?: string;
}

/** Minimal structural view of the MediaPipe result (flat or per-person nested). */
type RawLandmark = { x: number; y: number; z: number; visibility?: number };
type RawLandmarkList = RawLandmark[] | RawLandmark[][] | undefined | null;

function firstPerson(list: RawLandmarkList): LandmarkPoint[] | null {
  if (!list || list.length === 0) return null;
  const first = list[0];
  const flat = Array.isArray(first) ? (first as RawLandmark[]) : (list as RawLandmark[]);
  if (!flat || flat.length === 0) return null;
  return flat as LandmarkPoint[];
}

export async function createHolisticTracker(
  options: HolisticTrackerOptions = {}
): Promise<HolisticTracker> {
  const assetsBase = options.assetsBaseUrl ?? "/models";
  const wasmBase = options.wasmBaseUrl ?? "/wasm";

  const vision = await import("@mediapipe/tasks-vision");
  const { FilesetResolver, HolisticLandmarker } = vision as unknown as {
    FilesetResolver: { forVisionTasks(base: string): Promise<unknown> };
    HolisticLandmarker: {
      createFromOptions(fileset: unknown, opts: unknown): Promise<{
        detectForVideo(source: TrackerSource, timestampMs: number): {
          poseLandmarks?: RawLandmarkList;
          leftHandLandmarks?: RawLandmarkList;
          rightHandLandmarks?: RawLandmarkList;
          faceLandmarks?: RawLandmarkList;
        };
        close(): void;
      }>;
    };
  };

  if (!HolisticLandmarker) {
    throw new Error(
      "@mediapipe/tasks-vision does not export HolisticLandmarker in this version"
    );
  }

  const fileset = await FilesetResolver.forVisionTasks(wasmBase);

  async function build(delegate: "GPU" | "CPU") {
    return HolisticLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: `${assetsBase}/holistic_landmarker.task`,
        delegate,
      },
      runningMode: "VIDEO",
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minHandLandmarksConfidence: 0.5,
    });
  }

  let landmarker;
  try {
    landmarker = await build("GPU");
  } catch (err) {
    console.warn("[fsl/landmarker] GPU delegate failed, falling back to CPU:", err);
    landmarker = await build("CPU");
  }

  let lastTimestamp = -1;

  return {
    detect(source: TrackerSource, timestampMs: number): FrameLandmarks {
      // MediaPipe VIDEO mode requires strictly increasing timestamps.
      const ts = timestampMs <= lastTimestamp ? lastTimestamp + 1 : Math.round(timestampMs);
      lastTimestamp = ts;
      const result = landmarker.detectForVideo(source, ts);
      return {
        pose: firstPerson(result.poseLandmarks),
        leftHand: firstPerson(result.leftHandLandmarks),
        rightHand: firstPerson(result.rightHandLandmarks),
        face: firstPerson(result.faceLandmarks),
        timestampMs: ts,
      };
    },
    close() {
      landmarker.close();
    },
  };
}
