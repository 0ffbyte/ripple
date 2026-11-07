import { createRoot } from "react-dom/client";
import { createElement } from "react";
import ChatOverlay from "./chat-overlay/App";
import "../assets/tailwind.css";

const screenshotTab = async () => {
  const { dataUrl, error } = await browser.runtime.sendMessage({
    type: "CAPTURE",
  });
  if (error) throw new Error(error);
  if (!dataUrl) throw new Error("Screenshot capture returned no image data");

  const bin = atob(dataUrl.split(",")[1]);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const bitmap = await createImageBitmap(
    new Blob([bytes], { type: "image/jpeg" }),
  );

  return bitmap;
};

export default defineContentScript({
  matches: ["*://*/*"],
  matchAboutBlank: true,
  matchOriginAsFallback: true,
  cssInjectionMode: "ui",
  async main(ctx) {
    let bitmap: ImageBitmap | null = null;
    const UI = await createShadowRootUi(ctx, {
      name: "chat-overlay",
      position: "modal",
      anchor: "body",
      zIndex: 9999999,
      onMount: (container, shadow, shadowHost) => {
        shadowHost.setAttribute("popover", "manual");
        shadowHost.showPopover();
        container.style.pointerEvents = "none";

        const app = document.createElement("div");
        container.append(app);

        const root = createRoot(app);

        root.render(createElement(ChatOverlay, { screenshot: bitmap }));
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
          bitmap = await screenshotTab();
        } catch (error) {
          console.warn("Could not capture tab for chat overlay:", error);
          bitmap = null;
        }
        toggleChatUI();
      }
    });
  },
});
