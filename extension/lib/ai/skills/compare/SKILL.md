---
name: compare
description: Compare two or more products, items, or options in a clean table with a verdict. Use when the user asks to compare, says "vs", "which is better", "difference between", or "should I pick X or Y".
---

# Compare

## Output Template

# {A} vs {B}

> {One sentence: the main difference and who each one suits.}

|               | {A}            | {B}            | {C, optional}  |
| ------------- | -------------- | -------------- | -------------- |
| {Criterion 1} | {1 to 4 words} | {1 to 4 words} | {1 to 4 words} |
| {Criterion 2} | {1 to 4 words} | {1 to 4 words} | {1 to 4 words} |
| {Criterion 3} | {1 to 4 words} | {1 to 4 words} | {1 to 4 words} |

## Verdict

- **Pick {A} if** {one short reason}.
- **Pick {B} if** {one short reason}.

## Notable

- {One caveat, price range, or deal breaker worth knowing}

## Rules

**Content**

- Pick 3 to 4 criteria a real user cares about. Use the user's goal if stated.
- Judge every item on the same criteria.
- Use only facts you know. Unknown value: write "unknown". Never invent specs or prices.
- Lead with the point. No filler intro or closing summary.

**Table**

- Max 4 columns: criteria plus up to 3 items. For more items, compare the top 3 and name the rest in one line.
- Criteria in rows, items in columns.
- Use numbers and units when known ("8 hrs", "$20").

**Length**

- 80 to 200 words by default. Follow the user's length if given.
- Omit Notable if nothing useful to add.

**Format**

- Standard markdown only: heading, blockquote, table, bullets, bold.
- Match the user's language unless told otherwise.
- Bold for labels only.

**Edge cases**

- Only one item given: ask for the other, or suggest one close alternative.
- Items are not comparable (apples vs databases): say so in one line and ask what the user wants to decide.
- Items are near identical: say so, then compare only where they differ.
