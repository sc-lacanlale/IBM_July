"use client";

import Link from "next/link";

interface ServiceCardProps {
  href: string;
  title: string;
  imageSrc: string;
  description?: string;
}

export function ServiceCard({
  href,
  title,
  imageSrc,
  description,
}: ServiceCardProps) {
  return (
    <Link
      href={href}
      className="relative flex h-[175px] w-full overflow-hidden rounded-card bg-tanaw-cream touch-target"
      aria-label={description ? `${title}. ${description}` : title}
    >
      <div className="relative z-10 flex max-w-[60%] flex-col justify-start p-6 pr-2">
        <span className="font-body text-[32px] leading-[0.997] tracking-[-1.6px] text-black">
          {title}
        </span>
        {description ? (
          <span className="mt-2 text-sm text-tanaw-muted">{description}</span>
        ) : null}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt=""
        className="absolute bottom-0 right-0 h-[194px] w-[176px] object-contain"
      />
    </Link>
  );
}
