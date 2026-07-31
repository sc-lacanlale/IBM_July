"use client";

type FaceApi = typeof import("@vladmandic/face-api");

const MODELS_URI = "/models/face";
const MATCH_THRESHOLD = 0.5;
const STORE_KEY = "tanaw:people";

let faceapi: FaceApi | null = null;
let loadPromise: Promise<boolean> | null = null;
let hiddenVideo: HTMLVideoElement | null = null;

export interface Person {
  id: string;
  label: string;
  descriptor: number[];
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function modelsBase(): string {
  if (typeof window === "undefined") return MODELS_URI;
  return `${window.location.origin}${MODELS_URI}`;
}

export async function loadFaceModels(): Promise<boolean> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const mod = await import("@vladmandic/face-api");
      faceapi = mod;
      await (faceapi.tf as unknown as { ready: () => Promise<void> }).ready();
      const base = modelsBase();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(base),
        faceapi.nets.faceLandmark68Net.loadFromUri(base),
        faceapi.nets.faceRecognitionNet.loadFromUri(base),
      ]);
      return true;
    } catch (err) {
      console.warn("[face] model load failed:", err);
      faceapi = null;
      return false;
    }
  })();
  return loadPromise;
}

async function videoForStream(
  stream: MediaStream | null,
): Promise<HTMLVideoElement | null> {
  if (!stream || typeof document === "undefined") return null;
  if (!hiddenVideo) {
    hiddenVideo = document.createElement("video");
    hiddenVideo.muted = true;
    hiddenVideo.playsInline = true;
    hiddenVideo.setAttribute("aria-hidden", "true");
    Object.assign(hiddenVideo.style, {
      position: "fixed",
      width: "1px",
      height: "1px",
      opacity: "0",
      pointerEvents: "none",
      left: "-10px",
      top: "-10px",
    });
    document.body.appendChild(hiddenVideo);
  }
  if (hiddenVideo.srcObject !== stream) {
    hiddenVideo.srcObject = stream;
    await hiddenVideo.play().catch(() => {});
  }
  for (let i = 0; i < 40; i++) {
    if (hiddenVideo.readyState >= 2 && hiddenVideo.videoWidth > 0) break;
    await sleep(50);
  }
  return hiddenVideo.videoWidth > 0 ? hiddenVideo : null;
}

async function descriptorFromStream(
  stream: MediaStream | null,
): Promise<Float32Array | null> {
  const ok = await loadFaceModels();
  if (!ok || !faceapi) return null;
  const video = await videoForStream(stream);
  if (!video) return null;
  try {
    const opts = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.5,
    });
    const result = await faceapi
      .detectSingleFace(video, opts)
      .withFaceLandmarks()
      .withFaceDescriptor();
    return result?.descriptor ?? null;
  } catch (err) {
    console.warn("[face] descriptor failed:", err);
    return null;
  }
}

export function listPeople(): Person[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Person[]) : [];
  } catch {
    return [];
  }
}

function savePeople(people: Person[]) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(people));
  } catch {
    /* ignore */
  }
}

export function removePerson(id: string): void {
  savePeople(listPeople().filter((p) => p.id !== id));
}

export type EnrollResult = "ok" | "no-face" | "unavailable";

export async function enrollFromStream(
  stream: MediaStream | null,
  label: string,
): Promise<EnrollResult> {
  const ok = await loadFaceModels();
  if (!ok) return "unavailable";
  const desc = await descriptorFromStream(stream);
  if (!desc) return "no-face";
  const people = listPeople();
  people.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: label.trim(),
    descriptor: Array.from(desc),
  });
  savePeople(people);
  return "ok";
}

export async function identifyFromStream(
  stream: MediaStream | null,
): Promise<string | null> {
  const people = listPeople();
  if (people.length === 0) return null;
  const desc = await descriptorFromStream(stream);
  if (!desc || !faceapi) return null;

  let bestLabel: string | null = null;
  let bestDist = Infinity;
  for (const p of people) {
    try {
      const dist = faceapi.euclideanDistance(
        desc,
        Float32Array.from(p.descriptor),
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestLabel = p.label;
      }
    } catch {
      /* skip */
    }
  }
  return bestDist <= MATCH_THRESHOLD ? bestLabel : null;
}
