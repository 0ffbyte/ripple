import { useState, useEffect } from "react";
import { motion } from "motion/react";
import Markdown from "./markdown";
import {
  isReasoningUIPart,
  isToolUIPart,
  type ReasoningUIPart,
  type ToolUIPart,
  type UIMessage,
} from "ai";
import { cn } from "cn";

const getTraceLabel = (isActive: boolean) => {
  if (isActive) return "Working";
  return "Done";
};

const getToolLabel = (name: string, input: any, status: ToolStatus) => {
  return (
    <p
      className={cn("text-zinc-50/60", status === "running" && "animate-pulse")}
    >
      {status === "running" ? "Calling " : "Called "}
      <span className="text-zinc-50/90">{name}</span>
    </p>
  );
};

export default function Trace({
  parts,
  hasResponse,
}: {
  parts: UIMessage["parts"];
  hasResponse: boolean;
}) {
  const traceParts = parts.filter(
    (p) => isReasoningUIPart(p) || isToolUIPart(p),
  );
  const isActive =
    traceParts.some((part) => "state" in part && part.state === "streaming") ||
    !hasResponse;
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (!isActive) setOpen(false);
  }, [isActive]);

  if (parts.length === 0) return null;

  return (
    <motion.div
      key={parts.length}
      initial={{ opacity: 0, filter: "blur(4px)", y: 12 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full items-start flex flex-col gap-2 max-w-xl"
    >
      <motion.button
        name="trace-label"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn("text-zinc-50/60", isActive ? "animate-pulse" : "")}
      >
        {getTraceLabel(isActive)}
      </motion.button>

      {/* trace parts */}
      {open && (
        <motion.ol className="flex flex-col gap-2">
          {traceParts.map((part, idx) => {
            if (part.type === "reasoning")
              return <ReasoningStep key={idx} part={part} />;
            else return <ToolStep key={idx} part={part as ToolUIPart} />;
          })}
        </motion.ol>
      )}
    </motion.div>
  );
}

const ReasoningStep = ({ part }: { part: ReasoningUIPart }) => {
  const isActive = part.state === "streaming";

  return (
    <li className="text-zinc-50/60 whitespace-pre-wrap leading-relaxed">
      {isActive ? (
        <Markdown value={part.text} streaming={isActive} />
      ) : (
        <p>Thought briefly</p>
      )}
    </li>
  );
};

type ToolStatus = "running" | "done" | "error";

const ToolStep = ({ part }: { part: ToolUIPart }) => {
  const name = part.type.startsWith("tool-") ? part.type.slice(5) : part.type;
  const input = part.input;

  const status: ToolStatus =
    part.state === "output-available"
      ? "done"
      : part.state === "output-error"
        ? "error"
        : "running";

  return getToolLabel(name, input, status);
};
