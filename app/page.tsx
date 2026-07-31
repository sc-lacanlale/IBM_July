"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Entry redirects to landing after splash handles first paint. */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/landing/");
  }, [router]);

  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-tanaw-yellow"
      aria-busy="true"
      aria-label="Loading TANAW"
    >
      <p className="font-brand text-4xl text-tanaw-brown">TANAW</p>
    </main>
  );
}
