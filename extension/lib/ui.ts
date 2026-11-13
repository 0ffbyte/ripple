import type { RippleUIMessage } from "@/lib/ai/agent/types";

// Group messages by turn
type Turn = { id: string; messages: RippleUIMessage[] };

export const groupByTurn = (messages: RippleUIMessage[]): Turn[] => {
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
