import { type UIMessage } from "ai";

// Joins lines so markdown stays readable in source (no template-literal escaping).
const md = (...lines: string[]) => lines.join("\n");

export const MOCK_MESSAGES: UIMessage[] = [
  // 1. Plain exchange, no trace. Inline formatting only.
  {
    id: "1",
    role: "user",
    parts: [{ type: "text", text: "Hello, how are you?" }],
  },
  {
    id: "2",
    role: "assistant",
    parts: [
      {
        type: "reasoning",
        text: md(
          "I'm doing **well**, thank you for asking. How about you?",
          "",
          "I can help with *writing*, `code`, research, and more. For example:",
          "",
          "- Explaining a concept",
          "- Debugging a function",
          "- Drafting an email",
        ),
      },
      {
        type: "tool-read-page",
        toolCallId: "call_0",
        state: "output-available",
        input: { action: "example", query: "Say hello to user" },
        output: { message: "Hello, user! How can I assist you today?" },
      },
      {
        type: "reasoning",
        text: md(
          "I'm doindg **well**, thank you for asking. How about you?",
          "",
          "I can help with *writing*, `code`, research, and more. For example:",
          "",
          "- Explaining a concept",
          "- Debugging a function",
          "- Drafting an email",
        ),
      },
    ],
  },

  // 2. Reasoning + tool + reasoning + tool + answer (multi-step, completed).
  // Covers headings, table, blockquote, links, strikethrough.
  {
    id: "3",
    role: "user",
    parts: [
      {
        type: "text",
        text: "What's the weather in Paris, and should I bring an umbrella?",
      },
    ],
  },
  {
    id: "4",
    role: "assistant",
    parts: [
      { type: "step-start" },
      {
        type: "reasoning",
        text: md(
          "The user wants **current weather** for Paris.",
          "",
          "1. Call the weather tool first",
          "2. Decide on the umbrella question from the `rainProbability` field",
        ),
        state: "done",
      },
      {
        type: "tool-getWeather",
        toolCallId: "call_1",
        state: "output-available",
        input: { city: "Paris", unit: "celsius" },
        output: {
          temperature: 14,
          condition: "Light rain",
          rainProbability: 0.8,
        },
      },
      { type: "step-start" },
      {
        type: "reasoning",
        text: md(
          "80% rain probability with light rain.",
          "",
          "> An umbrella is clearly worth it.",
        ),
        state: "done",
      },
      {
        type: "text",
        text: md(
          "## Paris weather",
          "",
          "| Metric | Value |",
          "| --- | --- |",
          "| Temperature | 14°C |",
          "| Condition | Light rain |",
          "| Rain chance | **80%** |",
          "",
          "**Yes, bring an umbrella.** ~~Sunglasses~~ will not be needed today.",
          "",
          "> Tip: a compact umbrella beats a large one on busy metro platforms.",
          "",
          "Source: [Météo-France](https://meteofrance.com)",
          "\n```js\n// JavaScript example\nconst message = 'Hello, world!';\nconsole.log(message);\n```\n",
          "$$E = mc^2$$",
        ),
      },
    ],
  },
] as unknown as UIMessage[];
