"use client";

import { Capacitor } from "@capacitor/core";
import { pickSttMatch } from "@/services/speech/wakeWord";

/** Speech recognition default — Filipino (Philippines). */
export const RECOG_LANG = "fil-PH";

/** Default TTS locale for KitaKita and Tanaw. */
export const DEFAULT_TTS_LANG = "fil-PH";

const TAGALOG_LANG_CANDIDATES = ["fil-PH", "tl-PH", "fil", "tl"] as const;
const POST_TTS_COOLDOWN_MS = 500;
/** Slightly faster Tagalog playback for KitaKita and Tanaw. */
export const TTS_RATE_TAGALOG = 1.1;
const TTS_RATE_ENGLISH = 1.05;

const FILIPINO_HINT =
  /[áéíóúñÁÉÍÓÚÑ]|\b(ang|ng|sa|mga|may|meron|wala|walang|ay|na|po|ito|iyan|iyon|dito|diyan|doon|salamat|ingat|delikado|mainit|oo|opo|hindi|kumusta|magandang|umaga|hapon|gabi|ikinalulungkot|iki?nagagalak|makilala|senyas|gawin|nai-save|naitala|tumatawag|kumokonekta|volunteer|tulong|mukha|camera|flashlight|teksto|basahin|tanaw|kita)\b/i;

const ENGLISH_ONLY_HINT =
  /\b(open|vision mode|enroll|describe|first|modes are|switch to)\b/i;

export function detectLang(text: string): string {
  if (ENGLISH_ONLY_HINT.test(text) && !FILIPINO_HINT.test(text)) {
    return "en-US";
  }
  return DEFAULT_TTS_LANG;
}

let speaking = false;
let cachedTagalogLang: string | null = null;
let cachedTagalogVoiceIndex: number | undefined;

export interface SpeechGate {
  pause: () => void;
  resume: () => void;
}

let speechGate: SpeechGate | null = null;

export function setSpeechGate(gate: SpeechGate | null): void {
  speechGate = gate;
}

export function isSpeaking(): boolean {
  return speaking;
}

function isTagalogLocale(lang: string): boolean {
  const normalized = lang.toLowerCase();
  return normalized.startsWith("fil") || normalized.startsWith("tl");
}

async function resolveNativeTagalogVoice(): Promise<{
  lang: string;
  voice?: number;
}> {
  if (cachedTagalogLang) {
    return { lang: cachedTagalogLang, voice: cachedTagalogVoiceIndex };
  }

  const { TextToSpeech } = await import("@capacitor-community/text-to-speech");

  for (const candidate of TAGALOG_LANG_CANDIDATES) {
    try {
      const { supported } = await TextToSpeech.isLanguageSupported({ lang: candidate });
      if (supported) {
        cachedTagalogLang = candidate;
        break;
      }
    } catch {
      /* try next candidate */
    }
  }

  if (!cachedTagalogLang) {
    try {
      const { languages } = await TextToSpeech.getSupportedLanguages();
      cachedTagalogLang =
        languages.find((lang) => isTagalogLocale(lang)) ?? DEFAULT_TTS_LANG;
    } catch {
      cachedTagalogLang = DEFAULT_TTS_LANG;
    }
  }

  try {
    const { voices } = await TextToSpeech.getSupportedVoices();
    const localTagalog = voices.find(
      (voice) => isTagalogLocale(voice.lang) && voice.localService,
    );
    const anyTagalog = voices.find((voice) => isTagalogLocale(voice.lang));
    const chosen = localTagalog ?? anyTagalog;
    if (chosen) {
      cachedTagalogVoiceIndex = voices.indexOf(chosen);
      if (cachedTagalogVoiceIndex < 0) cachedTagalogVoiceIndex = undefined;
    }
  } catch {
    cachedTagalogVoiceIndex = undefined;
  }

  return { lang: cachedTagalogLang, voice: cachedTagalogVoiceIndex };
}

function waitForWebVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }

    const finish = () => resolve(synth.getVoices());
    synth.onvoiceschanged = finish;
    window.setTimeout(finish, 400);
  });
}

async function pickWebTagalogVoice(
  preferredLang: string,
): Promise<SpeechSynthesisVoice | null> {
  const voices = await waitForWebVoices();
  const tagalogVoices = voices.filter((voice) => isTagalogLocale(voice.lang));
  if (tagalogVoices.length === 0) return null;

  const exact = tagalogVoices.find((voice) =>
    voice.lang.toLowerCase().startsWith(preferredLang.toLowerCase().slice(0, 2)),
  );
  const local = tagalogVoices.find((voice) => voice.localService);
  return exact ?? local ?? tagalogVoices[0] ?? null;
}

async function speakNative(text: string, language: string): Promise<void> {
  const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
  await TextToSpeech.stop().catch(() => {});

  const useTagalog = isTagalogLocale(language);
  const resolved = useTagalog ? await resolveNativeTagalogVoice() : null;
  const lang = resolved?.lang ?? language;
  const voice = resolved?.voice;

  try {
    await TextToSpeech.speak({
      text,
      lang,
      rate: isTagalogLocale(lang) ? TTS_RATE_TAGALOG : TTS_RATE_ENGLISH,
      pitch: 1.0,
      ...(voice !== undefined ? { voice } : {}),
    });
  } catch (err) {
    if (useTagalog && lang !== "en-US") {
      await TextToSpeech.speak({
        text,
        lang: "en-US",
        rate: TTS_RATE_ENGLISH,
      });
      return;
    }
    throw err;
  }
}

function speakWeb(text: string, language: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      resolve();
      return;
    }

    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = language;
    utter.rate = isTagalogLocale(language) ? TTS_RATE_TAGALOG : TTS_RATE_ENGLISH;

    void pickWebTagalogVoice(language).then((voice) => {
      if (voice) utter.voice = voice;
      utter.onend = () => resolve();
      utter.onerror = () => reject(new Error("TTS failed"));
      synth.speak(utter);
    });
  });
}

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

export function delay(ms: number): Promise<void> {
  return sleep(ms);
}

let warmupPromise: Promise<void> | null = null;
const preloadedPhrases = new Set<string>();

/** Prime TTS voice resolution and native engine init before first spoken phrase. */
export function warmupSpeech(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!warmupPromise) {
    warmupPromise = (async () => {
      if (Capacitor.isNativePlatform()) {
        const { lang, voice } = await resolveNativeTagalogVoice();
        const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
        try {
          await TextToSpeech.speak({
            text: ".",
            lang,
            rate: 2,
            volume: 0.01,
            ...(voice !== undefined ? { voice } : {}),
          });
          await TextToSpeech.stop();
        } catch {
          /* engine may still be warm */
        }
      } else {
        await waitForWebVoices();
        await pickWebTagalogVoice(DEFAULT_TTS_LANG);
      }
    })();
  }
  return warmupPromise;
}

/** Register common phrases and warm the TTS pipeline for this session. */
export function preloadSpeech(...phrases: string[]): void {
  void warmupSpeech().then(async () => {
    for (const phrase of phrases) {
      const key = phrase.trim();
      if (!key || preloadedPhrases.has(key)) continue;
      preloadedPhrases.add(key);

      if (Capacitor.isNativePlatform() || typeof window === "undefined") continue;

      const synth = window.speechSynthesis;
      if (!synth) continue;

      const utter = new SpeechSynthesisUtterance(key.slice(0, 48));
      utter.lang = DEFAULT_TTS_LANG;
      utter.rate = TTS_RATE_TAGALOG;
      utter.volume = 0;
      const voice = await pickWebTagalogVoice(DEFAULT_TTS_LANG);
      if (voice) utter.voice = voice;
    }
  });
}

export async function speak(text: string, lang?: string): Promise<void> {
  if (typeof window === "undefined" || !text) return;
  const language = lang ?? detectLang(text);

  await warmupSpeech();

  speechGate?.pause();
  speaking = true;

  try {
    if (Capacitor.isNativePlatform()) {
      try {
        await speakNative(text, language);
      } catch (err) {
        console.warn("[speech] native TTS failed:", err);
      }
    } else {
      try {
        await speakWeb(text, language);
      } catch (err) {
        console.warn("[speech] speak failed:", err);
      }
    }
  } finally {
    await sleep(POST_TTS_COOLDOWN_MS);
    speaking = false;
    speechGate?.resume();
  }
}

export function stopSpeaking(): void {
  if (typeof window === "undefined") return;
  if (Capacitor.isNativePlatform()) {
    void import("@capacitor-community/text-to-speech").then(({ TextToSpeech }) =>
      TextToSpeech.stop().catch(() => {}),
    );
  }
  window.speechSynthesis?.cancel();
  speaking = false;
}

export interface Listener {
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

export async function startListening(
  onPhrase: (phrase: string) => void,
): Promise<Listener> {
  if (Capacitor.isNativePlatform()) return startNativeListening(onPhrase);
  return startWebListening(onPhrase);
}

async function startNativeListening(
  onPhrase: (phrase: string) => void,
): Promise<Listener> {
  let stopped = false;
  let paused = false;

  try {
    const { SpeechRecognition } = await import(
      "@capacitor-community/speech-recognition"
    );
    await SpeechRecognition.requestPermissions();
    const permission = await SpeechRecognition.checkPermissions();
    if (permission.speechRecognition !== "granted") {
      console.warn("[speech] microphone/speech permission not granted");
    }

    const { available } = await SpeechRecognition.available();
    if (!available) {
      console.warn("[speech] speech recognition unavailable on device");
      return { stop: () => {}, pause: () => {}, resume: () => {} };
    }

    const isListening = async (): Promise<boolean> => {
      try {
        const r = (await SpeechRecognition.isListening()) as
          | boolean
          | { listening?: boolean }
          | { value?: boolean };
        if (typeof r === "boolean") return r;
        return Boolean(
          (r as { listening?: boolean }).listening ??
            (r as { value?: boolean }).value,
        );
      } catch {
        return false;
      }
    };

    const begin = async () => {
      if (stopped || paused || isSpeaking()) return;
      if (await isListening()) return;
      try {
        await SpeechRecognition.start({
          language: RECOG_LANG,
          maxResults: 5,
          partialResults: true,
          popup: false,
        });
      } catch {
        /* already started */
      }
    };

    const deliver = (phrase: string) => {
      if (stopped || paused || isSpeaking()) return;
      onPhrase(phrase);
    };

    const partial = await SpeechRecognition.addListener(
      "partialResults",
      (data: { matches?: string[] }) => {
        const matches = data?.matches ?? [];
        if (matches.length === 0) return;
        deliver(pickSttMatch(matches));
      },
    );

    const state = await SpeechRecognition.addListener(
      "listeningState",
      (data: { status: "started" | "stopped" }) => {
        if (data?.status === "stopped" && !stopped && !paused) {
          setTimeout(() => void begin(), 300);
        }
      },
    );

    const watchdog = setInterval(() => void begin(), 2500);
    await begin();

    return {
      stop: () => {
        stopped = true;
        clearInterval(watchdog);
        partial.remove();
        state.remove();
        SpeechRecognition.stop().catch(() => {});
      },
      pause: () => {
        paused = true;
        SpeechRecognition.stop().catch(() => {});
      },
      resume: () => {
        if (stopped) return;
        paused = false;
        void begin();
      },
    };
  } catch (err) {
    console.warn("[speech] native recognition unavailable:", err);
    return { stop: () => {}, pause: () => {}, resume: () => {} };
  }
}

type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function startWebListening(onPhrase: (phrase: string) => void): Listener {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return { stop: () => {}, pause: () => {}, resume: () => {} };

  let stopped = false;
  let paused = false;
  const rec = new Ctor();
  rec.lang = RECOG_LANG;
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (event) => {
    if (paused || isSpeaking()) return;
    const matches: string[] = [];
    for (let i = 0; i < event.results.length; i++) {
      const row = event.results[i];
      for (let j = 0; j < row.length; j++) {
        const t = row[j]?.transcript;
        if (t) matches.push(t);
      }
    }
    if (matches.length === 0) return;
    onPhrase(pickSttMatch(matches));
  };
  rec.onerror = () => {};
  rec.onend = () => {
    if (!stopped && !paused) {
      try {
        rec.start();
      } catch {
        /* ignore */
      }
    }
  };

  const startRec = () => {
    if (stopped || paused || isSpeaking()) return;
    try {
      rec.start();
    } catch {
      /* ignore */
    }
  };

  startRec();

  return {
    stop: () => {
      stopped = true;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    },
    pause: () => {
      paused = true;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    },
    resume: () => {
      if (stopped) return;
      paused = false;
      startRec();
    },
  };
}
