import { useState } from "react";
import { motion } from "motion/react";
import Messages from "../chat/messages";
import type { ChatStatus, UIMessage } from "ai";

export default function Thread({
  messages,
  status,
  onResizeStart,
  onResize,
  onResizeEnd,
}: {
  messages: UIMessage[];
  status: ChatStatus;
  onResizeStart?: () => void;
  onResize?: (deltaY: number) => void;
  onResizeEnd?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(true);

  if (messages.length === 0) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -128, scaleY: 0.2, filter: "blur(12px)" }}
      animate={{ opacity: 1, y: 0, scaleY: 1, filter: "blur(0px)" }}
      transition={{
        type: "spring",
        stiffness: 180,
        damping: 20,
        opacity: {
          duration: 0.4,
        },
        filter: {
          duration: 0.4,
        },
      }}
      className={`relative row-start-1 overflow-hidden bg-zinc-800/55 select-none ${
        collapsed ? "self-end" : "h-full min-h-0 w-135"
      }`}
      style={{
        width: collapsed ? "auto" : 540,
        borderRadius: 36,
        boxShadow:
          "inset 0 0 1px 1px rgba(255, 255, 255, 0.38), 0 0 0 1px rgba(0, 0, 0, 0.48), 0 24px 38px rgba(0, 0, 0, 0.40)",
        backdropFilter: "blur(24px)",
        willChange: "transform",
      }}
    >
      {collapsed ? (
        <p
          className="p-2 px-3 text-zinc-50/90"
          onClick={() => setCollapsed(false)}
        >
          Open Thread
        </p>
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
    </motion.div>
  );
}
