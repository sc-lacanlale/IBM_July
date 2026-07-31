"use client";

import { useEffect, useRef, useState } from "react";
import { CameraPreview } from "@/services/camera";
import { BottomNav, ViewModeHeader } from "@/shared/components";
import { Icon } from "@/shared/components/Icon";
import type { ModeDefinition } from "@/features/vision/modes";
import { startSession, type GeminiSession } from "@/services/gemini";
import { speak } from "@/services/speech";
import {
  onDescribeRequested,
  onEnrollRequested,
  onVoiceListening,
  requestVoiceToggle,
} from "@/features/vision/commandBus";
import { setLastMode } from "@/features/vision/lastMode";
import {
  loadFaceModels,
  enrollFromStream,
  identifyFromStream,
} from "@/services/ml";
import { DetectionOverlay } from "./DetectionOverlay";

interface ModeShellProps {
  mode: ModeDefinition;
}

type Facing = "environment" | "user";

export function ModeShell({ mode }: ModeShellProps) {
  const isStudy = mode.id === "study";
  const [message, setMessage] = useState(
    isStudy
      ? "Itutok ang camera sa teksto at pindutin ang bilog para basahin."
      : "Sandali, naghahanda...",
  );
  const [busy, setBusy] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [facing, setFacing] = useState<Facing>("environment");
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const sessionRef = useRef<GeminiSession | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognizedRef = useRef<string | null>(null);

  function startAssistant() {
    sessionRef.current?.stop();
    sessionRef.current = startSession({
      mode,
      getStream: () => streamRef.current,
      onStatus: (s) => {
        if (s === "live") {
          setMessage((m) => (m === "Sandali, naghahanda..." ? "" : m));
        }
        if (s === "error") {
          setMessage(
            "May problema sa assistant. I-check ang network o API key.",
          );
        }
      },
      onMessage: (text) => {
        setBusy(false);
        const name = recognizedRef.current;
        recognizedRef.current = null;
        const full =
          !isStudy && name ? `Si ${name} ang nasa harap mo. ${text}` : text;
        setMessage(full);
        void speak(full).then(() => setMessage(""));
      },
    });
  }

  async function describe(query?: string) {
    if (!sessionRef.current) {
      startAssistant();
      setMessage("Sandali, naghahanda pa...");
      return;
    }
    setBusy(true);
    setMessage(
      query
        ? isStudy
          ? `Binabasa: ${query}`
          : `Tinitingnan: ${query}`
        : isStudy
          ? "Binabasa ang teksto..."
          : "Sandali, tinitingnan...",
    );
    recognizedRef.current = isStudy
      ? null
      : await identifyFromStream(streamRef.current);
    sessionRef.current.describe(query);
  }

  async function enroll(label: string) {
    setBusy(true);
    setMessage(`Tinitingnan si ${label}...`);
    const result = await enrollFromStream(streamRef.current, label);
    setBusy(false);
    if (result === "ok") {
      const msg = `Naitala ko si ${label}. Sasabihin ko kapag nakita ko ulit.`;
      setMessage(msg);
      void speak(msg).then(() => setMessage(""));
    } else if (result === "no-face") {
      const msg =
        "Walang nakitang mukha. Itutok ang camera sa tao at subukan ulit.";
      setMessage(msg);
      void speak(msg).then(() => setMessage(""));
    } else {
      const msg = "Hindi pa handa ang face recognition. Subukan ulit mamaya.";
      setMessage(msg);
      void speak(msg).then(() => setMessage(""));
    }
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next }],
      } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      setMessage("Walang flashlight ang camera na ito.");
    }
  }

  function flipCamera() {
    setTorchOn(false);
    setFacing((f) => (f === "environment" ? "user" : "environment"));
  }

  useEffect(() => {
    setLastMode(mode.id);
    startAssistant();
    if (!isStudy) void loadFaceModels();
    const offDescribe = onDescribeRequested((payload) => void describe(payload));
    const offEnroll = onEnrollRequested((label) => void enroll(label));
    const offMic = onVoiceListening(setMicOn);
    return () => {
      offDescribe();
      offEnroll();
      offMic();
      sessionRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode.id]);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-black safe-pb">
      <div className="absolute inset-0 top-[var(--view-header-h)] bottom-[var(--nav-h)]">
        <CameraPreview
          facingMode={facing}
          className="h-full w-full"
          onStream={(s) => {
            streamRef.current = s;
          }}
          onVideo={(video) => setVideoEl(video)}
        />
        {!isStudy ? (
          <DetectionOverlay video={videoEl} active={Boolean(videoEl)} />
        ) : null}
      </div>

      <ViewModeHeader />

      <div
        className="absolute left-[18px] top-[calc(var(--view-header-h)+14px)] z-20 inline-flex items-center gap-3 rounded-tile px-[18px] py-3 shadow-lg"
        style={{ background: mode.color }}
      >
        <span className="font-body text-[30px] font-bold leading-none tracking-[-1.4px] text-black">
          {mode.label}
        </span>
      </div>

      <button
        type="button"
        className={`absolute right-5 top-[calc(var(--view-header-h)+14px)] z-20 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(40,40,46,0.78)] text-white backdrop-blur-sm ${torchOn ? "!bg-tanaw-yellow !text-black ring-4 ring-white/40" : ""}`}
        onClick={() => void toggleTorch()}
        aria-pressed={torchOn}
        aria-label={torchOn ? "Turn off flashlight" : "Turn on flashlight"}
      >
        <Icon name="flash" size={30} />
      </button>

      {message ? (
        <div
          className="absolute bottom-[calc(var(--nav-h)+120px)] left-4 right-4 z-20 rounded-[18px] bg-black/60 px-4 py-3 text-center text-[1.05rem] leading-snug text-white backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      ) : null}

      <div className="absolute bottom-[calc(var(--nav-h)+18px)] left-0 right-0 z-20 flex items-center justify-around px-7">
        <button
          type="button"
          className="flex h-[70px] w-[70px] items-center justify-center rounded-full bg-[rgba(40,40,46,0.78)] text-white backdrop-blur-sm active:scale-95"
          onClick={() => requestVoiceToggle()}
          aria-pressed={micOn}
          aria-label={micOn ? "Turn off voice" : "Turn on voice"}
        >
          <Icon name={micOn ? "mic" : "micOff"} size={32} />
        </button>

        <button
          type="button"
          className={`flex h-[92px] w-[92px] items-center justify-center rounded-full border-[6px] border-white/50 bg-white active:scale-95 ${busy ? "!bg-tanaw-yellow" : ""}`}
          onClick={() => void describe()}
          aria-label={
            isStudy ? "Read text in front of me" : "Describe what is in front of me"
          }
        />

        <button
          type="button"
          className="flex h-[70px] w-[70px] items-center justify-center rounded-full bg-[rgba(40,40,46,0.78)] text-white backdrop-blur-sm active:scale-95"
          onClick={flipCamera}
          aria-label="Flip camera"
        >
          <Icon name="flipCamera" size={32} />
        </button>
      </div>

      <BottomNav
        items={[
          {
            href: `/vision/${mode.id}/`,
            label: "View",
            iconSrc: "/assets/icons/eye.png",
            active: true,
          },
          {
            href: "/vision/",
            label: "Home",
            iconSrc: "/assets/icons/home.png",
          },
          {
            href: "/vision/video-call/",
            label: "Video Call",
            iconSrc: "/assets/icons/video-call.svg",
          },
        ]}
      />
    </main>
  );
}
