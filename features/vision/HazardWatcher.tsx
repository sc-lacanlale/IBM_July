"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startMonitoring } from "@/services/ml/hazard";
import { speak } from "@/services/speech";

export function HazardWatcher() {
  const router = useRouter();
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const monitor = startMonitoring({
      onHazard: (event) => {
        if (event.type !== "fall-detected") return;
        void speak(
          "Possible fall detected. Connecting to emergency help in 15 seconds. Tap cancel if you are okay.",
        );
        setCountdown(15);
      },
    });
    return () => monitor.stop();
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      router.push("/vision/video-call/?fall=1");
      setCountdown(null);
      return;
    }
    timerRef.current = setInterval(() => {
      setCountdown((c) => (c === null ? null : c - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdown, router]);

  if (countdown === null) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black/80 px-6 text-center text-white"
      role="alertdialog"
      aria-labelledby="hazard-title"
    >
      <h2 id="hazard-title" className="font-display text-3xl">
        Fall detected
      </h2>
      <p className="mt-4 text-xl">Emergency handoff in {countdown}s</p>
      <button
        type="button"
        className="mt-8 min-h-touch rounded-full bg-tanaw-yellow px-8 py-3 font-body text-xl text-black"
        onClick={() => setCountdown(null)}
      >
        Cancel — I&apos;m okay
      </button>
    </div>
  );
}
