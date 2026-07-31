export type HandoffTarget =
  | "volunteer"
  | "emergency-contact"
  | "emergency-services";

export interface HandoffSession {
  target: HandoffTarget;
  cancel: () => void;
}

export interface StartHandoffOptions {
  target: HandoffTarget;
  contextSummary?: string;
  onConnected?: () => void;
}

/** Stub WebRTC handoff — simulates connect delay then plays local volunteer video. */
export function startHandoff(options: StartHandoffOptions): HandoffSession {
  const { target, contextSummary, onConnected } = options;
  const timers: ReturnType<typeof setTimeout>[] = [];

  timers.push(
    setTimeout(() => {
      onConnected?.();
    }, 2800),
  );

  return {
    target,
    cancel: () => timers.forEach(clearTimeout),
  };
}
