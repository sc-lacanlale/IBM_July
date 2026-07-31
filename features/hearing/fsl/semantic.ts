"use client";

import { semanticPolish } from "@/services/gemini";
import { SEMANTIC_DEBOUNCE_MS } from "./config";

export function fallbackJoin(words: string[]): string {
  return words.filter(Boolean).join(" ");
}

export function createDebouncedInterpreter(
  onResult: (text: string) => void,
  debounceMs = SEMANTIC_DEBOUNCE_MS,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;

  return {
    schedule(words: string[]) {
      if (timer) clearTimeout(timer);
      const gen = ++generation;
      timer = setTimeout(() => {
        void (async () => {
          const text = await semanticPolish(words);
          if (gen === generation) onResult(text || fallbackJoin(words));
        })();
      }, debounceMs);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      generation += 1;
    },
  };
}
