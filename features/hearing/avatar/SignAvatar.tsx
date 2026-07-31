"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AVATAR_STILL = "/assets/hearing/avatar/sign-placeholder.png";
const AVATAR_SIGN_VIDEO = "/assets/hearing/avatar/sign-placeholder.mp4";

interface SignAvatarProps {
  phrase?: string;
  /** Increment to replay the sign animation for the current phrase. */
  playSignal?: number;
  className?: string;
  onSigningChange?: (signing: boolean) => void;
}

/**
 * Tagalog → FSL avatar — still image until Start Translation triggers the sign clip.
 */
export function SignAvatar({
  phrase = "",
  playSignal = 0,
  className = "",
  onSigningChange,
}: SignAvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playingRef = useRef(false);
  const [signing, setSigning] = useState(false);

  const showIdle = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        /* ignore seek errors while loading */
      }
    }
    if (playingRef.current) {
      playingRef.current = false;
      setSigning(false);
      onSigningChange?.(false);
    }
  }, [onSigningChange]);

  const playSign = useCallback(async () => {
    const video = videoRef.current;
    if (!video || playingRef.current) return;
    if (!phrase.trim()) return;

    playingRef.current = true;
    setSigning(true);
    onSigningChange?.(true);
    try {
      video.currentTime = 0;
      await video.play();
    } catch {
      showIdle();
    }
  }, [phrase, onSigningChange, showIdle]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnded = () => showIdle();
    video.addEventListener("ended", onEnded);
    return () => video.removeEventListener("ended", onEnded);
  }, [showIdle]);

  useEffect(() => {
    if (playSignal <= 0 || !phrase.trim()) return;
    void playSign();
  }, [playSignal, phrase, playSign]);

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-black ${className}`}
      aria-label={
        phrase.trim()
          ? `Avatar signing: ${phrase}`
          : "Avatar standing by"
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={AVATAR_STILL}
        alt=""
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${signing ? "pointer-events-none opacity-0" : "opacity-100"}`}
        aria-hidden="true"
      />
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${signing ? "opacity-100" : "pointer-events-none opacity-0"}`}
        src={AVATAR_SIGN_VIDEO}
        playsInline
        muted
        preload="auto"
        aria-hidden="true"
      />
    </div>
  );
}
