export type ModeId = "outdoor" | "indoor" | "social" | "study" | "cooking";

export interface ModeDefinition {
  id: ModeId;
  label: string;
  description: string;
  focus: string;
  priorities: string[];
  targetFps: number;
  color: string;
  icon: string;
  voicePurpose: string;
}

export const MODES: Record<ModeId, ModeDefinition> = {
  outdoor: {
    id: "outdoor",
    label: "Outdoor",
    description: "Low-latency awareness while moving.",
    focus: "Low-latency, high-contrast moving object detection",
    priorities: [
      "Traffic movement",
      "Pedestrian flow",
      "Reading signage (bus stops, street names)",
    ],
    targetFps: 20,
    color: "#FFE374",
    icon: "sun",
    voicePurpose: "para sa paglalakad o pagbiyahe sa labas",
  },
  indoor: {
    id: "indoor",
    label: "Indoor",
    description: "Navigate rooms and find things at home.",
    focus: "Indoor layout, doorways, furniture and obstacles",
    priorities: [
      "Doorways and walkways",
      "Furniture and obstacles",
      "Finding everyday objects",
    ],
    targetFps: 12,
    color: "#ffb27a",
    icon: "house",
    voicePurpose: "para sa loob ng bahay at paghahanap ng gamit",
  },
  social: {
    id: "social",
    label: "Social",
    description: "Read people and social cues around you.",
    focus: "People, expressions and social context",
    priorities: [
      "Who is nearby",
      "Facial expressions and gestures",
      "Where people are facing",
    ],
    targetFps: 8,
    color: "#c9e57c",
    icon: "users",
    voicePurpose: "para sa mga tao at usapan sa paligid",
  },
  study: {
    id: "study",
    label: "Study",
    description: "Read text in front of you.",
    focus: "Basahin ang teksto sa harap — libro, papel, screen, o anumang nakasulat",
    priorities: [
      "Basahin nang eksakto ang nakikitang teksto",
      "Sunud-sunod mula simula hanggang dulo",
      "Sabihin kung malabo o walang mababasang teksto",
    ],
    targetFps: 1,
    color: "#87e1dd",
    icon: "book",
    voicePurpose: "para sa pagbabasa ng teksto sa harap mo",
  },
  cooking: {
    id: "cooking",
    label: "Cooking",
    description: "Close-range help around the kitchen.",
    focus: "1-meter radius spatial reasoning",
    priorities: [
      "Sharp edge tracking (knives)",
      "Heat / hazard indicators (boiling water, steam)",
      "Ingredient identification",
    ],
    targetFps: 8,
    color: "#b7bdff",
    icon: "cutlery",
    voicePurpose: "para sa kusina at pagluluto",
  },
};

export const MODE_LIST: ModeDefinition[] = [
  MODES.outdoor,
  MODES.indoor,
  MODES.social,
  MODES.study,
  MODES.cooking,
];

export function getMode(id: ModeId): ModeDefinition {
  return MODES[id];
}

export const VOICE = {
  welcome:
    "Maligayang pagdating sa TANAW. Anong mode ang gusto mong gamitin? " +
    "Kung hindi mo alam ang mga mode, sabihin: TANAW, ano ang mga mode.",
  modesList(): string {
    const items = MODE_LIST.map((m) => `${m.label}, ${m.voicePurpose}`);
    return (
      "Ito ang mga mode. " +
      items.join(". ") +
      ". At Video Call, para tumawag ng volunteer o tulong. " +
      "Pumili ng isa. Sabihin: TANAW, at ang pangalan ng mode."
    );
  },
};
