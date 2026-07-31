export {
  speak,
  stopSpeaking,
  startListening,
  isSpeaking,
  detectLang,
  setSpeechGate,
  warmupSpeech,
  preloadSpeech,
  delay,
  DEFAULT_TTS_LANG,
  RECOG_LANG,
  TTS_RATE_TAGALOG,
} from "./voice";
export type { Listener, SpeechGate } from "./voice";
export {
  normalizeVoiceTranscript,
  hasWakeWord,
  pickSttMatch,
  WAKE_LATCH_MS,
} from "./wakeWord";
export {
  KITAKITA_PRELOAD,
  TANAW_PRELOAD,
  MODES_HINT_DELAY_MS,
} from "./preloadPhrases";
