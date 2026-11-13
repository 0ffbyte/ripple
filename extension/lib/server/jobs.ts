import { screenshotTab } from "../browser";

type JobContext = {
  msg: { type: string; [key: string]: unknown };
  sender: Browser.runtime.MessageSender;
  sendResponse: (response: unknown) => void;
};

async function captureImage({ sender, sendResponse }: JobContext) {
  try {
    const tabId = sender.tab?.id ?? 0;
    const dataUrl = await screenshotTab(tabId, 80);
    sendResponse({ dataUrl });
  } catch (error: unknown) {
    sendResponse({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export default function registerJobs() {
  browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type !== "CAPTURE") return;

    captureImage({ msg, sender, sendResponse });
    return true;
  });
}
