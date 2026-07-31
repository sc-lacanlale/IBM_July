"use client";

export type HazardEvent =
  | { type: "fall-detected"; magnitude: number }
  | { type: "panic"; source: "voice" | "button" };

export interface HazardMonitor {
  stop: () => void;
}

export interface StartMonitorOptions {
  onHazard: (event: HazardEvent) => void;
  impactThreshold?: number;
  freeFallThreshold?: number;
}

type Accel = { x: number; y: number; z: number };

function magnitude(a: Accel): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

export function startMonitoring(options: StartMonitorOptions): HazardMonitor {
  const {
    onHazard,
    impactThreshold = 28,
    freeFallThreshold = 4,
  } = options;

  let lastFreeFallAt = 0;
  let lastFireAt = 0;
  let removeNative: (() => void) | null = null;
  let webHandler: ((e: DeviceMotionEvent) => void) | null = null;
  let stopped = false;

  const handleSample = (a: Accel | null | undefined) => {
    if (!a) return;
    const mag = magnitude(a);
    const now = Date.now();
    if (mag < freeFallThreshold) lastFreeFallAt = now;
    const recentFreeFall = now - lastFreeFallAt < 1200;
    const hardImpact = mag > impactThreshold;
    const isFall =
      (recentFreeFall && hardImpact) || mag > impactThreshold * 1.4;
    if (isFall && now - lastFireAt > 3000) {
      lastFireAt = now;
      onHazard({ type: "fall-detected", magnitude: Math.round(mag) });
    }
  };

  void (async () => {
    try {
      const { Motion } = await import("@capacitor/motion");
      const handle = await Motion.addListener("accel", (event) => {
        handleSample(
          event.accelerationIncludingGravity ?? event.acceleration ?? null,
        );
      });
      if (stopped) {
        handle.remove();
        return;
      }
      removeNative = () => handle.remove();
    } catch {
      if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
        webHandler = (e: DeviceMotionEvent) => {
          const g = e.accelerationIncludingGravity;
          if (g) handleSample({ x: g.x ?? 0, y: g.y ?? 0, z: g.z ?? 0 });
        };
        window.addEventListener("devicemotion", webHandler);
      }
    }
  })();

  return {
    stop: () => {
      stopped = true;
      removeNative?.();
      if (webHandler) window.removeEventListener("devicemotion", webHandler);
      removeNative = null;
      webHandler = null;
    },
  };
}

export function triggerPanic(source: "voice" | "button"): HazardEvent {
  return { type: "panic", source };
}
