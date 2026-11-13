import { tool, type InferUITool } from "ai";
import { z } from "zod";
import {
  addTabToAgentGroup,
  extractTabContent,
  resolveTab,
  waitForTab,
} from "@/lib/browser";

const DEFERRED = false; // eanbles toolSearch

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/* -------------------------------------------------------------------------- */
/*  Page content                                                              */
/* -------------------------------------------------------------------------- */

const readTab = tool({
  deferLoading: DEFERRED,
  description: "Read a tab's text. Use active tab as default.",
  inputSchema: z.object({
    tabId: z
      .number()
      .int()
      .optional()
      .describe("Tab id. Defaults to the active tab."),
  }),
  async *execute({ tabId }) {
    try {
      const tab = await resolveTab(tabId);
      if (!tab) return { error: "No tab found." };

      yield { title: tab.title };

      const content = await extractTabContent(tab.tabId);

      yield {
        tabId: tab.tabId,
        title: content.title,
        url: content.url,
        text: content.text,
      };

      return;
    } catch (error) {
      console.error("readTab failed:", error);
      return {
        error:
          error instanceof Error
            ? error.message
            : "Cannot read this page (restricted or not loaded).",
      };
    }
  },
});

const listTabs = tool({
  deferLoading: DEFERRED,
  description:
    "List all open tabs. Use when the user refers to a tab by name or wants a comparison across tabs.",
  inputSchema: z.object({}),
  execute: async () => {
    const tabs = await browser.tabs.query({});
    const summaries = await Promise.all(
      tabs.map(async (t) => {
        const content = await extractTabContent(t.id as number, 1000);
        return content.text;
      }),
    );
    return {
      tabs: tabs
        .filter((t) => t.id !== undefined)
        .map((t, index) => ({
          tabId: t.id as number,
          title: t.title ?? "",
          summary: summaries[index] ?? "",
          active: t.active ?? false,
          pinned: t.pinned ?? false,
        })),
    };
  },
});

/* -------------------------------------------------------------------------- */
/*  History, bookmarks and search                                                   */
/* -------------------------------------------------------------------------- */

const searchWeb = tool({
  deferLoading: DEFERRED,
  description:
    "Search Google using a query. Returns the search results title, URL, and text.",
  inputSchema: z.object({
    query: z.string().min(1).describe("The Google search query."),
  }),
  execute: async ({ query }) => {
    let tabId: number | undefined;

    try {
      // open a new search tab
      const tab = await browser.tabs.create({
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        active: false,
        pinned: true,
      });

      tabId = tab.id;
      if (tabId === undefined)
        return { error: "Could not create a search tab." };

      // Group agent tab
      await addTabToAgentGroup(tabId, tab.windowId).catch(() => {});

      // Wait for tab
      await waitForTab(tabId);

      // Extract
      const result = await extractTabContent(tabId);

      console.log("images:", result.images);

      if (!result.text)
        return { error: "Could not extract Google search results." };

      return {
        query,
        result,
      };
    } catch (error) {
      console.error("webSearch failed:", error);
      return {
        error: error instanceof Error ? error.message : "Google search failed.",
      };
    } finally {
      if (tabId !== undefined) {
        await browser.tabs.remove(tabId).catch(() => {});
      }
    }
  },
});

const searchHistory = tool({
  deferLoading: DEFERRED,
  description:
    "Search the user's browsing history. Pass an empty query to list recenttly visited websites.",
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe(
        "Text to match in page titles and urls. Omit to list recent history without filtering.",
      ),
    days: z
      .number()
      .int()
      .optional()
      .describe("How many days back to search. Defaults to 7."),
    maxResults: z
      .number()
      .int()
      .optional()
      .describe("Defaults to 10, capped at 50."),
  }),
  execute: async ({ query = "", days = 7, maxResults = 10 }) => {
    const items = await browser.history.search({
      text: query,
      startTime: Date.now() - clamp(days, 1, 365) * 86_400_000,
      maxResults: clamp(maxResults, 1, 50),
    });
    return {
      results: items.map((i) => ({
        title: i.title,
        url: i.url,
        lastVisit: i.lastVisitTime
          ? new Date(i.lastVisitTime).toISOString()
          : undefined,
        visitCount: i.visitCount,
      })),
    };
  },
});

const searchBookmarks = tool({
  deferLoading: DEFERRED,
  description: "Search the user's bookmarks by title or url.",
  inputSchema: z.object({
    query: z.string().describe("Text to search for."),
  }),
  execute: async ({ query }) => {
    console.log("[tool] search_bookmarks", query);
    const nodes = await browser.bookmarks.search(query);
    return {
      results: nodes
        .filter((n) => n.url)
        .slice(0, 20)
        .map((n) => ({ title: n.title, url: n.url })),
    };
  },
});

/* -------------------------------------------------------------------------- */
/*  Registry                                                                  */
/* -------------------------------------------------------------------------- */

export const toolRegistry = {
  read_tab: readTab,
  list_tabs: listTabs,
  search_web: searchWeb,
  search_history: searchHistory,
  search_bookmarks: searchBookmarks,
};

export type ToolName = keyof typeof toolRegistry;

export type SearchWebTool = InferUITool<typeof searchWeb>;
export type ReadTabTool = InferUITool<typeof readTab>;
