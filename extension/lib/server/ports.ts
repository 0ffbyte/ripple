import { convertToModelMessages, toUIMessageStream, type UIMessage } from "ai";
import { getState, subscribe } from "../ai/model";
import Agent from "../ai/agent";
import classifyIntent from "../ai/agent/classifier";

function lastUserText(messages: UIMessage[], depth = 2): string {
  return messages
    .filter((message) => message.role === "user")
    .slice(-Math.max(1, depth))
    .map((message) =>
      message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(" "),
    )
    .filter(Boolean)
    .join("\n\n");
}

function handleModelStatus(port: Browser.runtime.Port) {
  const send = (s = getState()) => port.postMessage({ type: "STATE", ...s });
  send();
  const unsub = subscribe(send);
  port.onDisconnect.addListener(unsub);
}

function handleChat(port: Browser.runtime.Port) {
  const ac = new AbortController();
  port.onDisconnect.addListener(() => ac.abort());

  port.onMessage.addListener(
    async ({ messages }: { messages: UIMessage[] }) => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 400)); // 400ms delay here for client responsivness
        const intent = await classifyIntent(lastUserText(messages));
        const result = await Agent.stream({
          messages: await convertToModelMessages(messages),
          abortSignal: ac.signal,
          options: { intent },
        });

        for await (const chunk of toUIMessageStream({
          stream: result.stream,
          sendReasoning: true,
          messageMetadata: ({ part }) => {
            if (part.type === "start" || part.type === "finish") {
              return { intent };
            }
          },
        })) {
          port.postMessage(chunk);
        }
      } catch (e: any) {
        port.postMessage({ type: "error", errorText: e?.message ?? String(e) });
      } finally {
        port.postMessage({ type: "__done" });
      }
    },
  );
}

export default function registerPorts() {
  browser.runtime.onConnect.addListener((port) => {
    if (port.name === "status") return handleModelStatus(port);
    else if (port.name === "chat") return handleChat(port);
  });
}
