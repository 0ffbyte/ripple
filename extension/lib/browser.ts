export async function resolveTab(
  tabId?: number,
): Promise<{ tabId: number; title: string } | null> {
  if (tabId !== undefined) {
    const tab = await browser.tabs.get(tabId).catch(() => undefined);
    if (tab?.id === undefined) return null;
    return { tabId: tab.id, title: tab.title ?? "" };
  }
  const [active] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (active?.id === undefined) return null;
  return { tabId: active.id, title: active.title ?? "" };
}

const AGENT_GROUP_TITLE = "Ripple";
const AGENT_GROUP_COLOR = "blue"; // grey | blue | red | yellow | green | pink | purple | cyan | orange

let groupLock: Promise<unknown> = Promise.resolve();

export function addTabToAgentGroup(tabId: number, windowId: number) {
  const run = async () => {
    const [existing] = await browser.tabGroups.query({
      title: AGENT_GROUP_TITLE,
      windowId,
    });

    if (existing) {
      await browser.tabs.group({ tabIds: tabId, groupId: existing.id });
      return;
    }

    const groupId = await browser.tabs.group({
      tabIds: tabId,
      createProperties: { windowId },
    });

    await browser.tabGroups.update(groupId, {
      title: AGENT_GROUP_TITLE,
      color: AGENT_GROUP_COLOR,
      collapsed: false,
    });
  };

  const next = groupLock.then(run, run);
  groupLock = next.catch(() => {});
  return next;
}

interface TabContent {
  title: string;
  url: string;
  text: string;
  images: string[];
}

// Waiter v1.0
export async function waitForTab(
  tabId: number,
  timeoutMs = 15_000,
): Promise<void> {
  const start = Date.now();

  // wait for the tab to load, unless it already has
  const current = await browser.tabs.get(tabId);
  if (!(current.status === "complete" && current.url?.startsWith("http"))) {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        browser.tabs.onUpdated.removeListener(onUpdated);
        browser.tabs.onRemoved.removeListener(onRemoved);
      };

      const onUpdated = (
        id: number,
        info: { status?: string },
        tab: { url?: string },
      ) => {
        if (
          id === tabId &&
          info.status === "complete" &&
          tab.url?.startsWith("http")
        ) {
          cleanup();
          resolve();
        }
      };

      const onRemoved = (id: number) => {
        if (id === tabId) {
          cleanup();
          reject(
            new Error("Search tab was closed before it finished loading."),
          );
        }
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Timed out waiting for the search page to load."));
      }, timeoutMs);

      browser.tabs.onUpdated.addListener(onUpdated);
      browser.tabs.onRemoved.addListener(onRemoved);
    });
  }
}

// Extractor v1.0
export async function extractTabContent(
  tabId: number,
  maxLength: number = 4500,
): Promise<TabContent> {
  const [res] = await browser.scripting.executeScript({
    target: { tabId },
    args: [maxLength],
    func: (maxLength) => {
      // 1. Pick the most likely main-content container
      const candidates = [
        "article",
        "main",
        "[role='main']",
        "#content",
        "#main-content",
        ".post-content",
        ".article-body",
        ".entry-content",
      ];

      let root: Element = document.body;

      let best = 0;
      for (const sel of candidates) {
        const el = document.querySelector(sel);
        const len = el?.textContent?.trim().length ?? 0;
        // Require a reasonable amount of text so we don't pick an empty wrapper
        if (el && len > 200 && len > best) {
          root = el;
          best = len;
          if (sel === "article" || sel === "main") break;
        }
      }

      // 2. Work on a clone so the live page is untouched
      const clone = root.cloneNode(true) as Element;

      // 3. Remove non-content elements
      const noise = [
        "script",
        "style",
        "noscript",
        "template",
        "iframe",
        "svg",
        "canvas",
        "video",
        "audio",
        "picture",
        "form",
        "button",
        "select",
        "input",
        "textarea",
        "nav",
        "header",
        "footer",
        "aside",
        "dialog",
        "[role='navigation']",
        "[role='banner']",
        "[role='contentinfo']",
        "[role='complementary']",
        "[role='dialog']",
        "[role='alert']",
        "[aria-hidden='true']",
        "[hidden]",
        // Common junk by class/id pattern
        "[class*='cookie' i]",
        "[id*='cookie' i]",
        "[class*='consent' i]",
        "[class*='banner' i]",
        "[class*='popup' i]",
        "[class*='modal' i]",
        "[class*='newsletter' i]",
        "[class*='subscribe' i]",
        "[class*='advert' i]",
        "[class*='sponsor' i]",
        "[class*='promo' i]",
        "[class*='sidebar' i]",
        "[class*='breadcrumb' i]",
        "[class*='share' i]",
        "[class*='social' i]",
        "[class*='related' i]",
        "[class*='recommend' i]",
        "[class*='comment' i]",
      ];
      clone.querySelectorAll(noise.join(",")).forEach((el) => el.remove());

      // 4. Extract text. A clone is detached, so innerText is unreliable
      //    (it ignores CSS/layout), so use textContent with block-level breaks.
      const blockTags =
        /^(P|DIV|LI|H[1-6]|TR|BR|SECTION|ARTICLE|BLOCKQUOTE|PRE)$/;
      clone.querySelectorAll("*").forEach((el) => {
        if (blockTags.test(el.tagName)) el.append("\n");
      });
      const raw = clone.textContent ?? "";

      const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>()\[\]"']+/gi;
      const text = raw
        .replace(/[ \t\u00a0\u200b]+/g, " ")
        .replace(URL_RE, "") // strip bare URLs
        .replace(/\(\s*\)|\[\s*\]/g, "") // clean up empty () or [] left behind
        .replace(/ +([,.;:!?])/g, "$1") // fix "word ." spacing artifacts
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 1)
        .filter((line, i, arr) => line !== arr[i - 1])
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, maxLength);

      // 4. Extract images
      const images = [...root.querySelectorAll("img")]
        .map((img) => ({
          url: img.currentSrc || img.src,
          width: img.naturalWidth,
          height: img.naturalHeight,
        }))
        .filter(
          ({ width, height }) =>
            width > 0 &&
            height > 0 &&
            width / height >= 0.2 &&
            width / height <= 4,
        )
        .sort((a, b) => b.width * b.height - a.width * a.height)
        .slice(0, 5);

      return {
        title: document.title,
        url: location.href,
        text,
        images: [],
      };
    },
  });

  if (res?.result) {
    return res.result as TabContent;
  }

  throw new Error("Failed to extract tab content.");
}

// Capture the visible tab. Call this before the chat overlay mounts.
const tabShots = new Map<number, string>();
export async function screenshotTab(
  tabId: number,
  quality: number = 30,
): Promise<string> {
  const tab = await browser.tabs.get(tabId);
  if (!tab) throw new Error("No tab found");
  const { windowId } = tab;

  const dataUrl = await browser.tabs.captureVisibleTab(windowId, {
    format: "jpeg",
    quality,
  });

  if (!dataUrl) throw new Error("Screenshot capture returned no image data");
  tabShots.set(tabId, dataUrl);
  return dataUrl;
}

export function toImageBitmap(dataUrl: string): Promise<ImageBitmap> {
  const bin = atob(dataUrl.split(",")[1] ?? "");
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return createImageBitmap(new Blob([bytes], { type: "image/jpeg" }));
}
