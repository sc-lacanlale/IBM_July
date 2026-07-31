"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLastMode } from "@/features/vision/lastMode";

export default function VisionViewRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/vision/${getLastMode()}/`);
  }, [router]);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-tanaw-yellow">
      <p className="font-display text-xl">Opening last view…</p>
    </main>
  );
}
