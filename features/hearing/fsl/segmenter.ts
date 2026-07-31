import {
  GESTURE_STILL_END_MS,
  HANDS_GONE_END_MS,
  MAX_GESTURE_MS,
  MIN_GESTURE_FRAMES,
  MIN_GESTURE_MS,
  MIN_HAND_FRACTION,
  MOTION_END_THRESHOLD,
  MOTION_START_THRESHOLD,
  PREROLL_FRAMES,
} from "./config";
import { motionBetween } from "./features";

/**
 * Motion-gated gesture segmentation.
 *
 * The model was trained on whole signs uniformly resampled to 30 frames, not
 * on raw sliding windows. This state machine detects when a sign starts
 * (hands present + movement) and ends (stillness, hands leaving, or timeout),
 * so the captured segment can be resampled exactly like the training clips.
 * It also kills idle misfires: no hands -> no classification at all.
 */

export interface GestureSegment {
  frames: Float32Array[];
  startMs: number;
  endMs: number;
  /** Fraction of frames in which at least one hand was tracked. */
  handFraction: number;
}

export type SegmenterPhase = "idle" | "recording";

interface TimedFrame {
  t: number;
  feat: Float32Array;
  hands: boolean;
}

export class GestureSegmenter {
  private phase: SegmenterPhase = "idle";
  private preroll: TimedFrame[] = [];
  private recording: TimedFrame[] = [];
  private prevFeat: Float32Array | null = null;
  private motionEma = 0;
  private stillSince: number | null = null;
  private handsGoneSince: number | null = null;
  private motionStreak = 0;

  get currentPhase(): SegmenterPhase {
    return this.phase;
  }

  /** Smoothed motion metric (for the debug HUD). */
  get motion(): number {
    return this.motionEma;
  }

  /** Frames captured so far in the in-progress gesture (for live preview). */
  get inProgressFrames(): Float32Array[] {
    return this.recording.map((f) => f.feat);
  }

  reset(): void {
    this.phase = "idle";
    this.preroll = [];
    this.recording = [];
    this.prevFeat = null;
    this.motionEma = 0;
    this.stillSince = null;
    this.handsGoneSince = null;
    this.motionStreak = 0;
  }

  /**
   * Feed one frame; returns a completed gesture segment when one just ended,
   * otherwise null.
   */
  push(feat: Float32Array, handsPresent: boolean, timestampMs: number): GestureSegment | null {
    const rawMotion = this.prevFeat ? motionBetween(this.prevFeat, feat) : 0;
    this.prevFeat = feat;
    this.motionEma = this.motionEma === 0 ? rawMotion : 0.5 * this.motionEma + 0.5 * rawMotion;

    if (this.phase === "idle") {
      this.pushPreroll({ t: timestampMs, feat, hands: handsPresent });
      if (handsPresent && this.motionEma >= MOTION_START_THRESHOLD) {
        this.motionStreak++;
      } else {
        this.motionStreak = 0;
      }
      if (this.motionStreak >= 2) {
        this.phase = "recording";
        this.recording = [...this.preroll];
        this.stillSince = null;
        this.handsGoneSince = null;
        this.motionStreak = 0;
      }
      return null;
    }

    // recording
    this.recording.push({ t: timestampMs, feat, hands: handsPresent });

    if (handsPresent) {
      this.handsGoneSince = null;
    } else if (this.handsGoneSince === null) {
      this.handsGoneSince = timestampMs;
    }

    if (this.motionEma < MOTION_END_THRESHOLD) {
      if (this.stillSince === null) this.stillSince = timestampMs;
    } else {
      this.stillSince = null;
    }

    const startMs = this.recording[0].t;
    const duration = timestampMs - startMs;
    const stillFor = this.stillSince !== null ? timestampMs - this.stillSince : 0;
    const handsGoneFor = this.handsGoneSince !== null ? timestampMs - this.handsGoneSince : 0;

    const ended =
      duration >= MAX_GESTURE_MS ||
      handsGoneFor >= HANDS_GONE_END_MS ||
      (duration >= MIN_GESTURE_MS && stillFor >= GESTURE_STILL_END_MS);

    if (!ended) return null;

    const segment = this.finalize();
    this.phase = "idle";
    this.recording = [];
    this.stillSince = null;
    this.handsGoneSince = null;
    return segment;
  }

  private finalize(): GestureSegment | null {
    // Drop trailing frames where the hands were already gone.
    let end = this.recording.length;
    while (end > 0 && !this.recording[end - 1].hands) end--;
    const frames = this.recording.slice(0, end);

    if (frames.length < MIN_GESTURE_FRAMES) return null;
    const startMs = frames[0].t;
    const endMs = frames[frames.length - 1].t;
    if (endMs - startMs < MIN_GESTURE_MS) return null;

    // Quality gate: a real sign keeps hands in frame; flickery tracking or
    // partial captures produce garbage sequences the model can only guess at.
    const handFraction = frames.filter((f) => f.hands).length / frames.length;
    if (handFraction < MIN_HAND_FRACTION) return null;

    return { frames: frames.map((f) => f.feat), startMs, endMs, handFraction };
  }

  private pushPreroll(frame: TimedFrame): void {
    this.preroll.push(frame);
    if (this.preroll.length > PREROLL_FRAMES) this.preroll.shift();
  }
}
