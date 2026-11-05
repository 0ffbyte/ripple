import MiniSearch from "minisearch";

interface Intent {
  examples: string[];
  triggers: string[];
}

// 1. Intent registry
const INTENTS: Record<string, Intent> = {
  write: {
    examples: [
      "write me an email",
      "draft a message",
      "can you write this",
      "help me write",
      "make a post about",
      "compose a message",
      "write a caption",
      "write a cover letter",
    ],
    triggers: ["write", "draft", "compose"],
  },
  explain: {
    examples: [
      "explain this",
      "what does this mean",
      "i dont get this",
      "how does this work",
      "why does this happen",
      "eli5",
      "walk me through this",
      "help me understand",
    ],
    triggers: ["explain", "eli5", "meaning", "understand"],
  },
  summarise: {
    examples: [
      "summarise this",
      "tldr",
      "whats this about",
      "give me the gist",
      "key points",
      "sum it up",
      "break this down",
      "main takeaways",
    ],
    triggers: [
      "summarise",
      "summarize",
      "summary",
      "tldr",
      "gist",
      "takeaways",
    ],
  },
  compare: {
    examples: [
      "compare these",
      "a vs b",
      "difference between",
      "whats the difference between",
      "which is better",
      "which one should i pick",
      "pros and cons",
      "how is x different from y",
      "x or y",
      "is x better than y",
    ],
    triggers: [
      "compare",
      "comparison",
      "versus",
      "vs",
      "vs.",
      "difference",
      "differ",
      "better than",
      "pros and cons",
    ],
  },
  define: {
    examples: [
      "define this",
      "what is the definition of",
      "what does this word mean",
      "dictionary meaning",
      "synonym for",
      "another word for",
    ],
    triggers: ["define", "definition", "synonym", "antonym"],
  },
  brainstorm: {
    examples: [
      "give me ideas",
      "brainstorm with me",
      "come up with names",
      "suggest some options",
      "i need inspiration",
      "think of a title",
      "ideas for",
    ],
    triggers: ["brainstorm", "ideas", "inspiration", "names"],
  },
  code: {
    examples: [
      "write a function that",
      "fix this bug",
      "why is this code failing",
      "debug this",
      "convert this to typescript",
      "write a regex for",
      "refactor this",
      "whats this error",
    ],
    triggers: [
      "code",
      "function",
      "bug",
      "debug",
      "regex",
      "refactor",
      "error",
    ],
  },
  plan: {
    examples: [
      "make a plan",
      "plan my day",
      "create a schedule",
      "roadmap for",
      "step by step guide",
      "how should i approach this",
      "plan a trip",
    ],
    triggers: ["plan", "schedule", "roadmap", "itinerary"],
  },
  search: {
    examples: [
      "search for",
      "look this up",
      "find me info on",
      "google this",
      "latest news about",
      "where can i find",
    ],
    triggers: ["search", "google", "lookup", "latest", "news", "who"],
  },
};

// 2. Normalize once, in the tokenizer, so index and query behave identically
const STOP = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "and",
  "me",
  "my",
  "please",
  "can",
  "you",
  "is",
  "are",
  "was",
  "it",
  "in",
  "on",
  "for",
  "do",
  "does",
  "i",
]);

const normalize = (s: string) => s.toLowerCase().replace(/['’]/g, ""); // what's -> whats

const mini = new MiniSearch({
  fields: ["text", "triggers"],
  storeFields: ["intent"],
  tokenize: (s) =>
    normalize(s)
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  processTerm: (t) => (STOP.has(t) ? null : t),
  searchOptions: {
    boost: { triggers: 2.5 },
    prefix: (term) => term.length >= 4, // "summ" -> summarise
    fuzzy: (term) => (term.length >= 5 ? 0.2 : false), // no fuzzy on "this", "vs"
    combineWith: "OR",
  },
});

mini.addAll(
  Object.entries(INTENTS).flatMap(([intent, config]) => [
    ...config.examples.map((text, i) => ({
      id: `${intent}-example-${i}`,
      intent,
      text,
      triggers: config.triggers.join(" "),
    })),
  ]),
);

interface IntentCandidate {
  intent: keyof typeof INTENTS;
  score: number;
}

export default function classify(input: string): IntentCandidate[] {
  const results = mini.search(input);

  const scores = new Map<string, number>();

  for (const result of results) {
    const intent = result.intent as keyof typeof INTENTS;
    scores.set(intent, (scores.get(intent) ?? 0) + result.score);
  }

  const maxScore = Math.max(0, ...scores.values());

  if (maxScore === 0) return [];

  return [...scores.entries()]
    .map(([intent, score]) => ({
      intent: intent as keyof typeof INTENTS,
      score: score / maxScore,
    }))
    .sort((a, b) => b.score - a.score);
}
