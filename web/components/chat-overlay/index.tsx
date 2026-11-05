"use client";

import { useEffect, useRef, useState } from "react";
import RippleEffect from "./ripple-effect";
import Thread from "./thread";
import Composer from "../chat/composer";
import Surface from "./surface";
import type { ChatStatus, UIMessage } from "ai";
import { motion, MotionValue, useMotionValue, useSpring } from "motion/react";

// Sandbox
import { MOCK_MESSAGES } from "@/lib/constants";

const MOCK_DELAY_MS = 2000;
const MIN = 456;
const MAX = 676;
const RESISTANCE = 0.55;
const BAND = 60;

const rubberBand = (value: number) => {
  const edge = value < MIN ? MIN : value > MAX ? MAX : null;
  if (edge === null) return value;

  const distance = Math.abs(value - edge);
  const offset =
    (distance * RESISTANCE * BAND) / (BAND + distance * RESISTANCE);

  return edge + Math.sign(value - edge) * offset;
};

export default function Main({
  screenshot,
}: {
  screenshot: ImageBitmap | null;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UIMessage[]>(MOCK_MESSAGES);
  const [status, setStatus] = useState<ChatStatus>("ready");

  // Index of the next mock message to append
  const cursorRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const hasMessages = messages.length > 0;
  const busy = status === "streaming" || status === "submitted";

  function handleSend() {
    // Typed input is ignored: the mock drives the conversation
    if (status !== "ready") return;

    const userMsg = MOCK_MESSAGES[cursorRef.current];
    if (!userMsg) return; // mock exhausted

    // 1. Append the user message immediately
    cursorRef.current += 1;
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStatus("submitted");

    // 2. Append the assistant reply after a short wait
    const assistantMsg = MOCK_MESSAGES[cursorRef.current];
    if (!assistantMsg) {
      setStatus("ready");
      return;
    }

    timeoutRef.current = setTimeout(() => {
      cursorRef.current += 1;
      setMessages((prev) => [...prev, assistantMsg]);

      // The last mock message is the in-progress streaming one
      const isLast = cursorRef.current >= MOCK_MESSAGES.length;
      setStatus(isLast ? "streaming" : "ready");
    }, MOCK_DELAY_MS);
  }

  const virtual = useMotionValue(MIN);
  const height = useSpring(MIN, { stiffness: 600, damping: 30 });
  return (
    <div className="fixed inset-0 z-99 w-screen h-screen flex items-end justify-center pb-8 font-sans text-zinc-50 pointer-events-none">
      <RippleEffect />

      <ChatContainer height={height}>
        <Thread
          messages={messages}
          status={status}
          onResizeStart={() => virtual.set(height.get())}
          onResize={(deltaY) => {
            virtual.set(virtual.get() - deltaY);
            height.set(rubberBand(virtual.get()));
          }}
          onResizeEnd={() => {
            virtual.set(Math.max(MIN, Math.min(MAX, virtual.get())));
            height.set(virtual.get());
          }}
        />

        <Surface className="row-start-2 p-3 w-90">
          <Composer
            input={input}
            setInput={setInput}
            handleSend={handleSend}
            hasMessages={hasMessages}
            busy={busy}
          />
        </Surface>
      </ChatContainer>
    </div>
  );
}

const ChatContainer = ({
  children,
  height,
}: {
  children: React.ReactNode;
  height: MotionValue<number>;
}) => {
  return (
    <motion.div
      className="grid w-135 grid-rows-[minmax(0,1fr)_auto] justify-items-center gap-3 pointer-events-auto border border-dashed border-green-500"
      style={{ height }}
    >
      {children}
    </motion.div>
  );
};
