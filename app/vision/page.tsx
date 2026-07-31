"use client";

import { AppScreen, BottomNav, ModeCard } from "@/shared/components";
import { MODE_LIST } from "@/features/vision/modes";

const ICON_MAP: Record<string, string> = {
  sun: "/assets/icons/sun.png",
  house: "/assets/icons/house.png",
  users: "/assets/icons/users.png",
  book: "/assets/icons/book.png",
  cutlery: "/assets/icons/cutlery.png",
};

export default function VisionHomePage() {
  return (
    <AppScreen className="safe-pb">
      <div className="mx-3 mt-2 flex flex-1 flex-col rounded-card bg-tanaw-cream px-5 pb-8 pt-8">
        <h1 className="font-display text-[36px] leading-[0.79] tracking-[-1.8px] text-black">
          Ready to explore?
        </h1>

        <div className="mt-6 grid grid-cols-2 gap-4">
          {MODE_LIST.map((mode) => (
            <ModeCard
              key={mode.id}
              href={`/vision/${mode.id}/`}
              label={mode.label}
              color={mode.color}
              iconSrc={ICON_MAP[mode.icon] ?? "/assets/icons/house.png"}
            />
          ))}
        </div>
      </div>

      <BottomNav
        items={[
          {
            href: "/vision/view/",
            label: "View",
            iconSrc: "/assets/icons/eye.png",
          },
          {
            href: "/vision/",
            label: "Home",
            iconSrc: "/assets/icons/home.png",
            active: true,
          },
          {
            href: "/vision/video-call/",
            label: "Video Call",
            iconSrc: "/assets/icons/video-call.svg",
          },
        ]}
      />
    </AppScreen>
  );
}
