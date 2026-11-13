import type { Intent } from "@/lib/ai/agent/classifier";

const RIPPLE_VERBS = [
  // Original
  "Rippling",
  "Skimming",
  "Fathoming",
  "Eddying",
  "Surfacing",
  "Plumbing",
  "Dowsing",
  "Drifting",
  "Settling",
  "Wading",
  "Welling",
  "Sounding",
];

const THOUGHT_LABELS: Record<Intent, readonly string[]> = {
  summarise: [
    "Skimmed this",
    "Boiled it down",
    "Pulled out the gist",
    "Read through it quickly",
  ],
  explain: [
    "Dove through it",
    "Worked through the details",
    "Broke it down",
    "Traced how it fits together",
  ],
  compare: [
    "Weighed both sides",
    "Set them side by side",
    "Held them up against each other",
    "Looked at the tradeoffs",
  ],
  greet: [
    "Thought briefly",
    "Took a moment",
    "Paused for a beat",
    "Gave it a quick think",
  ],
};

export default function getRippleVerb() {
  return RIPPLE_VERBS[Math.floor(Math.random() * RIPPLE_VERBS.length)];
}

export function getThoughtLabel(intent: Intent | null | undefined): string {
  if (!intent) return "Thought briefly";
  const labels = THOUGHT_LABELS[intent];
  return labels[Math.floor(Math.random() * labels.length)]!;
}
