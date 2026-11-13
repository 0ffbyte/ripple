---
name: summarise
description: Summarise a webpage into clean, scannable markdown. Use when the user asks to summarise, TL;DR, or digest a URL or page content.
---

# Summarise

## Output Template

# {Page title}

> {Takeaway: the conclusion or recommended action, one sentence.}

**Source:** {domain} · **Type:** {article, docs, product, thread, etc.} · **Read time saved:** ~{N} min

## Key Points

1. {3 to 5 items, one idea each, under 20 words, most important first}

## Details

1. **{Heading mirroring the page's structure}:** {One sentence.}

## Notable

1. {Numbers, dates, names, or one short quote (under 15 words)}

## Rules

**Content**

1. Use only what the page says. No outside facts, opinions, or inference.
2. Paraphrase. Never copy passages.
3. Lead with the point. No filler like "this article discusses".
4. If the page conflicts with itself, report both claims, attributed.

**Length**

1. Default 150 to 250 words. Under 100 for short pages. Follow the user's length if given.
2. Omit any section with nothing useful in it. Details and Notable go first.

**Format**

1. Standard markdown only: headings, numbered lists, bold, blockquote.
2. Use numbered lists everywhere. No bullets.
3. Match the page's language unless told otherwise.
4. Bold for labels only.

**Edge cases**

1. Paywalled, blocked, or empty page: say so in one line, then summarise only what is visible.
2. Mostly navigation or listings: describe purpose and structure instead of forcing key points.
