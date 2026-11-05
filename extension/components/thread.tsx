import { motion } from "motion/react";
import Messages from "./chat/messages";
import type { ChatStatus, UIMessage } from "ai";
import Surface from "./surface";
import { cn } from "cn";

export default function Thread({
  messages,
  status,
  collapsed,
  onCollapsedChange,
  onResizeStart,
  onResize,
  onResizeEnd,
}: {
  messages: UIMessage[];
  status: ChatStatus;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onResizeStart?: () => void;
  onResize?: (deltaY: number) => void;
  onResizeEnd?: () => void;
}) {
  const assistantMessagesCount = messages.filter(
    (m) => m.role === "assistant",
  ).length;
  if (messages.length === 0) return null;

  return (
    <Surface
      className={cn(
        "overflow-hidden select-none",
        collapsed ? "self-end" : "h-full min-h-0 w-135",
      )}
      initial={{ opacity: 0, y: -128, scaleY: 0.2, filter: "blur(12px)" }}
      animate={{ opacity: 1, y: 0, scaleY: 1, filter: "blur(0px)" }}
    >
      {collapsed ? (
        <motion.p
          key={status}
          initial={{ opacity: 0, scaleY: 0.8, filter: "blur(12px)" }}
          animate={{ opacity: 1, scaleY: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.4 }}
          className="p-2 px-3 text-zinc-50/60"
          onClick={() => onCollapsedChange(false)}
        >
          {status === "streaming" || status === "submitted"
            ? "Working"
            : assistantMessagesCount > 1
              ? `Reveal ${assistantMessagesCount} Messages`
              : "Reveal Thread"}
        </motion.p>
      ) : (
        <>
          <Messages messages={messages} status={status} />
          <motion.div
            onPanStart={onResizeStart}
            onPan={(_, info) => onResize?.(info.delta.y)}
            onPanEnd={onResizeEnd}
            className="absolute inset-x-0 top-0 flex h-6 touch-none items-start justify-center pt-1.5"
          >
            <div className="h-1.5 w-12 rounded-full bg-zinc-50/20" />
          </motion.div>
        </>
      )}
    </Surface>
  );
}
