"use client";

import { useEffect, useRef, useState } from "react";
import { ensureCameraPermission } from "./permissions";

export interface CameraPreviewProps {
  facingMode?: "user" | "environment";
  className?: string;
  mirrored?: boolean;
  onStream?: (stream: MediaStream | null) => void;
  onVideo?: (video: HTMLVideoElement | null) => void;
  onError?: (message: string) => void;
}

export function CameraPreview({
  facingMode = "environment",
  className = "",
  mirrored = false,
  onStream,
  onVideo,
  onError,
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const perm = await ensureCameraPermission();
      if (perm === "denied") {
        onError?.("Camera permission denied.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
          onVideo?.(video);
        }
        setReady(true);
        onStream?.(stream);
      } catch (err) {
        console.warn("[CameraPreview]", err);
        onError?.("Could not open the camera.");
        onStream?.(null);
      }
    }

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      onStream?.(null);
      onVideo?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  return (
    <video
      ref={videoRef}
      className={className}
      playsInline
      muted
      autoPlay
      style={{
        objectFit: "cover",
        width: "100%",
        height: "100%",
        transform: mirrored ? "scaleX(-1)" : undefined,
        opacity: ready ? 1 : 0.4,
      }}
      aria-label="Camera preview"
    />
  );
}

export async function setTorch(stream: MediaStream | null, on: boolean): Promise<boolean> {
  const track = stream?.getVideoTracks()[0];
  if (!track) return false;
  try {
    // @ts-expect-error torch is a non-standard constraint
    await track.applyConstraints({ advanced: [{ torch: on }] });
    return true;
  } catch {
    return false;
  }
}
