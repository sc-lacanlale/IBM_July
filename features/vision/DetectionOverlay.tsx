"use client";

import { useEffect, useRef } from "react";

type Detection = {
  bbox: [number, number, number, number];
  class: string;
  score: number;
};

type CocoModel = {
  detect: (input: HTMLVideoElement) => Promise<Detection[]>;
};

interface DetectionOverlayProps {
  video: HTMLVideoElement | null;
  active?: boolean;
  fps?: number;
}

/** Map video-space bbox to display coords when video uses object-fit: cover. */
function coverTransform(
  video: HTMLVideoElement,
  displayW: number,
  displayH: number,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return { scale: 1, ox: 0, oy: 0 };
  const scale = Math.max(displayW / vw, displayH / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  return {
    scale,
    ox: (displayW - dw) / 2,
    oy: (displayH - dh) / 2,
  };
}

/** Visual-only COCO-SSD boxes — does not feed app state. */
export function DetectionOverlay({
  video,
  active = true,
  fps = 6,
}: DetectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<CocoModel | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRunRef = useRef(0);

  useEffect(() => {
    if (!video || !active) return;
    let cancelled = false;

    async function loadModel() {
      try {
        const tf = await import("@tensorflow/tfjs");
        await tf.ready();
        const cocoSsd = await import("@tensorflow-models/coco-ssd");
        modelRef.current = (await cocoSsd.load({
          base: "lite_mobilenet_v2",
        })) as unknown as CocoModel;
      } catch (err) {
        console.warn("[DetectionOverlay] model load failed:", err);
      }
    }

    void loadModel();

    const interval = 1000 / fps;

    const loop = async (t: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (cancelled) return;
      const canvas = canvasRef.current;
      const model = modelRef.current;
      if (!canvas || !model || video!.readyState < 2 || video!.videoWidth === 0)
        return;
      if (t - lastRunRef.current < interval) return;
      lastRunRef.current = t;

      const rect = video!.getBoundingClientRect();
      const displayW = Math.round(rect.width);
      const displayH = Math.round(rect.height);
      if (displayW < 1 || displayH < 1) return;

      let predictions: Detection[] = [];
      try {
        predictions = await model.detect(video!);
      } catch {
        return;
      }
      if (cancelled) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = displayW;
      canvas.height = displayH;
      ctx.clearRect(0, 0, displayW, displayH);

      const { scale, ox, oy } = coverTransform(video!, displayW, displayH);
      ctx.lineWidth = Math.max(2, displayW / 240);
      ctx.font = `${Math.max(14, displayW / 32)}px system-ui, sans-serif`;
      ctx.textBaseline = "top";

      for (const p of predictions) {
        if (p.score < 0.35) continue;
        const [x, y, w, h] = p.bbox;
        const dx = x * scale + ox;
        const dy = y * scale + oy;
        const dw = w * scale;
        const dh = h * scale;
        const color = p.class === "person" ? "#4f8cff" : "#2ecc71";

        ctx.strokeStyle = color;
        ctx.strokeRect(dx, dy, dw, dh);

        const label = `${p.class} ${Math.round(p.score * 100)}%`;
        const padding = 4;
        const textH = parseInt(ctx.font, 10);
        const textW = ctx.measureText(label).width;
        const labelY = Math.max(0, dy - textH - padding * 2);
        ctx.fillStyle = color;
        ctx.fillRect(dx, labelY, textW + padding * 2, textH + padding * 2);
        ctx.fillStyle = "#0b0b0f";
        ctx.fillText(label, dx + padding, labelY + padding);
      }
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [video, active, fps]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
      aria-hidden="true"
    />
  );
}
