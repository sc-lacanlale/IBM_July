"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  delay,
  isSpeaking,
  preloadSpeech,
  setSpeechGate,
  speak,
  startListening,
  stopSpeaking,
  type Listener,
} from "@/services/speech";
import {
  KITAKITA_PRELOAD,
  MODES_HINT_DELAY_MS,
} from "@/services/speech/preloadPhrases";
import {
  onVoiceToggle,
  requestDescribe,
  requestEnroll,
  setVoiceListening,
} from "./commandBus";
import { MODE_LIST, VOICE } from "./modes";
import { triggerPanic } from "@/services/ml/hazard";
import {
  isActiveViewMode,
  normalizeVoiceTranscript,
  parseViewModeCommand,
  parseVoiceCommand,
  resolveCommandText,
  type VoiceCommand,
} from "./voiceCommands";

const INTRO_KEY = "kitakita-intro";
const COMMAND_COOLDOWN_MS = 2500;

function isVisionRoute(pathname: string): boolean {
  return pathname === "/vision" || pathname.startsWith("/vision/");
}

export function VoiceCommander() {
  const router = useRouter();
  const pathname = usePathname();
  const listenerRef = useRef<Listener | null>(null);
  const listeningRef = useRef(false);
  const wakeLatchUntilRef = useRef(0);
  const lastCommandRef = useRef<{ key: string; at: number }>({ key: "", at: 0 });

  const runCommand = useCallback(
    (command: VoiceCommand) => {
      switch (command.type) {
        case "modes-list":
          void speak(VOICE.modesList());
          return;
        case "describe":
          if (!requestDescribe(command.query)) {
            void speak("Buksan muna ang isang vision mode.");
          }
          return;
        case "emergency":
          triggerPanic("voice");
          router.push("/vision/video-call/?fall=1");
          return;
        case "landing":
          router.push("/landing/");
          return;
        case "video-call":
          router.push("/vision/video-call/");
          return;
        case "teach":
          router.push("/vision/teach/");
          return;
        case "enroll":
          if (!requestEnroll(command.name)) {
            void speak("Buksan muna ang isang vision mode para mag-enroll ng mukha.");
          }
          return;
        case "open-mode":
          router.push(`/vision/${command.mode.id}/`);
          void speak(`${command.mode.label} mode.`);
          return;
        case "hearing":
          router.push("/hearing/");
          return;
        case "vision-home":
          router.push("/vision/");
          return;
      }
    },
    [router],
  );

  const handlePhrase = useCallback(
    (raw: string) => {
      if (isSpeaking()) return;

      const phrase = normalizeVoiceTranscript(raw);
      const { text: rest, nextLatchUntil } = resolveCommandText(
        phrase,
        wakeLatchUntilRef.current,
      );
      wakeLatchUntilRef.current = nextLatchUntil;
      if (!rest) return;

      const inViewMode = isActiveViewMode(pathnameRef.current);
      const command = inViewMode
        ? parseViewModeCommand(rest, MODE_LIST)
        : parseVoiceCommand(rest, MODE_LIST);
      if (!command) return;

      const key = `${command.type}:${"mode" in command ? command.mode.id : "name" in command ? command.name : "query" in command && command.query ? command.query : rest}`;
      const now = Date.now();
      if (
        key === lastCommandRef.current.key &&
        now - lastCommandRef.current.at < COMMAND_COOLDOWN_MS
      ) {
        return;
      }
      lastCommandRef.current = { key, at: now };

      stopSpeaking();
      runCommand(command);
    },
    [runCommand],
  );

  const handlePhraseRef = useRef(handlePhrase);
  handlePhraseRef.current = handlePhrase;

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const start = useCallback(async () => {
    if (listeningRef.current) return;
    listeningRef.current = true;
    setVoiceListening(true);
    listenerRef.current = await startListening((phrase) => {
      handlePhraseRef.current(phrase);
    });
  }, []);

  const stop = useCallback(() => {
    listeningRef.current = false;
    setVoiceListening(false);
    listenerRef.current?.stop();
    listenerRef.current = null;
  }, []);

  useEffect(() => {
    setSpeechGate({
      pause: () => listenerRef.current?.pause(),
      resume: () => listenerRef.current?.resume(),
    });
    return () => setSpeechGate(null);
  }, []);

  useEffect(() => {
    if (!isVisionRoute(pathname)) {
      stop();
      return;
    }

    preloadSpeech(...KITAKITA_PRELOAD);

    let cancelled = false;

    if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem(INTRO_KEY)) {
      sessionStorage.setItem(INTRO_KEY, "1");
      void (async () => {
        await speak(VOICE.welcome);
        if (cancelled) return;
        await delay(MODES_HINT_DELAY_MS);
        if (cancelled) return;
        await speak(VOICE.modesList());
      })();
    }

    void start();

    const offToggle = onVoiceToggle(() => {
      if (listeningRef.current) stop();
      else void start();
    });

    return () => {
      cancelled = true;
      offToggle();
      stop();
    };
  }, [pathname, start, stop]);

  return null;
}
