/** Hardcoded Tanaw demo sequences — one per Start/Stop session, in order. */

export interface DemoTranslation {
  /** Shown one at a time every 5s while “detecting”. */
  pickups: readonly string[];
  /** Spoken after the final pickup + 5s. */
  speak: string;
}

export const DEMO_STEP_MS = 5000;

export const DEMO_TRANSLATIONS: readonly DemoTranslation[] = [
  {
    pickups: ["Magandang hapon!"],
    speak: "Magandang hapon!",
  },
  {
    pickups: ["Kumusta", "Ikinagagalak ko kayo makilala"],
    speak: "Kumusta. Ikinagagalak ko kayo makilala",
  },
  {
    pickups: ["Oo"],
    speak: "Oo",
  },
  {
    pickups: ["Hindi"],
    speak: "Hindi",
  },
  {
    pickups: ["Anim Pito"],
    speak: "Anim Pito",
  },
];

export function mockLiveSign(tagalog: string) {
  return {
    label: tagalog.toUpperCase().replace(/\s+/g, "_"),
    tagalog,
    confidence: 0.95,
    margin: 0.4,
    probs: new Float32Array(0),
    rawProbs: new Float32Array(0),
    top: [{ label: tagalog, tagalog, confidence: 0.95 }],
  };
}
