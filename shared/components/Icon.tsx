import type { CSSProperties } from "react";

export type IconName =
  | "mic"
  | "micOff"
  | "flash"
  | "flipCamera"
  | "video"
  | "phone"
  | "camera"
  | "speaker"
  | "earListen";

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 24, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {GLYPHS[name]}
    </svg>
  );
}

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const GLYPHS: Record<IconName, JSX.Element> = {
  mic: (
    <g>
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" fill="currentColor" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" {...STROKE} />
      <line x1="12" y1="17.5" x2="12" y2="21.5" {...STROKE} />
      <line x1="8" y1="21.5" x2="16" y2="21.5" {...STROKE} />
    </g>
  ),
  micOff: (
    <g>
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" fill="currentColor" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" {...STROKE} />
      <line x1="12" y1="17.5" x2="12" y2="21.5" {...STROKE} />
      <line x1="8" y1="21.5" x2="16" y2="21.5" {...STROKE} />
      <line x1="3" y1="3" x2="21" y2="21" {...STROKE} strokeWidth="2.4" />
    </g>
  ),
  flash: (
    <path
      d="M13 2 4.5 13.4c-.3.4 0 1 .5 1H10l-1.6 6.8c-.1.6.6 1 1 .5L20 9.6c.3-.4 0-1-.5-1H14l1.2-5.9c.1-.6-.6-1-1-.7Z"
      fill="currentColor"
    />
  ),
  flipCamera: (
    <g {...STROKE} strokeWidth="2">
      <rect x="5" y="7" width="14" height="10" rx="2" />
      <path d="M9 4.5 7 7h2.5M15 4.5 17 7h-2.5M9 19.5 7 17h2.5M15 19.5 17 17h-2.5" />
      <path d="m7 7-2-2M17 7 19 5M7 17l-2 2M17 17l2 2" />
    </g>
  ),
  video: (
    <g fill="currentColor">
      <rect x="2" y="6" width="14" height="12" rx="2.5" />
      <path d="M16 10.2 22 6.6v10.8L16 13.8Z" />
    </g>
  ),
  phone: (
    <path
      d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.1-.2 1.1.4 2.4.6 3.7.6.6 0 1.1.5 1.1 1.1V20c0 .6-.5 1.1-1.1 1.1C10.6 21.1 3 13.5 3 4.1 3 3.5 3.5 3 4.1 3h3.4c.6 0 1.1.5 1.1 1.1 0 1.3.2 2.6.6 3.7.1.4 0 .8-.3 1.1l-2.3 1.9Z"
      fill="currentColor"
    />
  ),
  camera: (
    <g {...STROKE}>
      <path d="M3 8.5a2 2 0 0 1 2-2h2l1.3-2h7.4L17 6.5h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z" />
      <circle cx="12" cy="13" r="3.6" />
    </g>
  ),
  speaker: (
    <g fill="currentColor">
      <path d="M4 9.5v5h3l4.5 3.5V6L7 9.5H4Z" />
      <path
        d="M14.5 8.5a4.5 4.5 0 0 1 0 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16.8 6.2a7.5 7.5 0 0 1 0 11.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </g>
  ),
  earListen: (
    <g fill="currentColor">
      <path d="M8.2 6.8C9.8 4.9 12.8 4.6 14.8 6.3c2.1 1.8 2.4 4.9.7 7-1 1.4-1.4 2.2-1.5 3.2-.1.8.4 1.5 1.2 1.6l.4.1c.8.1 1.4-.5 1.5-1.3.2-1.8.8-3 2-4.6 2.5-3.2 2.1-7.8-.9-10.6C14.8 1.5 10.6 1.1 7.6 3.4 5.1 5.4 4 8.4 4.8 11.2c.3 1 .9 1.8 1.6 2.4.6.5 1.5.4 2-.2.5-.6.4-1.5-.2-2-.5-.4-.8-1-.9-1.6-.5-1.8.2-3.7 1.9-5Z" />
      <path
        d="M17.5 9.2a5.2 5.2 0 0 1 0 5.6M19.6 7.1a8 8 0 0 1 0 9.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </g>
  ),
};
