# AUDIT ONLY — has the navigation/header work already landed?

**Do not change any code.** Read the repo and report. The goal is to decide whether
`PROMPT_navigation.md` still needs porting, is partially in, or is already done.

Work in `client/`. For each item below, answer with one of **LANDED / PARTIAL / NOT LANDED**,
plus the file + line you based it on. If a check is ambiguous, say so rather than guessing.

## 1. Shared header component
- Is there a `BrandHeader` (or equivalent full-bleed global header) component? Path?
- Does it render the wordmark from `assets/logo-wordmark-light.png` (or an imported equivalent),
  and is the wordmark **non-clickable** (no `<a>`/`onClick`/`Link` wrapper)?
- Does it take an `onMenu` prop, and does the hamburger render **only** when `onMenu` is passed?
- Grep for `PageMenu`. Is it still defined? Is it still **mounted** anywhere?
  (Expected end state: retired — may exist unmounted, must not be rendered.)

## 2. Page header row order
For `PageTitle` (or equivalent): is the **h1 row first** and the **eyebrow row second**?
(The old order was eyebrow-then-h1.) Quote the JSX order.

## 3. Slot rule — status right of h1, controls right of eyebrow
Check each screen and report which slot its right-hand content sits in:

| Screen | expected h1-row right (status) | expected eyebrow right (controls) |
|---|---|---|
| Landing | — | date Prev / date / Next / Today |
| Game view (live) | LIVE + elapsed | Live / Head-to-head |
| Game view (pregame) | countdown pill | Preview / Head-to-head |
| Leaders | — | League · MLB / AL / NL |
| Standings | — | Order · Standing / Wild Card |
| Player | — | — |

Also confirm content-level switches are **below** the page header, left-anchored:
leaders' `Batting / Pitching`, the player tab strip.

## 4. Nav drawer — five destinations
Is there a `NavDrawer`? Does it list exactly **Games · Teams · Standings · Leaders · Settings**?
Is the first item labeled **"Games"** (not "Today's games")? Grep every `back`/return label
for the string `Today's games` — any remaining occurrence is NOT LANDED.

## 5. Teams page
- Does a route exist for a top-level teams directory (e.g. `/teams`) with a page component?
- Does it have a `Order · Division / A–Z` control in the eyebrow slot?
- Division view: 3×2 groups of five, row = logo · name · W–L · PCT, whole row links to the team page?
- A–Z view: two columns, all 30, with a division column?

## 6. Standings — A–Z removed
Is the Standings order control **`Standing / Wild Card` only** (no A–Z)?
Is there ONE shared league definition (division groups + team helper + pct helper) that both
Standings and Teams import, or are they duplicated?

## 7. Search
- Is there a search field mounted **inside** the global header, so it appears on every screen?
- Icon sits left of the hamburger; clicking slides a ~400px pill field out right-to-left,
  overlaying the return link; Esc / ✕ / outside-click dismisses **and clears**?
- Grouped dropdown with **Teams** (name, nickname, exact abbr), **Players** (last-name match
  first; row shows pos · team), **Games** (parsed date row + count)?
- Date parsing accepts `may 23`, `5/23`, `2026-05-23`; a **bare month with no day does not match**?
- Is player search hitting a **real backend name query** (last-name prefix over active rosters →
  name, pos, `mlbId`), or still a hardcoded mock list? Report which.

## 8. Removed-as-redundant items (these are DELETIONS, not no-ops)
- **Landing filter strip** (`All / Live · N / Final · N / Upcoming · N`) — is it still rendered?
  It was shipped previously and is now supposed to be **gone**.
- **Leaders' "Top 10 · each category"** standalone line — gone, folded into eyebrow text?
- **Standings' "Every team links to its page"** helper line — gone?

## 9. Header gutter (the open question)
Measure, don't eyeball the CSS alone:
- Does the global header's **hairline/bottom rule run full-bleed** to the viewport edges,
  or is it inset by a container?
- Is the **wordmark's left edge** at the same x as the page **`h1`'s left edge** below it
  (both on the content column, 28px)? Report both computed left offsets and whether any
  ancestor applies padding twice (header padding + page container padding).

## 10. Team pages
`Team Page - Overview` / `Team Page - Schedule` equivalents: do they use the shared header
pattern (or a faithful hand-built copy), and do they use the **wordmark PNG** rather than an
inline diamond + `SC◆REBOOK` text mark?

---

## Output

End with a short verdict block:

```
BrandHeader:        LANDED / PARTIAL / NOT LANDED
PageTitle row order:
Slot rule:
NavDrawer (5 items):
Teams page:
Standings A–Z removed:
Search:
Redundant-item deletions:
Header gutter aligned:
Team pages:

OVERALL: handoff still required? YES (list what's missing) / PARTIALLY / NO
```

If OVERALL is anything but NO, list the missing pieces as a short ordered work list —
smallest-diff-first — but still **make no edits**.
