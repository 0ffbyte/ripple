---
name: summarise
description: Summarise a webpage into clean, scannable markdown. Use when the user asks to summarise, TL;DR, or digest a URL or page content.
---

# Summarise

## Output Template

# {Page title}

> {One sentence: what this page is and why it matters.}

**Source:** {domain} · **Type:** {article, docs, product, thread, etc.} · **Saves:** ~{N} min

## Key Points

- {3 to 5 bullets, one idea each, under 20 words, most important first}

## Details

**{Heading mirroring the page's structure}**
{1 to 2 sentences.}

## Notable

- {Numbers, dates, names, or one short quote (under 15 words)}

## Takeaway

{The conclusion or recommended action, in one sentence.}

## Rules

**Content**

- Use only what the page says. No outside facts, opinions, or inference.
- Paraphrase. Never copy passages.
- Lead with the point. No filler like "this article discusses".

**Length**

- 150 to 300 words by default. Under 100 words for short pages. Follow the user's length if given.
- Omit any section with nothing useful in it. Details and Notable are the first to go.

**Format**

- Standard markdown only: headings, bullets, bold, blockquote.
- Match the page's language unless told otherwise.
- Bold sparingly, for labels only.

**Edge cases**

- Paywalled, blocked, or empty page: say so in one line and summarise only what is visible.
- Page is mostly navigation or listings: describe its purpose and structure instead of forcing key points.
- Conflicting claims on the page: report both, attributed.
