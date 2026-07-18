# Standings — Rank History tab (dev handoff, Jul 11, 2026)

Adds a third view to the Standings page: a **wins-over-time line chart**, one line per team in a
selectable scope. Source of truth: `holistic/standings.jsx` + standalone `Standings.html` (+ handoff
copies under `design_handoff_baseball_realtime/holistic/`). Net-new — does not change the Divisional
or Wild Card views from `PROMPT_standings.md`.

## What it is
A `Segmented` control on the Standings page gains a third option: **Divisional / Wild Card / Rank
History**. Selecting it swaps the two-column division/wild-card layout for a single full-width `Card`
containing a line chart:

- **X-axis** — days of the season, from Opening Day through the standings' "as of" date (daily
  granularity, not weekly).
- **Y-axis** — **cumulative wins**, 0 at the bottom up to a "nice" rounded max (chart picks a clean
  step — 1/2/5/10/15/20/25/50/100 — so the axis reads well whether the scope is a 5-team division or
  all 30 teams).
- **One line per team** in the selected scope, stroked in that team's real primary color, with the
  team's logo as an end-of-line marker at the final data point.
- **Scope selector** (a `<select>` in the card header): All MLB · AL · NL · each of the 6 divisions ·
  AL/NL Wild Card race (the 12 non-division-leader teams in that league).
- **Hover** anywhere over the chart: nearest line highlights (thicker stroke, others dim to ~16%
  opacity), and a small dark tooltip shows `{team name} — {wins} W · {date}`.

Default scope on load: **AL East**.

## Why wins, not rank
An earlier iteration plotted rank (1st–last) on the Y-axis. Feedback: cumulative wins is more legible
and more informative — it shows margin, not just order, and reads correctly at any scope size (a 5-team
division and a 30-team all-MLB view use the same axis logic without needing per-scope row heights).

## Data — currently mocked, needs a real endpoint
The chart currently **fabricates** a plausible day-by-day win sequence per team: it takes each team's
real final W/L (from the existing standings data) and deterministically shuffles the order those wins
and losses land in across the season (seeded per team, so it doesn't reshuffle on re-render), so the
final data point always matches today's real record. **This is a placeholder for a real time series.**

**To wire real data:** for each team in scope, a day-by-day (or game-by-game, resampled to daily)
cumulative win total across the season. This is a standard MLB StatsAPI capability — the *standings at
date* endpoint, called incrementally per day, is one way; if the backend already has a per-game result
log per team, cumulative wins can be derived by walking that log and stamping each game's date. Prefer
whichever is cheaper given the existing standings data layer — do not add a new external dependency
if the current standings source already has enough to derive this.

## Component map (`standings.jsx`)
- `teamsForScope(scopeId)` — resolves a scope id (`'ALL'`, `'AL'`, `'NL'`, a division name, `'ALWC'`,
  `'NLWC'`) to the flat team list to plot. Wild-card scopes exclude the 3 division leaders in that
  league.
- `buildWinsSeries(teams)` — **the mock data generator described above.** Replace this function's
  internals with a real fetch/derivation; keep its output shape: `{ [teamKey]: number[] }`, one
  cumulative-wins value per day in `RH_WEEKS`, ending in that team's real current win total.
- `RH_WEEKS` / `RH_WEEK_LABELS` — the day array (Opening Day → "as of" date) and their formatted
  x-axis labels. Update the hardcoded start/end dates to the real season boundaries when wiring.
- `RankHistoryChart({ teams })` — the SVG chart: gridlines + Y ticks (`niceStep`), X labels, one
  `<polyline>` per team, an HTML-overlay `TeamDot` logo marker at each line's end, and the hover/tooltip
  interaction (nearest-line-by-Y-distance-at-cursor-X).
- `RankHistoryCard()` — the `Card` wrapper: header (title + date-range subtitle) + scope `<select>` +
  `<RankHistoryChart>`.
- `niceStep(max)` — picks the Y-axis tick step from a fixed ladder so the grid stays readable at any
  team count / win range.

## Tokens / rules
- Team stroke color = that team's real primary hex (already defined per team for `TeamDot`/`TeamMark`
  — reuse the same source, don't duplicate a second color table).
- All axis numerals and the tooltip's win count are **mono + tabular** (`T.mono`,
  `fontVariantNumeric:'tabular-nums'`). Sans is for the chart title/subtitle and team name in the
  tooltip only.
- Chart renders as an SVG scaled by `viewBox` (not fixed pixels) so it stays responsive; the logo
  markers are separately-positioned absolute HTML `<div>`s percent-mapped to the same viewBox, not SVG
  `<image>`, to reuse the existing `TeamDot` component (logo + letter-mark fallback).

## Acceptance
- Segmented control shows three options; selecting "Rank History" swaps in the chart, replacing the
  two-column division/wild-card grid (not stacked below it).
- Scope `<select>` covers: All MLB, AL, NL, all 6 divisions, AL Wild Card race, NL Wild Card race.
  Switching scope redraws the chart with the right team set and rescales the Y-axis.
- Every line ends exactly at that team's real current win total (sanity check against the Divisional
  view's W column).
- Hovering the chart highlights the nearest team's line and shows a tooltip with team name, win count,
  and date; other lines dim so the hovered one is legible even at the 30-team All MLB scope.
- Y-axis tick step is a "nice" round number (1/2/5/10/15/20/25/50/100), never an awkward fraction.
- **Known placeholder, not a bug:** the day-by-day shape of each line is fabricated (only the final
  value is real). Flag this to the data owner — this prompt's data section is the spec for replacing
  it with a real time series.
