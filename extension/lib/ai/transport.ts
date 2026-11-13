import type { ChatTransport, UIMessageChunk } from "ai";
import type { RippleUIMessage } from "./agent/types";

export const portTransport: ChatTransport<RippleUIMessage> = {
  async sendMessages({ messages, abortSignal }) {
    const port = browser.runtime.connect({ name: "chat" });
    abortSignal?.addEventListener("abort", () => port.disconnect());

    return new ReadableStream<UIMessageChunk>({
      start(controller) {
        port.onMessage.addListener((m) => {
          if (m.type === "__done") {
            controller.close();
            port.disconnect();
          } else {
            controller.enqueue(m);
          }
        });
        port.onDisconnect.addListener(() => {
          try {
            controller.close();
          } catch {}
        });
        port.postMessage({ messages });
      },
    });
  },
  async reconnectToStream() {
    return null;
  },
};
