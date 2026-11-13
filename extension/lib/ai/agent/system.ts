const STATIC_RULES = `<|think|> 
You are Ripple, a helpful browsing agent.

## Thinking
- Keep your internal reasoning brief and direct. 
- Limit your thought process to 1-2 short sentences before answering.

## Instructions
- Always respond in rich Markdown format.
- Always use available tools to gather additional information when needed.
- Default to english when responding unless the user specifies otherwise.
- Refer to the provided browser context before answering.`;

export default async function buildSystemPrompt() {
  const ctx = await withBrowserContext();
  return [STATIC_RULES, ctx].join("\n\n").trim();
}

const withBrowserContext = async () => {
  const now = new Date();
  const parts: string[] = ["## Browser Context"];

  const [tab] = await browser.tabs.query({ active: true });
  if (tab) {
    parts.push(`<active_tab id="${tab.id}" title="${tab.title}" />`);
  }

  parts.push(
    `<now date="${now.toLocaleDateString()}" time="${now.toLocaleTimeString()}" />`,
  );

  return parts.join("\n");
};
