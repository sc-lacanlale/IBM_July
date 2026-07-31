"use client";

import type { ModeDefinition } from "@/features/vision/modes";
import { createFrameGrabber, type FrameGrabber } from "@/services/camera";

export type SessionStatus = "idle" | "connecting" | "live" | "error";

export interface GeminiSession {
  status: SessionStatus;
  stop: () => void;
  describe: (prompt?: string) => void;
}

export interface StartSessionOptions {
  mode: ModeDefinition;
  stream?: MediaStream | null;
  getStream?: () => MediaStream | null;
  onStatus?: (status: SessionStatus) => void;
  onMessage?: (text: string) => void;
}

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash";
const MODEL_CHAIN = [MODEL, "gemini-2.5-flash-lite", "gemini-flash-latest"].filter(
  (m, i, a) => a.indexOf(m) === i,
);

function systemInstructionFor(mode: ModeDefinition): string {
  if (mode.id === "study") {
    return [
      "Ikaw ay OCR reader para sa taong bulag o may kapansanan sa paningin.",
      "Basahin ang teksto sa larawan nang eksakto at sunud-sunod.",
      "OUTPUT RULE: I-output LANG ang mismong teksto. Walang panimula, walang paliwanag.",
      "HUWAG magsabi ng 'Ito ang aking nakikita', 'Narito ang teksto', 'Basahin', o anumang intro.",
      "Huwag ilarawan ang mga bagay, tao, o eksena — teksto lang.",
      "Kung walang mababasang teksto, sabihin lamang: Walang mababasang teksto.",
      "Sumagot sa wikang Filipino bilang default maliban kung ang teksto ay nasa ibang wika.",
    ].join(" ");
  }

  return [
    "Ikaw si TANAW, isang AI vision assistant para sa taong bulag o may kapansanan sa paningin.",
    "Sumagot nang maikli, malinaw, at deretso (1 hanggang 3 pangungusap). Unahin ang anumang delikado o mapanganib.",
    "Huwag mag-imbento ng detalyeng hindi mo nakikita sa larawan.",
    "Sumagot sa wikang Filipino bilang default. Kung ang tanong ng user ay nasa Ingles, sumagot sa Ingles.",
    `Mode ngayon: ${mode.label}. Focus: ${mode.focus}.`,
    `Bigyang-pansin: ${mode.priorities.join("; ")}.`,
  ].join(" ");
}

function describePromptFor(mode: ModeDefinition, prompt?: string): string {
  if (prompt) {
    const lower = prompt.toLowerCase();
    if (
      /where is|where's|where are|saan (ang|yung)|nasa saan|nasaan|hanapin|find (my|the)|look for/.test(
        lower,
      )
    ) {
      return (
        `${prompt}. Tingnan ang larawan. Sabihin kung nakikita mo ang hinahanap, ` +
        `kung saan sa eksena (harap, kaliwa, kanan, itaas, ibaba), at gaano kalapit kung kaya. ` +
        `Kung wala sa larawan, sabihing hindi mo makita.`
      );
    }
    return prompt;
  }
  if (mode.id === "study") {
    if (prompt) {
      return (
        `Basahin ang teksto sa larawan. ${prompt}. ` +
        "I-output LANG ang mismong teksto — walang panimula o paliwanag."
      );
    }
    return (
      "Basahin ang lahat ng teksto sa larawang ito. " +
      "I-output LANG ang mismong teksto — walang panimula o paliwanag."
    );
  }
  return "Ano ang nasa harap ko ngayon? Ilarawan nang maikli at unahin ang anumang delikado.";
}

function captureOptionsFor(mode: ModeDefinition) {
  if (mode.id === "study") {
    return { maxEdge: 1280, quality: 0.85 };
  }
  return { maxEdge: 768, quality: 0.6 };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Remove common Gemini preambles so study mode reads only the text. */
export function formatStudyReading(text: string): string {
  let s = text.trim();
  const preambles = [
    /^ito ang (aking )?nakikita[^:.\n]*[:.]?\s*/i,
    /^ito ang (aking )?nasasaklaw[^:.\n]*[:.]?\s*/i,
    /^nakikita ko[^:.\n]*[:.]?\s*/i,
    /^narito ang teksto[^:.\n]*[:.]?\s*/i,
    /^ito ang teksto[^:.\n]*[:.]?\s*/i,
    /^ang teksto (ay|:)[^:.\n]*[:.]?\s*/i,
    /^basahin[^:.\n]*[:.]?\s*/i,
    /^text (found|detected|in (the )?image)[^:.\n]*[:.]?\s*/i,
    /^here('s| is) the text[^:.\n]*[:.]?\s*/i,
    /^the text (reads|says|is)[^:.\n]*[:.]?\s*/i,
  ];
  for (const re of preambles) {
    s = s.replace(re, "");
  }
  return s.trim();
}

function startStubSession(options: StartSessionOptions): GeminiSession {
  const { mode, onStatus, onMessage } = options;
  onStatus?.("connecting");
  setTimeout(() => {
    onStatus?.("live");
    onMessage?.(
      `${mode.label} ready (demo mode — add a Gemini API key for live descriptions).`,
    );
  }, 400);
  return {
    status: "live",
    stop: () => onStatus?.("idle"),
    describe: () =>
      onMessage?.(
        mode.id === "study"
          ? "Demo mode: add a Gemini API key to read text in view."
          : "Demo mode: add a Gemini API key to describe what's in view.",
      ),
  };
}

function startLiveSession(options: StartSessionOptions): GeminiSession {
  const { mode, stream, getStream, onStatus, onMessage } = options;
  let grabber: FrameGrabber | null = null;
  let grabberStream: MediaStream | null = null;
  let busy = false;
  let stopped = false;
  let aiClient: unknown = null;

  const resolveStream = (): MediaStream | null => getStream?.() ?? stream ?? null;

  const session: GeminiSession = {
    status: "live",
    stop: () => {
      stopped = true;
      grabber?.dispose();
      grabber = null;
      onStatus?.("idle");
    },
    describe: (prompt?: string) => void runDescribe(prompt),
  };

  onStatus?.("live");

  async function captureFrame(): Promise<string | null> {
    const s = resolveStream();
    if (!s) return null;
    if (!grabber || grabberStream !== s) {
      grabber?.dispose();
      grabber = createFrameGrabber(s, captureOptionsFor(mode));
      grabberStream = s;
    }
    for (let i = 0; i < 12 && !stopped; i++) {
      const data = grabber.capture();
      if (data) return data;
      await sleep(150);
    }
    return null;
  }

  async function getClient() {
    if (aiClient) return aiClient;
    const { GoogleGenAI } = await import("@google/genai");
    aiClient = new GoogleGenAI({ apiKey: API_KEY as string });
    return aiClient;
  }

  const isTransient = (msg: string) =>
    msg.includes("503") ||
    msg.toUpperCase().includes("UNAVAILABLE") ||
    msg.includes("429") ||
    msg.toLowerCase().includes("overloaded") ||
    msg.toLowerCase().includes("high demand");

  async function generateWithFallback(parts: unknown[]): Promise<string> {
    const ai = (await getClient()) as {
      models: {
        generateContent: (req: unknown) => Promise<{ text?: string }>;
      };
    };
    let lastMsg = "";
    for (const model of MODEL_CHAIN) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await ai.models.generateContent({
            model,
            config: { systemInstruction: systemInstructionFor(mode) },
            contents: [{ role: "user", parts }],
          });
          return (res.text || "").trim();
        } catch (err) {
          lastMsg = String((err as { message?: string })?.message ?? err);
          if (isTransient(lastMsg)) {
            await sleep(700 * (attempt + 1));
            continue;
          }
          throw err;
        }
      }
    }
    throw new Error(lastMsg || "All models unavailable");
  }

  async function runDescribe(prompt?: string) {
    if (busy) return;
    busy = true;
    try {
      const data = await captureFrame();
      if (!data) {
        onMessage?.("Camera is not ready yet. Try again in a moment.");
        return;
      }
      const raw = (await generateWithFallback([
        { text: describePromptFor(mode, prompt) },
        { inlineData: { mimeType: "image/jpeg", data } },
      ])).trim();
      const text =
        mode.id === "study" ? formatStudyReading(raw) || raw : raw;
      onMessage?.(
        text ||
          (mode.id === "study"
            ? "Walang mababasang teksto. Itutok ang camera sa papel o screen."
            : "I couldn't make out the scene clearly."),
      );
    } catch (err) {
      const msg = String((err as { message?: string })?.message ?? err);
      if (isTransient(msg)) {
        onMessage?.(
          "The assistant is busy right now. Please try again in a few seconds.",
        );
      } else {
        onStatus?.("error");
        onMessage?.(
          "Could not reach the assistant. Check your connection or API key.",
        );
      }
    } finally {
      busy = false;
    }
  }

  return session;
}

export function startSession(options: StartSessionOptions): GeminiSession {
  if (!API_KEY) return startStubSession(options);
  return startLiveSession(options);
}

/** Polish FSL gloss sequence into natural Tagalog. Offline fallback joins labels. */
export async function semanticPolish(signs: string[]): Promise<string> {
  const joined = signs.filter(Boolean).join(" ");
  if (!joined) return "";
  if (!API_KEY) return joined;

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_CHAIN[0],
      config: {
        systemInstruction:
          "Ikaw ay tumutulong sa TANAW. Gawing natural na pangungusap sa Tagalog ang mga FSL gloss o Label. " +
          "Huwag magdagdag ng bagong kahulugan. Isang maikling pangungusap lang.",
      },
      contents: [
        {
          role: "user",
          parts: [{ text: `Gawing Tagalog: ${joined}` }],
        },
      ],
    });
    return (res.text || joined).trim();
  } catch {
    return joined;
  }
}
