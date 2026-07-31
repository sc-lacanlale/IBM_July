"use client";

import { BrandHeader } from "./BrandHeader";

export function AppScreen({
  children,
  className = "",
  showBrand = true,
}: {
  children: React.ReactNode;
  className?: string;
  showBrand?: boolean;
}) {
  return (
    <main
      className={`relative flex min-h-dvh flex-col bg-tanaw-yellow ${className}`}
    >
      {showBrand ? <BrandHeader /> : null}
      {children}
    </main>
  );
}
