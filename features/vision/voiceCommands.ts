import type { ModeDefinition, ModeId } from "./modes";

export {
  WAKE_LATCH_MS,
  WAKE_RE,
  normalizeVoiceTranscript,
  resolveCommandText,
  pickSttMatch,
  hasWakeWord,
} from "@/services/speech/wakeWord";

import { WAKE_RE, stripWakeWord } from "@/services/speech/wakeWord";

export function extractWakeCommand(normalizedPhrase: string): string | null {
  if (!WAKE_RE.test(normalizedPhrase)) return null;
  return stripWakeWord(normalizedPhrase);
}

const MODE_VOICE_ALIASES: Record<ModeId, readonly string[]> = {
  outdoor: ["outdoor", "out door", "outdoors", "out door mode", "labas"],
  indoor: ["indoor", "in door", "indoors", "in door mode", "loob", "bahay"],
  social: ["social", "sosyal", "social mode", "tao", "people"],
  study: ["study", "study mode", "aral", "basa", "basahin", "read", "reading"],
  cooking: ["cooking", "cooking mode", "cook", "luto", "kusina", "kitchen"],
};

function normalizeCommandText(text: string): string {
  return text
    .replace(/\bout\s+door(s)?\b/g, "outdoor")
    .replace(/\bin\s+door(s)?\b/g, "indoor")
    .replace(/\bvideo\s+call(s)?\b/g, "videocall")
    .replace(/\b(mode|modes|selection|select|please|open|buksan|piliin|pumunta sa|switch to|go to)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesMode(text: string, mode: ModeDefinition): boolean {
  const normalized = normalizeCommandText(text);
  const label = mode.label.toLowerCase();
  const aliases = MODE_VOICE_ALIASES[mode.id];

  if (normalized === mode.id || normalized === label) return true;
  if (normalized.includes(mode.id) || normalized.includes(label)) return true;

  for (const alias of aliases) {
    const aliasNorm = normalizeCommandText(alias);
    if (normalized === aliasNorm || normalized.includes(aliasNorm)) return true;
  }

  return false;
}

export type VoiceCommand =
  | { type: "modes-list" }
  | { type: "describe"; query?: string }
  | { type: "emergency" }
  | { type: "landing" }
  | { type: "video-call" }
  | { type: "teach" }
  | { type: "enroll"; name: string }
  | { type: "open-mode"; mode: ModeDefinition }
  | { type: "hearing" }
  | { type: "vision-home" };

const NAV_COMMAND_TYPES = new Set([
  "modes-list",
  "emergency",
  "landing",
  "video-call",
  "teach",
  "enroll",
  "open-mode",
  "hearing",
  "vision-home",
]);

const DEFAULT_LOOK_RE =
  /^$|^tingin$|^tignan$|^look$|^describe$|^ano ang nasa harap$|^basahin$|^read$/;

const FIND_QUERY_RE =
  /where is|where's|where are|saan (ang|yung)|nasa saan|nasaan|hanapin|find (my|the)|look for|look for my/i;

export function parseVoiceCommand(
  rest: string,
  modes: readonly ModeDefinition[],
): VoiceCommand | null {
  const text = normalizeCommandText(rest.trim());
  if (!text) return null;

  if (
    /anong?\s+mga\s+mode|ano\s+ang\s+mga\s+mode|ano\s+mga\s+mode|what (are )?the modes|mga\s+mode/.test(
      text,
    )
  ) {
    return { type: "modes-list" };
  }

  if (
    /describe|ano ang nasa harap|what('s| is) in front|basahin|read(ing)?( the)? text|read (it|this)/.test(
      text,
    )
  ) {
    return { type: "describe" };
  }

  if (/emergency|tulong|panic|help/.test(text)) {
    return { type: "emergency" };
  }

  if (/landing|home menu|bumalik/.test(text)) {
    return { type: "landing" };
  }

  if (/videocall|volunteer|tawag/.test(text)) {
    return { type: "video-call" };
  }

  if (/teach|turuan/.test(text)) {
    return { type: "teach" };
  }

  const enroll = text.match(/(?:this is|ito si|si)\s+([a-zA-ZÀ-ÿ\s]{2,40})/);
  if (enroll?.[1]) {
    return { type: "enroll", name: enroll[1].trim() };
  }

  for (const mode of modes) {
    if (matchesMode(text, mode)) {
      return { type: "open-mode", mode };
    }
  }

  if (/hearing|sign|fsl|translate|tanaw/.test(text)) {
    return { type: "hearing" };
  }

  if (/vision|kitakita/.test(text)) {
    return { type: "vision-home" };
  }

  return null;
}

/** Active camera view (/vision/outdoor/, etc.) — not home, teach, or video-call. */
export function isActiveViewMode(pathname: string): boolean {
  const match = pathname.match(/^\/vision\/([^/]+)\/?$/);
  if (!match?.[1]) return false;
  const segment = match[1];
  return segment !== "teach" && segment !== "video-call" && segment !== "view";
}

/**
 * In view mode, voice is free-form after "TANAW": default is tingin (describe scene),
 * or pass any question like "where is my phone" to the vision assistant.
 */
export function parseViewModeCommand(
  rest: string,
  modes: readonly ModeDefinition[],
): VoiceCommand | null {
  const text = normalizeCommandText(rest.trim());

  const global = parseVoiceCommand(rest, modes);
  if (global && NAV_COMMAND_TYPES.has(global.type)) {
    return global;
  }

  if (DEFAULT_LOOK_RE.test(text)) {
    return { type: "describe" };
  }

  if (FIND_QUERY_RE.test(rest) || FIND_QUERY_RE.test(text)) {
    return { type: "describe", query: rest.trim() };
  }

  if (text) {
    return { type: "describe", query: rest.trim() };
  }

  return null;
}
