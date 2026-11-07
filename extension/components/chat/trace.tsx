import { useState, useEffect, useRef } from "react";
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
import type { ReadTabTool, WebSearchTool } from "@/lib/ai/agent/tools";
import { playTraceCue } from "@/lib/audio";

const getTraceLabel = (isActive: boolean, seconds: number) => {
  if (isActive) return "Rippling";
  if (seconds > 1) return `Worked for ${seconds}s`;
  return `Done`;
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

  const elapsed = useRef(0);
  const wasActive = useRef<boolean | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (wasActive.current === null) {
      wasActive.current = isActive;
      if (isActive) playTraceCue("start");
      return;
    }

    if (wasActive.current !== isActive) {
      playTraceCue(isActive ? "start" : "end");
      wasActive.current = isActive;
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      setOpen(false);
      setSeconds(Math.floor(elapsed.current / 1000));
      return;
    }

    const resumedAt = Date.now() - elapsed.current;
    const sync = () => {
      elapsed.current = Date.now() - resumedAt;
    };

    const id = window.setInterval(() => {
      sync();
      setSeconds(Math.floor(elapsed.current / 1000));
    }, 1000);

    return () => {
      window.clearInterval(id);
      sync();
    };
  }, [isActive]);

  if (parts.length === 0) return null;

  return (
    <motion.div
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
        className={cn(
          "text-zinc-50/60",
          isActive ? "animate-pulse text-zinc-50/90" : "",
        )}
      >
        {getTraceLabel(isActive, seconds)}
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

type ToolStatus = "pending" | "running" | "done" | "error";

const formatToolName = (name: string) => name.replace(/[-_]/g, " ");

const ToolStep = ({ part }: { part: ToolUIPart }) => {
  const name = part.type.startsWith("tool-") ? part.type.slice(5) : part.type;

  const status: ToolStatus =
    part.state === "output-available"
      ? "done"
      : part.state === "output-error"
        ? "error"
        : part.state === "input-available"
          ? "running" // args complete, tool executing
          : "pending"; // input-streaming, args still arriving

  const isLive = status === "pending" || status === "running";

  switch (name) {
    case "web_search": {
      const query = (part.input as Partial<WebSearchTool["input"]> | undefined)
        ?.query;

      const verb =
        status === "done"
          ? "Searched"
          : status === "error"
            ? "Failed searching"
            : "Searching";

      return (
        <p className={cn("text-zinc-50/60", isLive && "animate-pulse")}>
          {verb} the web
          {query && (
            <>
              {" "}
              for <span className="text-zinc-50/90">{query}</span>
            </>
          )}
        </p>
      );
    }

    case "read_tab": {
      const tabTitle = (part.input as Partial<ReadTabTool["input"]> | undefined)
        ?.tabTitle;

      const verb =
        status === "done"
          ? "Read"
          : status === "error"
            ? "Failed reading"
            : "Reading";

      return (
        <p className={cn("text-zinc-50/60", isLive && "animate-pulse")}>
          {verb}{" "}
          {tabTitle ? (
            <span className="text-zinc-50/90">{tabTitle}</span>
          ) : (
            "a tab"
          )}
        </p>
      );
    }

    default: {
      const label = formatToolName(name);
      return (
        <p className={cn("text-zinc-50/60", isLive && "animate-pulse")}>
          {isLive
            ? "Calling"
            : status === "error"
              ? "Failed calling"
              : "Called"}{" "}
          <span className="text-zinc-50/90">{label}</span>
        </p>
      );
    }
  }
};
