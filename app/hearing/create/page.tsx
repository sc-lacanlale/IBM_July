"use client";

import { useEffect, useRef, useState } from "react";
import { BrandHeader, BottomNav } from "@/shared/components";
import { CameraPreview } from "@/services/camera";
import { getJson, setJson } from "@/services/storage";
import { speak } from "@/services/speech";

export interface LocalSignSubmission {
  id: string;
  label: string;
  meaning: string;
  recordedAt: number;
  uploadStatus: "local" | "pending" | "uploaded";
  frameCount: number;
}

const CHALLENGES = [
  { label: "I Love You", meaning: "Mahal kita" },
  { label: "Thank You", meaning: "Salamat" },
  { label: "How are you?", meaning: "Kumusta ka?" },
  { label: "Yes", meaning: "Oo" },
  { label: "Good afternoon", meaning: "Magandang hapon" },
];

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

export default function CreatePage() {
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [subs, setSubs] = useState<LocalSignSubmission[]>([]);
  const framesRef = useRef(0);
  const challenge = CHALLENGES[challengeIdx % CHALLENGES.length];

  useEffect(() => {
    void getJson<LocalSignSubmission[]>("customSigns", []).then(setSubs);
  }, []);

  async function saveRecording() {
    const entry: LocalSignSubmission = {
      id: crypto.randomUUID(),
      label: challenge.label,
      meaning: challenge.meaning,
      recordedAt: Date.now(),
      uploadStatus: "local",
      frameCount: framesRef.current,
    };
    const next = [entry, ...subs];
    setSubs(next);
    await setJson("customSigns", next);
    setRecording(false);
    framesRef.current = 0;
    setChallengeIdx((i) => i + 1);
    void speak(`Nai-save ang senyas: ${challenge.label}`);
  }

  function skipChallenge() {
    setRecording(false);
    framesRef.current = 0;
    setChallengeIdx((i) => i + 1);
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-black">
      <div className="absolute left-0 right-0 top-0 z-10 bg-black">
        <BrandHeader tone="onDark" className="pt-[22px]" />
      </div>

      <div className="absolute inset-x-0 top-[76px] bottom-[var(--nav-h)] overflow-hidden bg-black">
        <CameraPreview
          facingMode="user"
          mirrored
          className="h-full w-full"
        />

        <div className="absolute left-[25px] right-[25px] top-[34px] rounded-[28px] bg-[#faf1ea] px-6 py-4 shadow-lg">
          <p className="flex items-center gap-2 font-display text-base uppercase tracking-wide text-black">
            <span
              className="inline-block h-4 w-4 shrink-0 bg-black"
              style={{
                clipPath:
                  "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
              }}
              aria-hidden="true"
            />
            Do this sign
          </p>
          <p className="mt-2 font-body text-base text-black">
            Meaning: “{challenge.meaning}!”
          </p>
          <p className="mt-1 text-sm text-tanaw-muted">{challenge.label}</p>
          {subs[0] ? (
            <p className="mt-2 text-xs text-tanaw-muted">
              Latest saved: {subs[0].label}
            </p>
          ) : null}
        </div>

        <div className="absolute bottom-6 left-0 right-0 z-10 flex items-end justify-center gap-8 px-8">
          <button
            type="button"
            className="mb-4 flex h-[53px] w-[53px] items-center justify-center rounded-full bg-black active:scale-95"
            onClick={skipChallenge}
            aria-label="Skip challenge"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/icons/hearing/skip-challenge.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 object-contain invert"
            />
          </button>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              className={`h-20 w-20 rounded-full border-4 border-white ${recording ? "animate-pulse bg-tanaw-danger" : "bg-tanaw-danger"} active:scale-95`}
              aria-label={recording ? "Stop recording" : "Start recording"}
              onClick={() => {
                if (recording) {
                  void saveRecording();
                } else {
                  setRecording(true);
                  framesRef.current = 30;
                  void speak(`Gawin ang senyas: ${challenge.label}`);
                }
              }}
            />
            <p className="max-w-[140px] text-center text-sm text-white/90">
              {recording ? "Tap again to save" : "Tap to record"}
            </p>
          </div>

          <div className="mb-4 w-[68px]" aria-hidden="true" />
        </div>
      </div>

      <BottomNav
        items={HEARING_NAV.map((item) => ({
          ...item,
          active: item.href === "/hearing/create/",
        }))}
      />
    </main>
  );
}
