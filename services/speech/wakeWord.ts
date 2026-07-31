/** How long after "TANAW" we accept a command without repeating the wake word. */
export const WAKE_LATCH_MS = 7000;

/** Normalized wake token after mishearing correction. */
export const WAKE_TOKEN = "tanaw";

export const WAKE_RE = /\btanaw\b/i;

/**
 * Speech-to-text often splits or mishears "TANAW". Match raw phrases before normalization.
 * Optional prefixes: hey, hi, hay, ok, okay.
 */
export const WAKE_RAW_RE =
  /\b(?:(?:hey|hi|hay|ei|ok|okay)\s+)?(?:ta\s*naw|t\s*a\s*n\s*a\s*w|tanow|tanau|tana[wvb]|tanaw)\b/i;

/** Replace every detected wake phrase with the canonical token. */
const WAKE_REPLACE_RE = new RegExp(WAKE_RAW_RE.source, "gi");

/** Common speech-to-text mishearings of "TANAW". */
export function normalizeVoiceTranscript(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[,.!?;:]/g, " ")
    .replace(WAKE_REPLACE_RE, WAKE_TOKEN)
    .replace(/\s+/g, " ")
    .trim();
}

export function hasWakeWord(text: string): boolean {
  return WAKE_RE.test(normalizeVoiceTranscript(text));
}

export function stripWakeWord(normalizedPhrase: string): string {
  return normalizedPhrase.replace(WAKE_RE, "").trim().replace(/^[,.\s]+/, "");
}

/** Resolve command text after wake word or within an active wake latch. */
export function resolveCommandText(
  normalizedPhrase: string,
  wakeLatchUntil: number,
): { text: string | null; nextLatchUntil: number } {
  const now = Date.now();
  let nextLatchUntil = wakeLatchUntil;

  if (WAKE_RE.test(normalizedPhrase)) {
    nextLatchUntil = now + WAKE_LATCH_MS;
    const rest = stripWakeWord(normalizedPhrase);
    if (rest) {
      return { text: rest, nextLatchUntil };
    }
    return { text: null, nextLatchUntil };
  }

  if (now < nextLatchUntil && normalizedPhrase) {
    return { text: normalizedPhrase, nextLatchUntil };
  }

  return { text: null, nextLatchUntil };
}

/** Prefer STT alternatives that contain the wake word (or a known variant). */
export function pickSttMatch(matches: string[]): string {
  if (matches.length === 0) return "";

  let best = matches[0];
  let bestScore = -1;

  for (const raw of matches) {
    let score = 0;
    if (hasWakeWord(raw)) score += 10;
    else if (WAKE_RAW_RE.test(raw.toLowerCase())) score += 5;
    if (score > bestScore) {
      bestScore = score;
      best = raw;
    }
  }

  return best.toLowerCase();
}
