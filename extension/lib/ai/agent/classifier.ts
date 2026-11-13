import { generateText } from "ai";
import { classifierModel } from "@/lib/ai/model";

export const INTENTS = ["summarise", "explain", "compare", "greet"] as const;

export type Intent = (typeof INTENTS)[number];

const SYSTEM = `Classify user intent and return one of the following: ${INTENTS.join(", ")}.`;

const LABEL_PATTERN = new RegExp(`\\b(${INTENTS.join("|")}|none)\\b`);

function parseLabel(raw: string): Intent | null {
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, " ").toLowerCase();
  const match = cleaned.match(LABEL_PATTERN);
  if (!match || match[1] === "none") return null;
  return match[1] as Intent;
}

export default async function classifyIntent(
  text: string,
): Promise<Intent | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const { text: raw } = await generateText({
      model: classifierModel,
      temperature: 0,
      maxOutputTokens: 32,
      system: SYSTEM,
      prompt: trimmed,
    });
    console.log("raw intent:", raw);
    return parseLabel(raw);
  } catch (error) {
    console.warn("intent classify failed", error);
    return null;
  }
}
