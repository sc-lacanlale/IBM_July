"use client";

import { AppScreen, ServiceCard } from "@/shared/components";

export default function LandingPage() {
  return (
    <AppScreen>
      <div className="flex flex-1 flex-col px-6 pb-10 pt-16">
        <h1 className="font-display text-[36px] leading-[0.79] tracking-[-1.8px] text-black">
          What do you need help with?
        </h1>

        <div className="mt-10 flex flex-col gap-4">
          <ServiceCard
            href="/vision/"
            title="Vision Assistance"
            imageSrc="/assets/illustrations/vision.png"
          />
          <ServiceCard
            href="/hearing/"
            title="Hearing & Speech Assistance"
            imageSrc="/assets/illustrations/hearing.png"
          />
        </div>
      </div>
    </AppScreen>
  );
}
