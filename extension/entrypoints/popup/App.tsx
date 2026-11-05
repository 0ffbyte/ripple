import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { portTransport } from "@/lib/ai/transport";
import "./style.css";

/* ---------- model status: the background broadcasts STATE on a "status" port ---------- */

type ModelState = { phase: string; progress: number; error: string };

export function useModelStatus() {
  const [state, setState] = useState<ModelState>({
    phase: "idle",
    progress: 0,
    error: "",
  });

  useEffect(() => {
    const port = browser.runtime.connect({ name: "status" });
    port.onMessage.addListener((m) => {
      if (m.type === "STATE") {
        setState({
          phase: m.phase,
          progress: m.progress ?? 0,
          error: m.error ?? "",
        });
      }
    });
    return () => port.disconnect();
  }, []);

  return state;
}

function Message({
  message,
  streaming,
}: {
  message: UIMessage;
  streaming: boolean;
}) {
  return (
    <article className="msg" data-role={message.role}>
      {message.parts.map((part: any, i: number) => {
        if (part.type === "text")
          return (
            <p key={i} className="text">
              {part.text}
            </p>
          );
        if (part.type === "reasoning")
          return (
            <Reasoning
              key={i}
              text={part.text}
              streaming={streaming && part.state === "streaming"}
            />
          );
        if (part.type === "dynamic-tool" || part.type.startsWith("tool-"))
          return <ToolCall key={i} part={part} />;
        return null;
      })}
    </article>
  );
}

/* ---------- popup ---------- */

export default function Chat() {
  const model = useModelStatus();
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: portTransport,
  });
  const sessionTotal = messages.reduce(
    (sum, m) => sum + (m.metadata?.totalTokens ?? 0),
    0,
  );

  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // Inference status
  const busy = status === "submitted" || status === "streaming";

  // Model status
  const loading = model.phase === "loading";
  const failed = model.phase === "error";

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  function submit() {
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
    if (areaRef.current) areaRef.current.style.height = "auto";
  }

  return (
    <div className="chat">
      <div
        className="load-line"
        data-active={loading}
        style={{ transform: `scaleX(${loading ? model.progress / 100 : 0})` }}
        role="progressbar"
        aria-label="Model download"
        aria-valuenow={Math.round(model.progress)}
      />

      <header className="bar">
        <span>Assistant</span>
        <span className="status" data-phase={model.phase}>
          {loading && `Downloading model, ${Math.round(model.progress)}%`}
          {model.phase === "ready" && "On this device"}
          {failed && "Model failed to load"}
        </span>
      </header>

      <main className="feed" aria-live="polite">
        {messages.length === 0 && (
          <p className="empty">
            {failed
              ? model.error ||
                "The model could not start. Check that WebGPU is enabled."
              : "Ask Ola anything."}
          </p>
        )}

        {messages.map((m, i) => (
          <Message
            key={m.id}
            message={m}
            streaming={busy && i === messages.length - 1}
          />
        ))}

        {status === "submitted" && <p className="pending">Working</p>}

        {error && (
          <div className="error" role="alert">
            <span>Generation stopped: {error.message}</span>
            <button onClick={() => regenerate()}>Try again</button>
          </div>
        )}

        <div ref={endRef} />
      </main>

      <footer className="composer">
        <textarea
          ref={areaRef}
          value={input}
          rows={1}
          placeholder={
            loading ? "Model is downloading" : "Ask | tt: " + sessionTotal
          }
          disabled={failed}
          onChange={(e) => setInput(e.target.value)}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 120) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        {busy ? (
          <button className="send stop" onClick={() => stop()}>
            Stop
          </button>
        ) : (
          <button
            className="send"
            onClick={submit}
            disabled={!input.trim() || failed}
          >
            Send
          </button>
        )}
      </footer>
    </div>
  );
}

/* ---------- message parts ---------- */

function Reasoning({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <details className="note">
      <summary>{"Thinking"}</summary>
      {true && <p>{text}</p>}
    </details>
  );
}

function ToolCall({ part }: { part: any }) {
  const name =
    part.type === "dynamic-tool" ? part.toolName : part.type.slice(5);
  const label =
    part.state === "output-available"
      ? "Done"
      : part.state === "output-error"
        ? "Failed"
        : "Running";

  return (
    <details className="tool" data-state={part.state}>
      <summary>
        <span className="tool-name">{name}</span>
        <span className="tool-state">{label}</span>
      </summary>
      {part.input !== undefined && (
        <pre>{JSON.stringify(part.input, null, 2)}</pre>
      )}
      {part.state === "output-available" && (
        <pre>{JSON.stringify(part.output, null, 2)}</pre>
      )}
      {part.state === "output-error" && <pre>{part.errorText}</pre>}
    </details>
  );
}
