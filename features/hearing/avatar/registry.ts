export type SignAnimationProvider = {
  canAnimate: (glossKey: string) => boolean;
  /** CSS animation name or null for text fallback */
  animationFor: (glossKey: string) => string | null;
};

/** Known FSL gloss keys → CSS animation ids (extensible for future 3D). */
const ANIMATIONS: Record<string, string> = {
  THANK_YOU: "sign-thank-you",
  YES: "sign-yes",
  NO: "sign-no",
  HOW_ARE_YOU: "sign-wave",
  GOOD_AFTERNOON: "sign-wave",
  NICE_TO_MEET_YOU: "sign-wave",
  IM_FINE: "sign-yes",
  UNDERSTAND: "sign-yes",
  ONE: "sign-count",
  TWO: "sign-count",
  THREE: "sign-count",
  SIX: "sign-count",
  SEVEN: "sign-count",
  CORRECT: "sign-yes",
  WRONG: "sign-no",
};

export const cssAnimationRegistry: SignAnimationProvider = {
  canAnimate: (glossKey) => Boolean(ANIMATIONS[glossKey]),
  animationFor: (glossKey) => ANIMATIONS[glossKey] ?? null,
};

export function registerSignAnimation(glossKey: string, animationId: string) {
  ANIMATIONS[glossKey] = animationId;
}
