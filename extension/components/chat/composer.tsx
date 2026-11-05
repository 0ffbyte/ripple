import { useRef, useLayoutEffect } from "react";
import { motion } from "motion/react";
import { cn } from "cn";
import {
  PlusIcon,
  MicIcon,
  ArrowUpIcon,
  SquareIcon,
  LoaderIcon,
} from "lucide-react";
import type { ChatStatus } from "ai";

export default function Composer({
  input,
  setInput,
  handleSend,
  hasMessages,
  status,
}: {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleSend: () => void;
  hasMessages: boolean;
  status: ChatStatus;
}) {
  const canSend = input.trim().length > 0;
  const busy = status === "streaming" || status === "submitted";

  return (
    <div className="flex items-center justify-between">
      <Button>
        <PlusIcon
          size={20}
          strokeWidth={2}
          className="text-zinc-50 opacity-40"
        />
      </Button>

      <Prompt
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        hasMessages={hasMessages}
      />

      <div className="flex items-center gap-2">
        <Button>
          <MicIcon
            size={20}
            strokeWidth={2}
            className="text-zinc-50 opacity-40"
          />
        </Button>

        {(canSend || busy) && (
          <Button
            className={cn(
              "bg-zinc-900/20 text-zinc-50 transition-colors duration-70",
            )}
            onClick={handleSend}
          >
            {status === "streaming" ? (
              <SquareIcon
                size={16}
                strokeWidth={2}
                fill="currentColor"
                className="opacity-90"
              />
            ) : status === "submitted" ? (
              <LoaderIcon
                size={20}
                strokeWidth={2}
                className="opacity-90 animate-spin"
              />
            ) : (
              <ArrowUpIcon size={20} strokeWidth={2} className="opacity-90" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

const Prompt = ({
  input,
  setInput,
  handleSend,
  hasMessages,
}: {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleSend: () => void;
  hasMessages: boolean;
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  return (
    <motion.div
      layout="position"
      className="relative w-full h-full flex items-center justify-start p-0 border-0"
    >
      <textarea
        autoFocus
        ref={ref}
        rows={1}
        className="w-full max-h-24 outline-none ring-0 resize-none leading-6 p-2 pointer-events-auto"
        value={input}
        onChange={(e) => {
          const value = e.target.value;
          setInput(value.charAt(0).toUpperCase() + value.slice(1));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />

      {input.trim().length < 1 && (
        <div className="absolute inset-0 text-zinc-50/60 pointer-events-none flex items-center justify-start p-2">
          <p>{hasMessages ? "Ask Ripple a follow-up" : "Ask Ripple"}</p>
        </div>
      )}
    </motion.div>
  );
};

const Button = ({
  children,
  className,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) => {
  return (
    <motion.button
      layout
      initial={{ scale: 0.6, opacity: 0, filter: "blur(4px)" }}
      animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.24, ease: "easeInOut" }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-10 h-10 hover:bg-zinc-50/20 grow shrink-0 flex items-center justify-center rounded-full transition-colors duration-100",
        className,
      )}
    >
      {children}
    </motion.button>
  );
};
