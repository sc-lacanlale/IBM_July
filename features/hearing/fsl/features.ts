import {
  HAND_DIM,
  HAND_LANDMARK_COUNT,
  KEYPOINT_DIM,
  LEFT_HAND_OFFSET,
  POSE_LANDMARK_COUNT,
  RIGHT_HAND_OFFSET,
} from "./config";
import type { FrameLandmarks } from "./types";

/**
 * 258-dim feature vector, byte-for-byte compatible with the training pipeline
 * and the desktop app (fsl_landmarks.extract_keypoints_from_arrays):
 *   pose  33 x (x, y, z, visibility) -> 132
 *   left  21 x (x, y, z)             ->  63
 *   right 21 x (x, y, z)             ->  63
 * Missing parts stay zero.
 */
export function extractKeypoints(frame: FrameLandmarks): Float32Array {
  const out = new Float32Array(KEYPOINT_DIM);

  if (frame.pose) {
    const n = Math.min(frame.pose.length, POSE_LANDMARK_COUNT);
    for (let i = 0; i < n; i++) {
      const lm = frame.pose[i];
      const o = i * 4;
      out[o] = lm.x;
      out[o + 1] = lm.y;
      out[o + 2] = lm.z;
      out[o + 3] = lm.visibility ?? 0;
    }
  }

  if (frame.leftHand) {
    const n = Math.min(frame.leftHand.length, HAND_LANDMARK_COUNT);
    for (let i = 0; i < n; i++) {
      const lm = frame.leftHand[i];
      const o = LEFT_HAND_OFFSET + i * 3;
      out[o] = lm.x;
      out[o + 1] = lm.y;
      out[o + 2] = lm.z;
    }
  }

  if (frame.rightHand) {
    const n = Math.min(frame.rightHand.length, HAND_LANDMARK_COUNT);
    for (let i = 0; i < n; i++) {
      const lm = frame.rightHand[i];
      const o = RIGHT_HAND_OFFSET + i * 3;
      out[o] = lm.x;
      out[o + 1] = lm.y;
      out[o + 2] = lm.z;
    }
  }

  return out;
}

export function hasAnyHand(frame: FrameLandmarks): boolean {
  return Boolean(
    (frame.leftHand && frame.leftHand.length > 0) ||
      (frame.rightHand && frame.rightHand.length > 0)
  );
}

/**
 * Mean absolute per-coordinate movement between two feature vectors, measured
 * on the hand blocks (falling back to pose wrists when hands are missing).
 * Used by the gesture segmenter as a cheap motion signal.
 */
export function motionBetween(prev: Float32Array, curr: Float32Array): number {
  let sum = 0;
  let count = 0;

  for (let o = LEFT_HAND_OFFSET; o < RIGHT_HAND_OFFSET + HAND_DIM; o++) {
    const a = prev[o];
    const b = curr[o];
    // Skip dims where either frame lacks the hand (all-zero block).
    if (a === 0 && b === 0) continue;
    sum += Math.abs(b - a);
    count++;
  }

  if (count >= 6) return sum / count;

  // Fallback: pose wrists (landmarks 15 and 16), x/y only.
  sum = 0;
  count = 0;
  for (const idx of [15, 16]) {
    const o = idx * 4;
    for (let d = 0; d < 2; d++) {
      const a = prev[o + d];
      const b = curr[o + d];
      if (a === 0 && b === 0) continue;
      sum += Math.abs(b - a);
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}
