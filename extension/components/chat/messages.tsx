import { memo, useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { cn } from "cn";
import Markdown from "./markdown";
import { groupByTurn } from "@/lib/ui";
import { isTextUIPart, type ChatStatus, type UIMessage } from "ai";
import Trace from "./trace";

function Messages({
  messages,
  status,
}: {
  messages: UIMessage[];
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
                  <AssistantMessage
                    key={m.id}
                    message={m}
                    status={status}
                    isLastTurn={isLastTurn}
                  />
                );
            })}

            {!turn.messages.some((m) => m.role === "assistant") && <Loader />}
          </div>
        );
      })}
    </motion.div>
  );
}

function AssistantMessage({
  message,
}: {
  message: UIMessage;
  status: ChatStatus;
  isLastTurn: boolean;
}) {
  const hasResponse = message.parts.some(
    (part) => isTextUIPart(part) && part.text.length > 0,
  );

  return (
    <article key={message.id} className="w-full p-3 flex flex-col gap-2">
      <Trace parts={message.parts} hasResponse={hasResponse} />
      {message.parts.map((part, idx) => {
        switch (part.type) {
          case "text":
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
      })}
    </article>
  );
}

function UserMessage({ message }: { message: UIMessage }) {
  return (
    <motion.article
      initial={{ opacity: 0, filter: "blur(4px)", y: 12 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.2 }}
      key={message.id}
      className="w-fit p-3 bg-zinc-50/12 max-w-[80%] py-2 rounded-3xl self-end"
    >
      {message.parts.map((part, idx) => {
        if (part.type === "text") return <p key={idx}>{part.text}</p>;
      })}
    </motion.article>
  );
}

const RIPPLE_VERBS = [
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
function Loader() {
  return (
    <motion.p
      initial={{ opacity: 0, filter: "blur(4px)", y: 12 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.2, delay: 0.6 }}
      className="p-3 text-zinc-50/90 animate-pulse"
    >
      {RIPPLE_VERBS[Math.floor(Math.random() * RIPPLE_VERBS.length)]}
    </motion.p>
  );
}

export default memo(Messages);
