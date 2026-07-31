const PHRASE_MAP: Array<{ pattern: RegExp; gloss: string }> = [
  { pattern: /magandang\s+(umaga|hapon|gabi)/i, gloss: "GOOD_AFTERNOON" },
  { pattern: /salamat|thank\s*you/i, gloss: "THANK_YOU" },
  { pattern: /kumusta|how\s+are\s+you/i, gloss: "HOW_ARE_YOU" },
  { pattern: /ikinagagalak|nice\s+to\s+meet/i, gloss: "NICE_TO_MEET_YOU" },
  { pattern: /\boo\b|yes/i, gloss: "YES" },
  { pattern: /hindi|\bno\b/i, gloss: "NO" },
  { pattern: /okay\s*lang|i'?m\s+fine/i, gloss: "IM_FINE" },
  { pattern: /naiintindihan|understand/i, gloss: "UNDERSTAND" },
  { pattern: /\btama\b|correct/i, gloss: "CORRECT" },
  { pattern: /\bmali\b|wrong/i, gloss: "WRONG" },
  { pattern: /\bisa\b|\bone\b/i, gloss: "ONE" },
  { pattern: /dalawa|\btwo\b/i, gloss: "TWO" },
  { pattern: /tatlo|\bthree\b/i, gloss: "THREE" },
  { pattern: /\banim\b|\bsix\b/i, gloss: "SIX" },
  { pattern: /\bpito\b|\bseven\b/i, gloss: "SEVEN" },
];

export function phraseToGloss(phrase: string): string | null {
  const text = phrase.trim();
  if (!text) return null;
  for (const entry of PHRASE_MAP) {
    if (entry.pattern.test(text)) return entry.gloss;
  }
  return null;
}
