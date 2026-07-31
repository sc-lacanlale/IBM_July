"use client";

import Link from "next/link";

interface BrandHeaderProps {
  href?: string;
  className?: string;
  /** Use onDark on camera/view screens over black background */
  tone?: "default" | "onDark";
}

export function BrandHeader({
  href = "/landing/",
  className = "",
  tone = "default",
}: BrandHeaderProps) {
  const textClass =
    tone === "onDark" ? "text-white" : "text-tanaw-brown";

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-4 pt-4 touch-target ${className}`}
      aria-label="TANAW — bumalik sa landing"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/brand/logo.png"
        alt=""
        width={38}
        height={39}
        className="h-[39px] w-[38px] object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <span className={`font-brand text-[40px] leading-none ${textClass}`}>
        TANAW
      </span>
    </Link>
  );
}
