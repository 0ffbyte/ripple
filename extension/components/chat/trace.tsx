import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import Markdown from "./markdown";
import {
  isReasoningUIPart,
  isToolUIPart,
  type ChatStatus,
  type ReasoningUIPart,
  type ToolUIPart,
  type UIMessage,
} from "ai";
import { cn } from "cn";
import type { ReadTabTool, SearchWebTool } from "@/lib/ai/agent/tools";
import { playTraceCue } from "@/lib/audio";
import { getThoughtLabel } from "@/lib/verbs";
import type { Intent } from "@/lib/ai/agent/classifier";
import getRippleVerb from "@/lib/verbs";

const getTraceLabel = (isActive: boolean, seconds: number) => {
  if (isActive) return "Rippling";
  if (seconds > 1) return `Worked for ${seconds}s`;
  return `Done`;
};

function TraceLoader() {
  const rippleVerb = useMemo(() => getRippleVerb(), []);
  return (
    <motion.p
      key="trace-loader"
      initial={{ opacity: 0, filter: "blur(4px)", y: 12 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.2 }}
      className=" text-zinc-50/90 animate-pulse"
    >
      {rippleVerb}
    </motion.p>
  );
}
export default function Trace({
  parts,
  hasResponse,
  status,
  intent,
}: {
  parts: UIMessage["parts"];
  hasResponse: boolean;
  status: ChatStatus;
  intent?: Intent | null;
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

  if (status === "submitted") return <TraceLoader />;

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
              return <ReasoningStep key={idx} part={part} intent={intent} />;
            else return <ToolStep key={idx} part={part as ToolUIPart} />;
          })}
        </motion.ol>
      )}
    </motion.div>
  );
}

const ReasoningStep = ({
  part,
  intent,
}: {
  part: ReasoningUIPart;
  intent?: Intent | null;
}) => {
  const isActive = part.state === "streaming";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [part.text, isActive]);

  const label = useMemo(() => getThoughtLabel(intent), [intent]);
  if (!isActive && label == null) return null;

  return (
    <li className="text-zinc-50/60 whitespace-pre-wrap leading-relaxed">
      {isActive ? (
        <div
          ref={ref}
          className="max-h-32 overflow-hidden mask-[linear-gradient(to_bottom,transparent,black_10%)]"
        >
          <Markdown value={part.text} streaming={isActive} />
        </div>
      ) : (
        <p>{label}</p>
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
    case "search_web": {
      const query = (part.input as Partial<SearchWebTool["input"]> | undefined)
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

    case "view_tab": {
      const verb =
        status === "done"
          ? "Viewed"
          : status === "error"
            ? "Failed viewing"
            : "Viewing";

      return (
        <p className={cn("text-zinc-50/60", isLive && "animate-pulse")}>
          {verb} the tab
        </p>
      );
    }

    case "list_tabs": {
      const count = (part.output as { tabs?: unknown[] } | undefined)?.tabs
        ?.length;
      const verb =
        status === "done"
          ? "Listed"
          : status === "error"
            ? "Failed listing"
            : "Listing";

      return (
        <p className={cn("text-zinc-50/60", isLive && "animate-pulse")}>
          {verb}{" "}
          {count != null ? (
            <span className="text-zinc-50/90">{count} tabs</span>
          ) : (
            "open tabs"
          )}
        </p>
      );
    }

    case "read_tab": {
      const tabTitle = (
        part.output as Partial<ReadTabTool["output"]> | undefined
      )?.title;

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
