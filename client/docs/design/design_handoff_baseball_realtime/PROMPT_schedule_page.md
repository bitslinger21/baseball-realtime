# Team Schedule Page — new route

**Design:** `Team Page - Schedule.html` (design source of record) · Aug 24, 2026
**Status:** design signed off pending your review · **ungated** (no new API beyond the season schedule endpoint)

## What this is

A full-season schedule for one team, reached from the team page. Month-by-month
accordion of every game — played and remaining — in the existing Scorebook design
language (cream surfaces, DM Sans labels, JetBrains Mono for every numeral).

## Route & entry point

- New route: `/team/:teamId/schedule`
- Entry point today: the team page's **Next up** card header — `Full schedule →`
  (already added to `Team Page - Overview.html`)
- Header carries one contextual return: `← Houston Astros` (same one-header /
  one-return pattern as the game and player views)

## Structure, top to bottom

1. **App bar** — SC◆REBOOK mark + contextual return.
2. **Page head** — team logo (52px), eyebrow `{Team} · {season}`, title `Schedule`,
   and four summary stats right-aligned: Record · Home · Away · Remaining
   (all mono).
3. **Sticky header — app bar + page head + control bar are ONE pinned block.**
   Wrap all three in a single `position:sticky; top:0` container (`.hdr`). Do not
   give the inner pieces their own `top` values: two separately-pinned bars leave
   a gap that content visibly scrolls through (we shipped that bug and fixed it
   this way). Page-head metrics are deliberately compact so the pinned block
   doesn't eat the viewport — title 28px, logo 42px, summary values 19px.
   Any scroll offset (month-jump, open-month-on-load, `.mo` scroll-margin) must be
   **measured from the header's live height at runtime**, not a hard-coded number
   — the mock sets a `--hh` custom property from `getBoundingClientRect()` on load
   and resize.

   Control bar contents —
   - Segmented filter: `All / Results / Upcoming / Home / Away` (**inert in the
     mock; wire it**)
   - Month chips `Mar…Oct`; current month has the `now` treatment.
     Clicking a chip expands that month, marks the chip `now`, and smooth-scrolls
     it to the top (offset 118px so the sticky bar doesn't cover the header).
4. **One `<section class="mo">` per month** — a collapsible accordion:
   - Header button: caret (rotates 90° when open) · month name · mono summary.
     Summary reads `{W}–{L} · {N} games` for months with results, and
     `{N} games · {H} home` for months entirely in the future.
   - Body: the month's game table.
   - **Current month is open by default; all others collapsed.** On load the page
     scrolls the open month to the top of the viewport (same 118px offset).

## Game table columns

| Column | Content |
|---|---|
| Date | `Tue **Aug 25**` — day-of-week muted, `Mon DD` bold. `width:150px; white-space:nowrap` (a 2-digit date wraps below ~132px) |
| Opponent | `vs` / `@` prefix (muted, fixed 17px column so logos align) + 24px team logo + team short name |
| Result | Played: W/L chip (green `#3f6b34` / neutral `#b4ae9b`) + mono score. Upcoming: local first-pitch time, muted |
| Record | Running record **after** that game, mono, right-aligned. `—` for upcoming |
| Decision | Played: `W: Valdez (13–5)` and optional note. Upcoming: `Verlander vs. Gausman` probables, `TBD` when unannounced. Ellipsis-truncated |
| Action | Played: `Box →`. Today/upcoming: `Enter game →` (the single game-entry verb used everywhere) |

## Row states

- **Played** — default row.
- **Today / live** — `tr.live`: warm tint `#faf0eb`, 3px rust inset bar on the
  first cell, `Today` mark in the date cell, live score + rust `▲ 11TH` pill in
  place of the W/L chip.
- **Upcoming** — `tr.fut`: full-strength text, `—` record in `#a39d92`.
- Hover on any row: `#efeae0`.

## Data needed

Per game: date/time (team-local), opponent id + short name, home/away,
status, final score, running team record after the game, winning/losing pitcher
with season record, probable starters, and the game id for the row link.
All of this is either already on the daily-games payload or comes from the
standard season-schedule endpoint — **no Statcast, nothing gated.**

## Empty & loading states — NOT DESIGNED (found in port)

The first port shipped with an empty schedule payload and the page read as
broken: 0–0 record, `Remaining 0`, no month chips (chips derive from the games
array), no sections, nothing to expand. Needs a loading skeleton and a
"No games for this season" panel that keeps the header and filter bar visible.
Ask me for these designs if you want them before wiring.

## Notes / open items

- The **segmented filter is not wired** in the mock. Suggested behavior: filter
  rows within every month, and hide a month section whose rows all filter out
  (keep its header with a `0 games` summary rather than removing it, so month
  rhythm holds).
- Accordion state is not persisted. If you want it to survive navigation, keep it
  session-scoped (`sessionStorage`), consistent with the game-view position model.
- Series grouping (visually bracketing the 3–4 games of a series) was considered
  and left out — the `vs`/`@` + repeated opponent already reads as a series.
- The mock's data is fabricated (162 games, 130 played, record ending 78–52 on
  today's live game). Structure and formatting are the spec; the numbers are not.

## Files

- `Team Page - Schedule.html` — the design (new)
- `Team Page - Overview.html` — one line changed: `Full schedule →` link added to
  the Next up card header
