"use client";

export interface FrameGrabber {
  capture: () => string | null;
  dispose: () => void;
}

export interface CreateFrameGrabberOptions {
  maxEdge?: number;
  quality?: number;
}

export function createFrameGrabber(
  stream: MediaStream,
  options: CreateFrameGrabberOptions = {},
): FrameGrabber {
  const { maxEdge = 768, quality = 0.6 } = options;

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  void video.play().catch(() => {});

  const canvas = document.createElement("canvas");

  return {
    capture: () => {
      if (video.readyState < 2 || video.videoWidth === 0) return null;
      const { videoWidth: w, videoHeight: h } = video;
      const scale = Math.min(1, maxEdge / Math.max(w, h));
      const cw = Math.round(w * scale);
      const ch = Math.round(h * scale);
      if (canvas.width !== cw) canvas.width = cw;
      if (canvas.height !== ch) canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, cw, ch);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const comma = dataUrl.indexOf(",");
      return comma >= 0 ? dataUrl.slice(comma + 1) : null;
    },
    dispose: () => {
      video.srcObject = null;
      video.remove();
    },
  };
}
