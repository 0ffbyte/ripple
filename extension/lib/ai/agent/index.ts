import { hasToolCall, isStepCount, pruneMessages, ToolLoopAgent } from "ai";
import { z } from "zod";
import { model } from "../model";
import { toolRegistry } from "./tools";
import { loadSkills } from "../skills/registry";
import buildSystemPrompt from "./system";
import { INTENTS } from "./classifier";

const Agent = new ToolLoopAgent({
  model,
  tools: toolRegistry,
  stopWhen: [isStepCount(6), hasToolCall("get_weather")],
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxRetries: 3,
  callOptionsSchema: z.object({
    intent: z.enum(INTENTS).nullable(),
  }),
  prepareCall: async ({ options, ...settings }) => {
    const instructions = await buildSystemPrompt();
    const skills = options.intent ? await loadSkills([options.intent]) : [];
    console.log("intent:", options.intent);

    const prunedMessages = pruneMessages({
      messages: settings.messages?.slice(-4) ?? [], // smart compaction for assistant messages
      reasoning: "all",
      toolCalls: "before-last-1-messages",
      emptyMessages: "remove",
    });

    return {
      ...settings,
      messages: prunedMessages,
      instructions: [instructions, ...skills.map((s) => s.content)]
        .filter(Boolean)
        .join("\n\n"),
    };
  },
});

export default Agent;
