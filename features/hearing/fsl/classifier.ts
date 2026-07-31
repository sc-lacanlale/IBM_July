import {
  KEYPOINT_DIM,
  LEFT_HAND_OFFSET,
  RIGHT_HAND_OFFSET,
  SEQUENCE_LENGTH,
} from "./config";
import { loadLabels, toTagalog } from "./labels";
import { loadScaler, type Scaler } from "./scaler";
import type { LabelsData, SignCandidate, SignPrediction } from "./types";

/**
 * TFJS Layers-model classifier for the 15-sign LSTM.
 *
 * Input: flat (30 * 258) raw feature sequence; the scaler is applied here so
 * callers never worry about normalization. Supports class-prior correction
 * (see priors.ts): adjusted = raw / prior, renormalized. Single-flight by
 * design: classify() calls are serialized internally.
 */
export interface SignClassifier {
  classify(flatSequence: Float32Array): Promise<SignPrediction>;
  /** Build a prediction from (already adjusted) probabilities, e.g. a multi-view mean. */
  fromProbs(probs: Float32Array, rawProbs: Float32Array): SignPrediction;
  setClassPriors(priors: readonly number[] | null): void;
  getClassPriors(): number[] | null;
  /**
   * Mean |z| of one feature vector vs the training scaler, over the parts
   * that are actually present. High values = live input far from training
   * distribution (framing/distance/aspect mismatch).
   */
  domainGap(
    features: Float32Array,
    posePresent: boolean,
    leftHandPresent: boolean,
    rightHandPresent: boolean
  ): number | null;
  readonly labels: LabelsData;
  dispose(): void;
}

type TfModule = typeof import("@tensorflow/tfjs");

export interface ClassifierOptions {
  /** Base URL containing fsl15/ (default /models). */
  assetsBaseUrl?: string;
}

const PRIOR_FLOOR = 0.005;

export async function createSignClassifier(
  options: ClassifierOptions = {}
): Promise<SignClassifier> {
  const base = `${options.assetsBaseUrl ?? "/models"}/fsl15`;

  const tf: TfModule = await import("@tensorflow/tfjs");
  try {
    await tf.setBackend("webgl");
  } catch {
    /* fall through to default backend */
  }
  await tf.ready();

  const [model, scaler, labels] = await Promise.all([
    tf.loadLayersModel(`${base}/model.json`),
    loadScaler(`${base}/scaler.json`) as Promise<Scaler>,
    loadLabels(`${base}/labels.json`),
  ]);

  // Warmup so the first real classification is not slow (shader compilation).
  {
    const warm = tf.zeros([1, SEQUENCE_LENGTH, KEYPOINT_DIM]);
    const out = model.predict(warm) as { data(): Promise<unknown>; dispose(): void };
    await out.data();
    out.dispose();
    warm.dispose();
  }

  let priors: Float32Array | null = null;

  function adjustForPriors(raw: Float32Array): Float32Array {
    if (!priors) return raw;
    const out = new Float32Array(raw.length);
    let sum = 0;
    for (let i = 0; i < raw.length; i++) {
      out[i] = raw[i] / Math.max(priors[i], PRIOR_FLOOR);
      sum += out[i];
    }
    if (sum > 0) for (let i = 0; i < out.length; i++) out[i] /= sum;
    return out;
  }

  function buildPrediction(adjusted: Float32Array, raw: Float32Array): SignPrediction {
    const order = Array.from(adjusted.keys()).sort((a, b) => adjusted[b] - adjusted[a]);
    const best = order[0];
    const label = labels.actions[best] ?? `#${best}`;
    const top: SignCandidate[] = order.slice(0, 5).map((i) => {
      const key = labels.actions[i] ?? `#${i}`;
      return { label: key, tagalog: toTagalog(labels, key), confidence: adjusted[i] };
    });
    return {
      label,
      tagalog: toTagalog(labels, label),
      confidence: adjusted[best],
      margin: order.length > 1 ? adjusted[best] - adjusted[order[1]] : adjusted[best],
      probs: adjusted,
      rawProbs: raw,
      top,
    };
  }

  let pending: Promise<unknown> = Promise.resolve();

  async function run(flatSequence: Float32Array): Promise<SignPrediction> {
    if (flatSequence.length !== SEQUENCE_LENGTH * KEYPOINT_DIM) {
      throw new Error(
        `classify: expected ${SEQUENCE_LENGTH * KEYPOINT_DIM} values, got ${flatSequence.length}`
      );
    }
    const scaled = scaler.apply(flatSequence);
    const input = tf.tensor3d(scaled, [1, SEQUENCE_LENGTH, KEYPOINT_DIM]);
    const output = model.predict(input) as {
      data(): Promise<Float32Array>;
      dispose(): void;
    };
    const raw = new Float32Array(await output.data());
    input.dispose();
    output.dispose();
    return buildPrediction(adjustForPriors(raw), raw);
  }

  return {
    labels,
    classify(flatSequence: Float32Array): Promise<SignPrediction> {
      // Serialize classifications (single-flight queue).
      const next = pending.then(
        () => run(flatSequence),
        () => run(flatSequence)
      );
      pending = next;
      return next;
    },
    fromProbs(probs: Float32Array, rawProbs: Float32Array): SignPrediction {
      return buildPrediction(probs, rawProbs);
    },
    setClassPriors(next: readonly number[] | null): void {
      priors = next && next.length === labels.actions.length ? Float32Array.from(next) : null;
    },
    getClassPriors(): number[] | null {
      return priors ? Array.from(priors) : null;
    },
    domainGap(
      features: Float32Array,
      posePresent: boolean,
      leftHandPresent: boolean,
      rightHandPresent: boolean
    ): number | null {
      const ranges: Array<readonly [number, number]> = [];
      if (posePresent) ranges.push([0, LEFT_HAND_OFFSET]);
      if (leftHandPresent) ranges.push([LEFT_HAND_OFFSET, RIGHT_HAND_OFFSET]);
      if (rightHandPresent) ranges.push([RIGHT_HAND_OFFSET, KEYPOINT_DIM]);
      if (ranges.length === 0) return null;
      return scaler.meanAbsZ(features, ranges);
    },
    dispose() {
      model.dispose();
    },
  };
}
