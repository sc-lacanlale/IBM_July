"use client";

import Link from "next/link";

interface ModeCardProps {
  href: string;
  label: string;
  color: string;
  iconSrc: string;
}

export function ModeCard({ href, label, color, iconSrc }: ModeCardProps) {
  return (
    <Link
      href={href}
      className="relative flex h-[154px] w-full flex-col overflow-hidden rounded-tile p-3 touch-target"
      style={{ background: color }}
      aria-label={`${label} mode`}
    >
      <span className="font-body text-[32px] leading-[0.997] tracking-[-1.6px] text-black">
        {label}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconSrc}
        alt=""
        className="mt-auto h-[66px] w-[78px] object-contain"
      />
    </Link>
  );
}
