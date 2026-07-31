import { DEMO_TRANSLATIONS } from "@/features/hearing/demoTranslations";
import { MODE_LIST, VOICE } from "@/features/vision/modes";

/** Common KitaKita phrases — warm the TTS engine on vision entry. */
export const KITAKITA_PRELOAD: readonly string[] = [
  VOICE.welcome,
  VOICE.modesList(),
  "Buksan muna ang isang vision mode.",
  "Buksan muna ang isang vision mode para mag-enroll ng mukha.",
  ...MODE_LIST.map((m) => `${m.label} mode.`),
];

/** Common Tanaw demo / avatar phrases. */
export const TANAW_PRELOAD: readonly string[] = [
  ...DEMO_TRANSLATIONS.map((d) => d.speak),
  "Magandang Hapon!",
  "Magandang hapon!",
  "Kumusta. Ikinagagalak ko kayo makilala",
  "Oo",
  "Hindi",
  "Anim Pito",
];

/** Delay after intro TTS before auto-playing the modes list. */
export const MODES_HINT_DELAY_MS = 5000;
