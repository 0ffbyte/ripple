import { memo, useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { cn } from "cn";
import Markdown from "./markdown";
import { groupByTurn } from "@/lib/ui";
import { isFileUIPart, isTextUIPart, isToolUIPart, type ChatStatus } from "ai";
import Trace from "./trace";
import ToolWidget from "./tool-widget";
import type { RippleUIMessage } from "@/lib/ai/agent/types";

function Messages({
  messages,
  status,
}: {
  messages: RippleUIMessage[];
  status: ChatStatus;
}) {
  const turns = useMemo(() => groupByTurn(messages), [messages]);
  const lastTurnRef = useRef<HTMLDivElement>(null);

  // auto scroll
  useEffect(() => {
    if (turns.length < 2) return;
    lastTurnRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [turns.length]);

  if (messages.length === 0) return null;

  return (
    <motion.div
      layout="position"
      className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-3"
    >
      {turns.map((turn, idx) => {
        const isLastTurn = idx === turns.length - 1;

        return (
          <div
            key={idx}
            ref={isLastTurn ? lastTurnRef : undefined}
            className={cn(
              "flex flex-col gap-3 p-4 shrink-0 border-0 border-red-500",
              isLastTurn && "min-h-full",
            )}
          >
            {turn.messages.map((m) => {
              if (m.role === "user")
                return <UserMessage key={m.id} message={m} />;

              if (m.role === "assistant")
                return (
                  <AssistantMessage key={m.id} message={m} status={status} />
                );
            })}
          </div>
        );
      })}
    </motion.div>
  );
}

function AssistantMessage({
  message,
  status,
}: {
  message: RippleUIMessage;
  status: ChatStatus;
}) {
  const hasResponse = message.parts.some(
    (part) =>
      (isTextUIPart(part) && part.text.length > 0) || status !== "streaming",
  );

  return (
    <article key={message.id} className="w-full p-3 flex flex-col gap-2">
      <Trace
        parts={message.parts}
        hasResponse={hasResponse}
        intent={message.metadata?.intent}
        status={status}
      />
      {message.parts.map((part, idx) => {
        if (isTextUIPart(part)) {
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, filter: "blur(4px)", y: 12 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            >
              <Markdown
                id={message.id}
                value={part.text}
                streaming={part.state === "streaming"}
              />
            </motion.div>
          );
        }

        if (isToolUIPart(part)) {
          return <ToolWidget key={part.toolCallId} part={part} />;
        }
      })}
    </article>
  );
}

function UserMessage({ message }: { message: RippleUIMessage }) {
  return (
    <motion.article
      initial={{ opacity: 0, filter: "blur(4px)", y: 12 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.2 }}
      key={message.id}
      className="flex flex-col gap-2 w-fit items-end self-end max-w-[80%]"
    >
      {message.parts.map((part, idx) => {
        if (isTextUIPart(part))
          return (
            <div key={idx} className="w-fit p-3 py-2 bg-zinc-50/12 rounded-3xl">
              <p>{part.text}</p>
            </div>
          );
        if (isFileUIPart(part) && part.mediaType.startsWith("image/")) {
          return (
            <img
              key={idx}
              src={part.url}
              alt={part.filename ?? "Screenshot"}
              className="w-44 h-28 rounded-3xl bg-zinc-50/12 object-cover"
            />
          );
        }
      })}
    </motion.article>
  );
}

export default memo(Messages);
