export default function registerCommands() {
  browser.commands.onCommand.addListener(async (command) => {
    if (command === "toggle-chat") {
      console.log("toggle-chat");
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id)
        browser.tabs
          .sendMessage(tab.id, { type: "toggle-chat" })
          .catch(() => {});
    }
  });
}
