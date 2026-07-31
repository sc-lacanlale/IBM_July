"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { BrandHeader, BottomNav } from "@/shared/components";
import { Icon } from "@/shared/components/Icon";
import { ensureCameraPermission } from "@/services/camera";
import { speak } from "@/services/speech";
import { triggerPanic } from "@/services/ml/hazard";
import {
  startHandoff,
  type HandoffSession,
  type HandoffTarget,
} from "@/services/ml/webrtcService";

function VideoCallInner() {
  const params = useSearchParams();
  const isFall = params.get("fall") === "1";
  const [connected, setConnected] = useState(false);
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [target, setTarget] = useState<HandoffTarget | null>(null);
  const sessionRef = useRef<HandoffSession | null>(null);
  const autoStartedRef = useRef(false);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const selfVideoRef = useRef<HTMLVideoElement>(null);
  const selfStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isFall && !autoStartedRef.current) {
      autoStartedRef.current = true;
      begin("emergency-services");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFall]);

  useEffect(() => {
    if (!active) return;
    void startSelfCamera();
    return () => stopSelfCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (active && connected && target === "volunteer") {
      remoteVideoRef.current?.play().catch(() => {});
    }
  }, [active, connected, target]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.muted = muted;
  }, [muted]);

  async function startSelfCamera() {
    if (selfStreamRef.current) return;
    const permission = await ensureCameraPermission();
    if (permission === "denied") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      selfStreamRef.current = stream;
      if (selfVideoRef.current) {
        selfVideoRef.current.srcObject = stream;
        await selfVideoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn("[video-call] self camera failed:", err);
    }
  }

  function stopSelfCamera() {
    selfStreamRef.current?.getTracks().forEach((t) => t.stop());
    selfStreamRef.current = null;
    if (selfVideoRef.current) selfVideoRef.current.srcObject = null;
  }

  function begin(t: HandoffTarget) {
    sessionRef.current?.cancel();
    setConnected(false);
    setActive(true);
    setTarget(t);
    if (t === "volunteer") {
      void speak("Kumokonekta sa isang volunteer.");
    } else {
      triggerPanic("button");
      void speak("Tumatawag ng tulong.");
    }
    sessionRef.current = startHandoff({
      target: t,
      onConnected: () => setConnected(true),
    });
  }

  function end() {
    sessionRef.current?.cancel();
    sessionRef.current = null;
    stopSelfCamera();
    setActive(false);
    setConnected(false);
    setMuted(false);
    setTarget(null);
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-tanaw-yellow safe-pb">
      <BrandHeader />

      <div className="absolute left-2 right-2 top-[76px] bottom-[calc(var(--nav-h)+8px)] overflow-hidden rounded-[24px] bg-[#1d1d22]">
        {active ? (
          <>
            {connected ? (
              target === "volunteer" ? (
                <video
                  ref={remoteVideoRef}
                  className="absolute inset-0 h-full w-full object-cover"
                  src="/videocall.mp4"
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                <div className="flex h-full items-center justify-center text-lg text-white">
                  Naka-connect sa emergency services
                </div>
              )
            ) : (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center"
                role="status"
                aria-live="polite"
              >
                <div className="flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-tanaw-yellow text-black">
                  <Icon name="video" size={42} />
                </div>
                <p className="text-lg font-semibold text-white">
                  {isFall
                    ? "Tumatawag sa emergency services..."
                    : "Kumokonekta sa volunteer..."}
                </p>
              </div>
            )}

            <div className="absolute bottom-4 right-4 h-28 w-20 overflow-hidden rounded-xl border-2 border-white/30 bg-black">
              <video
                ref={selfVideoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
                autoPlay
              />
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-white">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-tanaw-yellow text-black">
              <Icon name="video" size={42} />
            </div>
            <h2 className="font-display text-3xl">Video Call</h2>
            <p className="max-w-xs text-white/80">
              Kumonekta sa isang volunteer para sa tulong.
            </p>
            <button
              type="button"
              className="min-h-touch rounded-full bg-tanaw-yellow px-8 py-3 font-body text-lg text-black"
              onClick={() => begin("volunteer")}
            >
              Tumawag sa volunteer
            </button>
          </div>
        )}
      </div>

      {active ? (
        <div className="absolute bottom-[calc(var(--nav-h)+12px)] left-0 right-0 z-20 flex items-center justify-center gap-8">
          <button
            type="button"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(40,40,46,0.78)] text-white"
            aria-label="Camera"
          >
            <Icon name="camera" size={28} />
          </button>
          <button
            type="button"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white"
            aria-label="End call"
            onClick={end}
          >
            <Icon
              name="phone"
              size={28}
              style={{ transform: "rotate(135deg)" }}
            />
          </button>
          <button
            type="button"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(40,40,46,0.78)] text-white"
            aria-pressed={muted}
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => setMuted((m) => !m)}
          >
            <Icon name={muted ? "micOff" : "mic"} size={28} />
          </button>
        </div>
      ) : null}

      <BottomNav
        items={[
          {
            href: "/vision/view/",
            label: "View",
            iconSrc: "/assets/icons/eye.png",
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
            active: true,
          },
        ]}
      />
    </main>
  );
}

export default function VideoCallPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-tanaw-yellow">
          Loading…
        </main>
      }
    >
      <VideoCallInner />
    </Suspense>
  );
}
