"use client";

import { useEffect, useState } from "react";

const KEY = "tanaw:splashSeen";

export function SplashScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
      setVisible(true);
      const t = setTimeout(() => {
        sessionStorage.setItem(KEY, "1");
        setVisible(false);
      }, 1600);
      return () => clearTimeout(t);
    } catch {
      setVisible(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-tanaw-yellow"
      role="status"
      aria-live="polite"
      aria-label="TANAW"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/brand/logo.png"
        alt=""
        width={96}
        height={96}
        className="mb-4 h-24 w-24 object-contain"
      />
      <p className="font-brand text-6xl text-tanaw-brown">TANAW</p>
    </div>
  );
}
