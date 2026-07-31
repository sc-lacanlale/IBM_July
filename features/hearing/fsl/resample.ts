import { KEYPOINT_DIM, SEQUENCE_LENGTH } from "./config";

/**
 * Resample a variable-length gesture to exactly SEQUENCE_LENGTH frames using
 * the same scheme as training (video_to_sequence in the Colab notebook):
 *   - n >= 30: pick indices floor(linspace(0, n-1, 30))
 *   - n <  30: keep all frames, pad by repeating the last frame
 * Output is a flat Float32Array of length 30 * 258 (row-major).
 */
export function resampleToSequence(frames: Float32Array[]): Float32Array {
  const n = frames.length;
  if (n === 0) throw new Error("resampleToSequence: empty gesture");

  const out = new Float32Array(SEQUENCE_LENGTH * KEYPOINT_DIM);
  if (n >= SEQUENCE_LENGTH) {
    for (let j = 0; j < SEQUENCE_LENGTH; j++) {
      const idx = Math.trunc((j * (n - 1)) / (SEQUENCE_LENGTH - 1));
      out.set(frames[idx], j * KEYPOINT_DIM);
    }
  } else {
    for (let j = 0; j < n; j++) out.set(frames[j], j * KEYPOINT_DIM);
    for (let j = n; j < SEQUENCE_LENGTH; j++) out.set(frames[n - 1], j * KEYPOINT_DIM);
  }
  return out;
}

/** Flatten the most recent 30 frames of a ring buffer (continuous mode). */
export function windowToSequence(frames: Float32Array[]): Float32Array {
  if (frames.length < SEQUENCE_LENGTH) {
    throw new Error(`windowToSequence: need ${SEQUENCE_LENGTH} frames, got ${frames.length}`);
  }
  const out = new Float32Array(SEQUENCE_LENGTH * KEYPOINT_DIM);
  const start = frames.length - SEQUENCE_LENGTH;
  for (let j = 0; j < SEQUENCE_LENGTH; j++) {
    out.set(frames[start + j], j * KEYPOINT_DIM);
  }
  return out;
}
