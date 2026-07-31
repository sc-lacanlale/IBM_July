/**
 * TANAW FSL recognition tuning.
 *
 * Frame-count constants are converted to milliseconds so behavior
 * is frame-rate independent in the browser.
 */

/** Model input: 30 timesteps x 258 features (pose 33x4 + 21x3 per hand). */
export const SEQUENCE_LENGTH = 30;
export const KEYPOINT_DIM = 258;

export const POSE_LANDMARK_COUNT = 33;
export const HAND_LANDMARK_COUNT = 21;
export const POSE_DIM = POSE_LANDMARK_COUNT * 4; // x, y, z, visibility
export const HAND_DIM = HAND_LANDMARK_COUNT * 3; // x, y, z
export const LEFT_HAND_OFFSET = POSE_DIM;
export const RIGHT_HAND_OFFSET = POSE_DIM + HAND_DIM;

/** Desktop: PREDICTION_CONFIDENCE_THRESHOLD = 0.70 */
export const CONFIDENCE_THRESHOLD = 0.7;
/** Reject ambiguous predictions where top-1 and top-2 are too close. */
export const TOP2_MARGIN = 0.15;

/** Landmark detection budget (time-gated requestAnimationFrame). */
export const LANDMARK_TARGET_FPS = 30;

/** Continuous mode - desktop: STABLE_FRAMES_TO_RECORD = 10 (~330 ms @30fps). */
export const STABLE_SIGN_MS = 330;
/** Desktop: SIGN_COOLDOWN_FRAMES = 12 (~400 ms @30fps). */
export const SIGN_COOLDOWN_MS = 400;
/** Continuous mode classification interval (desktop ran every 2nd frame). */
export const CONTINUOUS_CLASSIFY_MS = 66;

/** Gesture segmentation (matches training: whole sign resampled to 30 frames). */
export const MOTION_START_THRESHOLD = 0.007;
export const MOTION_END_THRESHOLD = 0.004;
/**
 * Hand stillness this long ends the gesture. Deliberately long: training clips
 * sample the WHOLE video, so for static signs (the numbers) the held handshape
 * dominates the training sequence. Keeping ~0.9s of hold in the live segment
 * matches that distribution instead of sending only the raise/onset motion.
 */
export const GESTURE_STILL_END_MS = 900;
/** Hands out of frame this long ends the gesture. */
export const HANDS_GONE_END_MS = 300;
export const MIN_GESTURE_MS = 350;
export const MAX_GESTURE_MS = 4000;
export const MIN_GESTURE_FRAMES = 10;
/** Frames kept from just before motion started (neutral lead-in, like clips). */
export const PREROLL_FRAMES = 8;
/** Segments with hands visible in fewer frames than this are rejected. */
export const MIN_HAND_FRACTION = 0.7;
/** Live feedback classification interval while a gesture is in progress. */
export const LIVE_PREVIEW_MS = 250;

/** Multi-view agreement: fraction cropped from head/tail for the extra views. */
export const MULTIVIEW_CROP_FRACTION = 0.2;

/** Idle-prior calibration: blend measured prior with uniform (shrinkage). */
export const PRIOR_UNIFORM_BLEND = 0.3;
/** Minimum classifications collected before a calibration run is accepted. */
export const PRIOR_MIN_SAMPLES = 5;

/** Debug HUD frame-stats emission interval. */
export const DEBUG_FRAME_EVENT_MS = 200;

/** Desktop: MAX_LIVE_SIGNS = 20. */
export const MAX_SIGNS = 20;
/** Desktop: GEMINI_DEBOUNCE_SEC = 0.8. */
export const SEMANTIC_DEBOUNCE_MS = 800;

/** Default location of exported model assets under public/. */
export const DEFAULT_ASSETS_BASE = "/models";
