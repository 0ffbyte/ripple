import {
  isStepCount,
  pruneMessages,
  ToolLoopAgent,
  type ModelMessage,
} from "ai";
import { model } from "../model";
import { toolRegistry } from "./tools";
import buildSystemPrompt from "./system";
import classify from "@/lib/classify-intent";
import { loadSkill, loadSkills } from "../skills/registry";

const COMPACT_AFTER_TOKENS = 1200;

const estimateTokens = (messages: ModelMessage[]) => {
  return JSON.stringify(messages).length / 4;
};

function getLastUserMessage(settings: any, depth: number = 1): string {
  if (typeof settings.prompt === "string") return settings.prompt;

  const messages = settings.messages ?? settings.prompt ?? [];

  return messages
    .filter((m: any) => m.role === "user")
    .slice(-Math.max(1, depth))
    .map((m: any) => {
      if (typeof m.content === "string") return m.content;
      if (!Array.isArray(m.content)) return "";
      return m.content
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join(" ");
    })
    .filter(Boolean)
    .join("\n\n");
}

const Agent = new ToolLoopAgent({
  model,
  tools: toolRegistry,
  stopWhen: isStepCount(5),
  prepareCall: async ({ ...settings }) => {
    const instructions = await buildSystemPrompt();
    return {
      ...settings,
      instructions,
    };
  },
  prepareStep: async ({ steps, messages, instructions }) => {
    // Compaction first, as before
    const compacted =
      estimateTokens(messages) > COMPACT_AFTER_TOKENS
        ? pruneMessages({
            messages: messages.slice(-3),
            reasoning: "all",
            toolCalls: "before-last-1-messages",
            emptyMessages: "remove",
          })
        : undefined;

    // Only infer intent once the agent has actually done tool work,
    if (steps.length === 0) {
      return compacted ? { messages: compacted } : undefined;
    }

    const lastUser = getLastUserMessage({ messages });
    const toolTrace = steps
      .flatMap((s) => s.toolCalls)
      .map((c) => `${c.toolName}(${JSON.stringify(c.input).slice(0, 200)})`)
      .join("\n");

    const intents = classify(`${lastUser}\n[tools]\n${toolTrace}`)
      .slice(0, 2)
      .map((r) => r.intent);

    const skills = await loadSkills(intents);

    console.log("intents:", intents);

    return {
      ...(compacted && { messages: compacted }),
      system: [instructions, ...skills.map((s) => s.content)]
        .filter(Boolean)
        .join("\n\n"),
    };
  },
});

export default Agent;
