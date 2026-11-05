import type { UIMessage } from "ai";

type Turn = { id: string; messages: UIMessage[] };

// Group messages by turn
export const groupByTurn = (messages: UIMessage[]): Turn[] => {
  const turns: Turn[] = [];

  for (const message of messages) {
    if (message.role === "user" || turns.length === 0) {
      turns.push({ id: message.id, messages: [message] });
    } else {
      turns[turns.length - 1]?.messages.push(message);
    }
  }

  return turns;
};

type TraceBlock =
  | { kind: "text"; part: any }
  | { kind: "trace"; parts: any[] }
  | { kind: "other"; part: any };

// Group parts into blocks
export function groupParts(parts: UIMessage["parts"]): TraceBlock[] {
  const blocks: TraceBlock[] = [];

  for (const part of parts) {
    if (part.type === "step-start") continue;
    const last = blocks[blocks.length - 1];
    if (isTracePart(part)) {
      if (last?.kind === "trace") last.parts.push(part);
      else blocks.push({ kind: "trace", parts: [part] });
    } else if (part.type === "text") {
      blocks.push({ kind: "text", part });
    } else {
      blocks.push({ kind: "other", part });
    }
  }
  return blocks;
}

// Merge consecutive reasoning/tool parts into a single trace block
const isTracePart = (p: UIMessage["parts"][number]) =>
  p.type === "reasoning" ||
  p.type === "dynamic-tool" ||
  p.type.startsWith("tool-");
