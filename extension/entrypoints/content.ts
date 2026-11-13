import "../assets/tailwind.css";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import ChatOverlay from "./chat-overlay/App";
import { toImageBitmap } from "@/lib/browser";

export default defineContentScript({
  matches: ["*://*/*"],
  matchAboutBlank: true,
  matchOriginAsFallback: true,
  cssInjectionMode: "ui",
  async main(ctx) {
    let screenshot: any;

    const UI = await createShadowRootUi(ctx, {
      name: "chat-overlay",
      position: "modal",
      anchor: "body",
      zIndex: 99999,
      onMount: (container, _, shadowHost) => {
        shadowHost.setAttribute("popover", "manual");
        shadowHost.showPopover();
        container.style.pointerEvents = "none";

        const app = document.createElement("div");
        container.append(app);

        const root = createRoot(app);

        root.render(
          createElement(ChatOverlay, {
            screenshot,
          }),
        );
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    const toggleChatUI = () => (UI.mounted ? UI.remove() : UI.mount());

    browser.runtime.onMessage.addListener(async (message) => {
      if (message?.type === "toggle-chat") {
        if (UI.mounted) {
          toggleChatUI();
          return;
        }
        try {
          const { dataUrl } = await browser.runtime.sendMessage({
            type: "CAPTURE",
          });

          screenshot = { dataUrl, bitmap: await toImageBitmap(dataUrl) };
        } catch (error) {
          console.warn("Could not capture tab for chat overlay:", error);
          screenshot = null;
        }
        toggleChatUI();
      }
    });
  },
});
