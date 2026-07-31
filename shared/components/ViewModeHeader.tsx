"use client";

import { BrandHeader } from "./BrandHeader";

/** Yellow top bar for vision camera / view screens (Figma view-mode header). */
export function ViewModeHeader() {
  return (
    <div className="absolute left-0 right-0 top-0 z-10">
      <div className="rounded-tr-[36px] border-b-[3px] border-[#0091FF] bg-tanaw-yellow">
        <BrandHeader className="pb-3 pt-[22px]" />
      </div>
    </div>
  );
}
