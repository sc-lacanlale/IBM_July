import { createHolisticTracker, type HolisticTracker } from "@/features/hearing/fsl/landmarker";
import type { FrameLandmarks } from "@/features/hearing/fsl/types";

const DEFAULT_FPS = 24;

export interface HolisticBonesLoop {
  stop(): void;
}

export async function startHolisticBonesLoop(options: {
  video: HTMLVideoElement;
  onFrame: (frame: FrameLandmarks) => void;
  onStatus?: (status: "loading" | "ready" | "error") => void;
  targetFps?: number;
}): Promise<HolisticBonesLoop> {
  const { video, onFrame, onStatus, targetFps = DEFAULT_FPS } = options;
  let tracker: HolisticTracker | null = null;
  let rafId = 0;
  let stopped = false;
  let lastTick = 0;
  const frameMs = 1000 / targetFps;

  onStatus?.("loading");
  try {
    tracker = await createHolisticTracker();
    onStatus?.("ready");
  } catch (err) {
    onStatus?.("error");
    throw err;
  }

  const tick = (now: number) => {
    if (stopped) return;
    rafId = requestAnimationFrame(tick);
    if (now - lastTick < frameMs) return;
    lastTick = now;
    if (video.readyState < 2 || video.videoWidth === 0) return;
    try {
      const frame = tracker!.detect(video, performance.now());
      onFrame(frame);
    } catch {
      /* skip bad frame */
    }
  };

  rafId = requestAnimationFrame(tick);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(rafId);
      tracker?.close();
      tracker = null;
    },
  };
}
