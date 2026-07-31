"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CameraPreview } from "@/services/camera";
import { BrandHeader, BottomNav } from "@/shared/components";
import {
  SEMANTIC_DEBOUNCE_MS,
  createFslTranslator,
  type FslTranslator,
  type RecordedSign,
  type SignPrediction,
  type TranslatorStatus,
} from "@/features/hearing/fsl";
import {
  createDebouncedInterpreter,
  fallbackJoin,
} from "@/features/hearing/fsl/semantic";
import { speak, startListening, preloadSpeech, type Listener } from "@/services/speech";
import { TANAW_PRELOAD } from "@/services/speech/preloadPhrases";
import { SignAvatar } from "@/features/hearing/avatar/SignAvatar";
import {
  DEMO_STEP_MS,
  DEMO_TRANSLATIONS,
  mockLiveSign,
} from "@/features/hearing/demoTranslations";
import {
  LandmarkOverlay,
  type LandmarkOverlayHandle,
} from "@/features/hearing/LandmarkOverlay";
import {
  startHolisticBonesLoop,
  type HolisticBonesLoop,
} from "@/features/hearing/holisticBonesLoop";

/** Tanaw camera mode uses scripted demo translations instead of on-device FSL. */
const DEMO_MODE = true;

const ICONS = {
  voice: "/assets/icons/hearing/voice.png",
  switchCamera: "/assets/icons/hearing/switch-camera.png",
  earAvatar: "/assets/icons/hearing/ear-avatar.png",
  speakAvatar: "/assets/icons/hearing/speak-avatar.png",
} as const;

const HEARING_NAV = [
  {
    href: "/hearing/",
    label: "Translate",
    iconSrc: "/assets/icons/hearing/sign-language.png",
  },
  {
    href: "/hearing/create/",
    label: "Create",
    iconSrc: "/assets/icons/hearing/add.png",
  },
  {
    href: "/hearing/discover/",
    label: "Discover",
    iconSrc: "/assets/icons/hearing/compass.png",
  },
] as const;

type TranslateMode = "camera" | "avatar";

function FigmaIcon({
  src,
  size,
  className = "",
}: {
  src: string;
  size: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`block shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function TranslateShell() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<LandmarkOverlayHandle | null>(null);
  const bonesLoopRef = useRef<HolisticBonesLoop | null>(null);
  const showBonesRef = useRef(true);
  const translatorRef = useRef<FslTranslator | null>(null);
  const translatingRef = useRef(false);
  const lastSpokenRef = useRef("");
  const sttRef = useRef<Listener | null>(null);
  const demoCycleRef = useRef(0);
  const demoTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [mode, setMode] = useState<TranslateMode>("camera");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [status, setStatus] = useState<TranslatorStatus>("idle");
  const [translating, setTranslating] = useState(false);
  const [liveSign, setLiveSign] = useState<SignPrediction | null>(null);
  const [transcript, setTranscript] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [avatarPhrase, setAvatarPhrase] = useState("Magandang Hapon!");
  const [avatarPlaySignal, setAvatarPlaySignal] = useState(0);
  const [avatarSigning, setAvatarSigning] = useState(false);

  const clearDemoTimeouts = useCallback(() => {
    for (const id of demoTimeoutsRef.current) clearTimeout(id);
    demoTimeoutsRef.current = [];
  }, []);

  const scheduleDemoStep = useCallback((fn: () => void, delayMs: number) => {
    const id = setTimeout(fn, delayMs);
    demoTimeoutsRef.current.push(id);
  }, []);

  const runDemoSequence = useCallback(() => {
    clearDemoTimeouts();
    const sequence = DEMO_TRANSLATIONS[demoCycleRef.current % DEMO_TRANSLATIONS.length];
    if (!sequence) return;

    setStatus("running");

    sequence.pickups.forEach((pickup, index) => {
      scheduleDemoStep(() => {
        if (!translatingRef.current) return;
        setTranscript("");
        setLiveSign(mockLiveSign(pickup));
      }, DEMO_STEP_MS * (index + 1));
    });

    const speakAtMs = DEMO_STEP_MS * (sequence.pickups.length + 1);
    scheduleDemoStep(() => {
      if (!translatingRef.current) return;
      setLiveSign(null);
      setTranscript(sequence.speak);
      void speak(sequence.speak);
    }, speakAtMs);

    scheduleDemoStep(() => {
      if (!translatingRef.current) return;
      setTranscript("");
      setLiveSign(null);
    }, speakAtMs + DEMO_STEP_MS);
  }, [clearDemoTimeouts, scheduleDemoStep]);

  const interpreterRef = useRef(
    createDebouncedInterpreter((text) => {
      if (!translatingRef.current) return;
      setTranscript(text);
      if (text && text !== lastSpokenRef.current) {
        lastSpokenRef.current = text;
        void speak(text);
      }
    }, SEMANTIC_DEBOUNCE_MS),
  );

  const handleSignsChanged = useCallback((signs: RecordedSign[]) => {
    if (!translatingRef.current) return;
    const words = signs.map((s) => s.tagalog);
    setTranscript(fallbackJoin(words));
    if (words.length > 0) interpreterRef.current.schedule(words);
  }, []);

  const ensureTranslatorRunning = useCallback(async () => {
    const translator = translatorRef.current;
    if (!translator || !translatingRef.current) return;
    if (translator.status === "running" || translator.status === "ready") return;
    try {
      await translator.start();
    } catch (err) {
      setErrorText(String((err as Error)?.message ?? err));
    }
  }, []);

  const bindVideo = useCallback(
    (video: HTMLVideoElement | null) => {
      videoRef.current = video;
      bonesLoopRef.current?.stop();
      bonesLoopRef.current = null;
      overlayRef.current?.clear();

      if (DEMO_MODE) {
        translatorRef.current?.dispose();
        translatorRef.current = null;
        if (!video || mode !== "camera") {
          setStatus("idle");
          return;
        }

        setStatus("loading");
        void startHolisticBonesLoop({
          video,
          onStatus: (boneStatus) => {
            if (boneStatus === "ready") {
              setStatus(translatingRef.current ? "running" : "ready");
            } else if (boneStatus === "loading") {
              setStatus("loading");
            } else if (boneStatus === "error") {
              setErrorText("Hindi ma-load ang MediaPipe bones overlay.");
              setStatus("error");
            }
          },
          onFrame: (frame) => {
            overlayRef.current?.draw(showBonesRef.current ? frame : null);
          },
        })
          .then((loop) => {
            bonesLoopRef.current = loop;
          })
          .catch((err) => {
            setErrorText(String((err as Error)?.message ?? err));
            setStatus("error");
          });
        return;
      }

      translatorRef.current?.dispose();
      translatorRef.current = null;
      if (!video || mode !== "camera") return;

      const translator = createFslTranslator({
        video,
        mode: "gesture",
        onStatus: setStatus,
        onLandmarks: (frame) => {
          overlayRef.current?.draw(showBonesRef.current ? frame : null);
        },
        onLiveSign: (prediction) => {
          if (!translatingRef.current) {
            setLiveSign(null);
            return;
          }
          setLiveSign(prediction);
        },
        onSignsChanged: handleSignsChanged,
        onError: (err) => setErrorText(err.message),
      });
      translatorRef.current = translator;

      if (translatingRef.current) {
        void ensureTranslatorRunning();
      } else {
        setStatus("idle");
      }
    },
    [ensureTranslatorRunning, handleSignsChanged, mode],
  );

  useEffect(() => {
    preloadSpeech(...TANAW_PRELOAD);
  }, []);

  useEffect(() => {
    const interpreter = interpreterRef.current;
    return () => {
      clearDemoTimeouts();
      bonesLoopRef.current?.stop();
      bonesLoopRef.current = null;
      interpreter.cancel();
      translatorRef.current?.dispose();
      translatorRef.current = null;
      sttRef.current?.stop();
    };
  }, [clearDemoTimeouts]);

  useEffect(() => {
    if (mode !== "camera") {
      bonesLoopRef.current?.stop();
      bonesLoopRef.current = null;
      overlayRef.current?.clear();
      translatorRef.current?.stop();
      translatorRef.current?.dispose();
      translatorRef.current = null;
      setLiveSign(null);
    }
  }, [mode]);

  async function startTranslating() {
    setTranslating(true);
    translatingRef.current = true;
    translatorRef.current?.clearSigns();
    setTranscript("");
    setLiveSign(null);
    lastSpokenRef.current = "";
    setErrorText(null);

    if (DEMO_MODE) {
      runDemoSequence();
      return;
    }

    await ensureTranslatorRunning();
  }

  function stopTranslating() {
    setTranslating(false);
    translatingRef.current = false;
    clearDemoTimeouts();
    if (DEMO_MODE) {
      demoCycleRef.current =
        (demoCycleRef.current + 1) % DEMO_TRANSLATIONS.length;
      setTranscript("");
      setLiveSign(null);
      setStatus(videoRef.current ? "ready" : "idle");
      return;
    }

    translatorRef.current?.stop();
    interpreterRef.current.cancel();
    setLiveSign(null);
    setStatus("idle");
  }

  function toggleTranslating() {
    if (translating) stopTranslating();
    else void startTranslating();
  }

  function requestAvatarSign() {
    if (!avatarPhrase.trim()) return;
    setAvatarPlaySignal((n) => n + 1);
    void speak(avatarPhrase);
  }

  function applyAvatarPhrase(text: string) {
    setAvatarPhrase(text);
  }

  async function listenForAvatar() {
    sttRef.current?.stop();
    sttRef.current = await startListening((phrase) => {
      if (phrase.length < 2) return;
      applyAvatarPhrase(phrase);
      setAvatarPlaySignal((n) => n + 1);
    });
  }

  const directionLabel =
    mode === "camera" ? "FSL TO TAGALOG" : "TAGALOG TO FSL";
  const displayText =
    mode === "camera"
      ? translating
        ? transcript || (liveSign ? liveSign.tagalog : "…")
        : "…"
      : avatarPhrase;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-tanaw-yellow">
      <BrandHeader />

      <div className="absolute inset-x-0 top-[76px] bottom-[var(--nav-h)] overflow-hidden bg-black">
        {mode === "camera" ? (
          <div className="relative h-full w-full">
            <CameraPreview
              facingMode={facing}
              mirrored={facing === "user"}
              className="h-full w-full"
              onVideo={(video) => bindVideo(video)}
            />
            <LandmarkOverlay
              ref={overlayRef}
              videoRef={videoRef}
              mirrored={facing === "user"}
            />
          </div>
        ) : (
          <SignAvatar
            phrase={avatarPhrase}
            playSignal={avatarPlaySignal}
            onSigningChange={setAvatarSigning}
            className="h-full w-full"
          />
        )}

        <button
          type="button"
          className="absolute right-[19px] top-[23px] flex h-[58px] w-[60px] items-center justify-center rounded-full bg-black"
          onClick={() => {
            const next = mode === "camera" ? "avatar" : "camera";
            setMode(next);
            if (next === "avatar") {
              stopTranslating();
              void listenForAvatar();
            } else {
              sttRef.current?.stop();
              setAvatarSigning(false);
            }
          }}
          aria-label={
            mode === "camera"
              ? "Switch to Avatar Mode"
              : "Switch to Camera Mode"
          }
        >
          <FigmaIcon
            src={mode === "camera" ? ICONS.earAvatar : ICONS.speakAvatar}
            size={27}
          />
        </button>

        <div
          className={`absolute bottom-[100px] left-[25px] right-[25px] rounded-[28px] bg-[#faf1ea] px-6 py-4 transition-opacity duration-200 ${mode === "avatar" && avatarSigning ? "pointer-events-none opacity-0" : "opacity-100"}`}
          aria-hidden={mode === "avatar" && avatarSigning}
        >
          <p className="flex items-center gap-2 font-display text-base font-normal uppercase tracking-wide text-black">
            <span
              className="inline-block h-4 w-4 shrink-0 bg-black"
              style={{
                clipPath:
                  "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
              }}
              aria-hidden="true"
            />
            {directionLabel}
          </p>
          <p className="mt-2 font-body text-xl leading-snug text-black">
            “{displayText}”
          </p>
          {mode === "avatar" ? (
            <>
              <label className="sr-only" htmlFor="avatar-input">
                Tagalog phrase
              </label>
              <input
                id="avatar-input"
                className="mt-3 min-h-touch w-full rounded-tile border-2 border-black/10 bg-white px-4 text-lg"
                value={avatarPhrase}
                onChange={(e) => applyAvatarPhrase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") requestAvatarSign();
                }}
                placeholder="Type Tagalog to sign…"
              />
            </>
          ) : null}
          {status !== "ready" &&
          status !== "running" &&
          status !== "idle" &&
          mode === "camera" ? (
            <p className="mt-1 text-sm text-tanaw-muted">Status: {status}</p>
          ) : null}
          {errorText ? (
            <p className="mt-1 text-sm text-tanaw-danger">{errorText}</p>
          ) : null}
        </div>

        <div className="absolute bottom-[17px] left-[28px] right-[28px] flex items-center gap-3">
          {mode === "camera" ? (
            <>
              <button
                type="button"
                className={`flex h-[57px] min-w-0 flex-1 items-center justify-center gap-2 rounded-[33px] bg-black px-4 font-body text-base leading-none text-[#faf1ea] active:scale-[0.98] ${translating ? "ring-2 ring-tanaw-ok ring-offset-2 ring-offset-black" : ""}`}
                onClick={toggleTranslating}
                aria-pressed={translating}
              >
                <FigmaIcon src={ICONS.voice} size={22} />
                <span className="whitespace-nowrap">
                  {translating ? "Stop Translation" : "Start Translation"}
                </span>
              </button>
              <button
                type="button"
                className="flex h-[53px] w-[53px] shrink-0 items-center justify-center rounded-full bg-black active:scale-95"
                onClick={() =>
                  setFacing((f) => (f === "user" ? "environment" : "user"))
                }
                aria-label="Flip camera"
              >
                <FigmaIcon src={ICONS.switchCamera} size={32} />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="flex h-[57px] min-w-0 flex-1 items-center justify-center gap-2 rounded-[33px] bg-black px-4 font-body text-base leading-none text-[#faf1ea] active:scale-[0.98]"
              onClick={() => requestAvatarSign()}
            >
              <FigmaIcon src={ICONS.voice} size={22} />
              <span className="whitespace-nowrap">Start Translation</span>
            </button>
          )}
        </div>
      </div>

      <BottomNav
        items={HEARING_NAV.map((item) => ({
          ...item,
          active: item.href === "/hearing/",
        }))}
      />
    </main>
  );
}
