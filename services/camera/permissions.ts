"use client";

import { Capacitor } from "@capacitor/core";

export type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

export async function ensureCameraPermission(): Promise<PermissionState> {
  if (!Capacitor.isNativePlatform()) return "granted";

  try {
    const { Camera } = await import("@capacitor/camera");
    const current = await Camera.checkPermissions();
    if (current.camera === "granted") return "granted";
    const requested = await Camera.requestPermissions({ permissions: ["camera"] });
    if (requested.camera === "granted") return "granted";
    if (requested.camera === "denied") return "denied";
    return "prompt";
  } catch (err) {
    console.warn("[camera] permission request failed:", err);
    return "prompt";
  }
}
