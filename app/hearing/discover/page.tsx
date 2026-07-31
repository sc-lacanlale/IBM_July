"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrandHeader, BottomNav } from "@/shared/components";
import {
  createMockDiscoverRepository,
  type DiscoverCard,
  type DiscoverCategory,
} from "@/features/hearing/discover/repository";

const FILTERS: { id: DiscoverCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "phrases", label: "Phrases" },
  { id: "greetings", label: "Greetings" },
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

function DiscoverReel({
  card,
  onOpen,
}: {
  card: DiscoverCard;
  onOpen: (card: DiscoverCard) => void;
}) {
  return (
    <button
      type="button"
      className="relative aspect-[165/270] w-full overflow-hidden rounded-[20px] bg-[#2a2a2a] text-left active:scale-[0.98]"
      onClick={() => onOpen(card)}
      aria-label={`Play sign: ${card.title} by ${card.author}`}
    >
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        src={card.mediaUrl}
        poster={card.posterUrl}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-[20px]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(102,102,102,0.14) 73%, #000 99.77%)",
        }}
      />
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10">
        <h2 className="font-body text-xs leading-tight text-white">
          {card.title}
        </h2>
        <p className="mt-1 font-body text-[8px] leading-tight text-white/90">
          {card.author}
        </p>
      </div>
    </button>
  );
}

function ReelViewer({
  card,
  onClose,
}: {
  card: DiscoverCard;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => {});
    return () => {
      video.pause();
    };
  }, [card.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={`${card.title} reel`}
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))]">
        <div>
          <p className="font-body text-lg text-white">{card.title}</p>
          <p className="text-sm text-white/75">{card.author}</p>
        </div>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white"
          onClick={onClose}
          aria-label="Close reel"
        >
          ×
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-2">
        <video
          ref={videoRef}
          className="max-h-full w-full object-contain"
          src={card.mediaUrl}
          controls
          playsInline
          loop
        />
      </div>

      <p className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] text-center text-sm text-white/70">
        {card.subtitle}
      </p>
    </div>
  );
}

export default function DiscoverPage() {
  const repo = useMemo(() => createMockDiscoverRepository(), []);
  const [category, setCategory] = useState<DiscoverCategory>("all");
  const [cards, setCards] = useState<DiscoverCard[]>([]);
  const [activeReel, setActiveReel] = useState<DiscoverCard | null>(null);

  useEffect(() => {
    void repo.list(category).then(setCards);
  }, [repo, category]);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#faf1ea]">
      <BrandHeader />

      <div className="px-[26px] pb-[calc(var(--nav-h)+16px)] pt-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-[25px] leading-tight tracking-wide text-tanaw-brown">
            COMMUNITY CONTRIBUTIONS
          </h1>
          <span className="shrink-0 pt-2 font-body text-xs text-black">
            Explore Reels
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`min-h-[25px] shrink-0 rounded-full px-3 font-body text-xs ${
                category === f.id
                  ? "bg-[#ffa300] text-white"
                  : "bg-[#d3d3d3] text-black"
              }`}
              onClick={() => setCategory(f.id)}
              aria-pressed={category === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-[23px] gap-y-4">
          {cards.map((card) => (
            <DiscoverReel
              key={card.id}
              card={card}
              onOpen={setActiveReel}
            />
          ))}
        </div>
      </div>

      {activeReel ? (
        <ReelViewer card={activeReel} onClose={() => setActiveReel(null)} />
      ) : null}

      <BottomNav
        items={HEARING_NAV.map((item) => ({
          ...item,
          active: item.href === "/hearing/discover/",
        }))}
      />
    </main>
  );
}
