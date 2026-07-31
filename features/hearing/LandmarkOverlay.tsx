"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import type { FrameLandmarks, LandmarkPoint } from "@/features/hearing/fsl/types";

/**
 * Skeleton ("bones") overlay — pose, hands, and face contours.
 * Imperative draw() avoids React re-renders per frame (reference TANAW pattern).
 */

const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
];

const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

/** Face oval + eyes (MediaPipe face mesh contour subset). */
const FACE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389],
  [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397],
  [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152],
  [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
  [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162],
  [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10],
  [33, 246], [246, 161], [161, 160], [160, 159], [159, 158], [158, 157],
  [157, 173], [173, 133], [133, 155], [155, 154], [154, 153], [153, 145],
  [145, 144], [144, 163], [163, 7], [263, 466], [466, 388], [388, 387],
  [387, 386], [386, 385], [385, 384], [384, 398], [398, 362], [362, 382],
  [382, 381], [381, 380], [380, 374], [374, 373], [373, 390], [390, 249],
  [249, 263],
];

const JOINT_COLOR = "rgb(80, 255, 100)";
const LINE_COLOR = "rgb(0, 200, 60)";
const FACE_LINE_COLOR = "rgb(0, 220, 80)";

export interface LandmarkOverlayHandle {
  draw(frame: FrameLandmarks | null): void;
  clear(): void;
}

interface LandmarkOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mirrored?: boolean;
}

export const LandmarkOverlay = forwardRef<
  LandmarkOverlayHandle,
  LandmarkOverlayProps
>(function LandmarkOverlay({ videoRef, mirrored = true }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    draw(frame: FrameLandmarks | null) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || video.videoWidth === 0) return;
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!frame) return;

      const lineWidth = Math.max(2, canvas.width / 320);
      const jointRadius = Math.max(3, canvas.width / 200);

      drawSet(
        ctx,
        frame.pose,
        POSE_CONNECTIONS,
        canvas.width,
        canvas.height,
        lineWidth,
        jointRadius,
        LINE_COLOR,
        JOINT_COLOR,
      );
      drawSet(
        ctx,
        frame.leftHand,
        HAND_CONNECTIONS,
        canvas.width,
        canvas.height,
        lineWidth,
        jointRadius,
        LINE_COLOR,
        JOINT_COLOR,
      );
      drawSet(
        ctx,
        frame.rightHand,
        HAND_CONNECTIONS,
        canvas.width,
        canvas.height,
        lineWidth,
        jointRadius,
        LINE_COLOR,
        JOINT_COLOR,
      );
      drawSet(
        ctx,
        frame.face,
        FACE_CONNECTIONS,
        canvas.width,
        canvas.height,
        Math.max(1, lineWidth * 0.75),
        Math.max(2, jointRadius * 0.6),
        FACE_LINE_COLOR,
        JOINT_COLOR,
        false,
      );
    },
    clear() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
      aria-hidden="true"
    />
  );
});

function drawSet(
  ctx: CanvasRenderingContext2D,
  landmarks: LandmarkPoint[] | null,
  connections: ReadonlyArray<readonly [number, number]>,
  width: number,
  height: number,
  lineWidth: number,
  jointRadius: number,
  lineColor: string,
  jointColor: string,
  drawJoints = true,
) {
  if (!landmarks || landmarks.length === 0) return;

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  for (const [i, j] of connections) {
    const a = landmarks[i];
    const b = landmarks[j];
    if (!a || !b) continue;
    ctx.moveTo(a.x * width, a.y * height);
    ctx.lineTo(b.x * width, b.y * height);
  }
  ctx.stroke();

  if (!drawJoints) return;

  ctx.fillStyle = jointColor;
  for (const lm of landmarks) {
    ctx.beginPath();
    ctx.arc(lm.x * width, lm.y * height, jointRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}
