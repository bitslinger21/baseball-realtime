# Fix — BUG-010: Stats tab Home Runs row shows the wrong note (echoes the XBH breakdown)

You are working in the **`baseball-realtime` client** (React 19 + Vite + TypeScript). **Do only this. Touch nothing else.** Small, contained fix.

> ⚠️ **Numbering note:** there are **two** `BUG-010` entries in `bug-list.md` (a collision). THIS is the **Stats-tab Home Runs note** one — *not* the game-view position-restore BUG-010 (which is already fixed/shipped). Don't touch the game view.

## The bug

Player view → **Stats tab → Production card**. The per-row "note" column is wrong on the **Home Runs** row:

- **Home Runs** row (value **2**) carries the note **"4D, OT"** — a **doubles/triples** breakdown that belongs on the **Extra-base hits** row (which correctly reads **"4D · OT · 2 HR"**).
- The HR row should describe **its own** value (home runs), not echo the XBH breakdown.

**Secondary (glyph):** the triples token **"OT"** is meant to read **"0 triples" = `0T`**, but it's rendering as **letter-O + T**. It appears on **both** the HR and XBH rows. Confirm the note is built with the **digit `0`**, not the letter `O`.

## Expected

- **Home Runs** row note: describes home runs, **or is blank** if there's no meaningful HR-specific note to show. It must **not** repeat the doubles/triples (XBH) breakdown.
- **Extra-base hits** row note: unchanged in meaning (`4D · 0T · 2 HR`), but with the triples token as **`0T`** (digit zero).
- The triples-token fix applies **everywhere** the note is built (HR row, XBH row, any other row that prints a triples count).

## Where to look

The Production-card row config / note-builder in the Stats tab component (`PlayerPage.tsx` / the Stats-tab render). Find where each row's `note` string is assigned:

1. The **HR row is being handed the XBH row's note string** — fix the mapping so the HR row gets its own note (or `undefined`/empty). Likely a copy-paste or an off-by-one in the rows array.
2. The **triples token** — wherever the note interpolates the triples count, confirm it uses the numeric value (`${triples}T` → `0T`), not a hardcoded/letter `O`. If it's a literal string, replace the `O` with the real triples count from the stat source.

## Must-not

- Don't restyle the Production card, change column layout, or touch other rows' values.
- Don't touch the **game view** (the other BUG-010).
- Don't invent a new HR note if none is warranted — blank is correct over fabricated.
- Keep all numerals mono / `tabular-nums` (unchanged — just don't regress).

## Acceptance

- Stats → Production: the **Home Runs** row no longer shows `4D, OT`; it shows an HR-appropriate note or nothing.
- The **Extra-base hits** row still shows its breakdown, with triples as **`0T`** (digit zero), not `OT`.
- No other row, card, or screen changes.

Open one PR titled **"BUG-010 (Stats) — fix Home Runs row note + 0T glyph"**.
