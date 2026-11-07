import { useChat } from "@ai-sdk/react";
import { portTransport } from "@/lib/ai/transport";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import Thread from "./thread";
import Surface from "./surface";
import Composer from "./chat/composer";
import { unlockAudio } from "@/lib/audio";

export default function ChatOverlayShell() {
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: portTransport,
  });

  const [input, setInput] = useState("");
  const [threadCollapsed, setThreadCollapsed] = useState(false);
  const virtual = useMotionValue(MIN);
  const height = useSpring(MIN, { stiffness: 600, damping: 30 });

  // Collapse thread on scroll
  useEffect(() => {
    const collapseThread = () => setThreadCollapsed(true);
    window.addEventListener("scroll", collapseThread, { passive: true });
    return () => window.removeEventListener("scroll", collapseThread);
  }, []);

  // Inference status
  const busy = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  function handleSend() {
    const text = input.trim();
    if (busy) {
      stop();
      return;
    }
    if (!text) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <motion.div
      className="grid w-135 grid-rows-[minmax(0,1fr)_auto] justify-items-center gap-3 pointer-events-auto"
      style={{ height }}
      onPointerDownCapture={unlockAudio}
    >
      <Thread
        messages={messages}
        status={status}
        collapsed={threadCollapsed}
        onCollapsedChange={setThreadCollapsed}
        onResizeStart={() => {
          const current = height.get();
          virtual.set(current);
        }}
        onResize={(deltaY) => {
          virtual.set(virtual.get() - deltaY);
          if (virtual.get() <= MIN - 300) {
            virtual.set(MIN);
            height.set(MIN);
            setThreadCollapsed(true);
            return;
          }
          height.set(rubberBand(virtual.get()));
        }}
        onResizeEnd={() => {
          virtual.set(Math.max(MIN, Math.min(MAX, virtual.get())));
          height.set(virtual.get());
        }}
      />

      <Surface className="row-start-2 p-3" width={340}>
        <Composer
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          hasMessages={hasMessages}
          status={status}
        />
      </Surface>
    </motion.div>
  );
}

// Constants
const MIN = 456;
const MAX = 676;
const RESISTANCE = 0.55;
const BAND = 60;

// Rubber band function
const rubberBand = (value: number) => {
  const edge = value < MIN ? MIN : value > MAX ? MAX : null;
  if (edge === null) return value;

  const distance = Math.abs(value - edge);
  const offset =
    (distance * RESISTANCE * BAND) / (BAND + distance * RESISTANCE);

  return edge + Math.sign(value - edge) * offset;
};
