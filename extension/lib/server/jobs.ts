type JobContext = {
  msg: { type: string; [key: string]: unknown };
  sender: Browser.runtime.MessageSender;
  sendResponse: (response: unknown) => void;
};

function captureImage({ sender, sendResponse }: JobContext) {
  browser.tabs
    .captureVisibleTab(sender.tab?.windowId ?? 0, {
      format: "jpeg",
      quality: 30,
    })
    .then((dataUrl) => sendResponse({ dataUrl }))
    .catch((error: unknown) =>
      sendResponse({
        error: error instanceof Error ? error.message : String(error),
      }),
    );
}

export default function registerJobs() {
  browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type !== "CAPTURE") return;

    captureImage({ msg, sender, sendResponse });
    return true;
  });
}
