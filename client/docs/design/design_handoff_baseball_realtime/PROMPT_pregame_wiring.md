# Pregame screen — internal data wiring pass (Jul 31, 2026)

File: `holistic/game-v2.jsx` (`GameScreenV2Pregame` and its child components).

## What changed
Several pregame components had their own independently-hardcoded roster/pitcher names,
duplicating data that already exists in the shared `LINEUPS`/`PROBABLES` mocks (the same
objects the live game view and Head-to-head screen already read from). Fixed so pregame can't
drift out of sync with the rest of the app:

- `PregameMatchupLeft`'s leadoff-batter card — name/position now read from
  `LINEUPS.HOU.lineup[0]` instead of literal "Jose Altuve" strings.
- `PregameMatchupLeft`'s first-pitch headline ("X vs Y") — pitcher surnames now derived from
  `PROBABLES.away`/`PROBABLES.home` instead of a hardcoded "Valdez vs Imanaga" string.
- `PregameContext`'s left half ("Probable starter · [home]") — pitcher surname now derived
  from `PROBABLES.home` instead of a hardcoded string.

**Correction:** `PregameContext`'s right half is NOT a populated "Top of the order" list.
Lineups aren't posted this far ahead of game time — only the probable starter is (rotation
info, known days ahead). So the right half renders a deliberate **empty state**: eyebrow
"Top of the order · [away]" + a dashed placeholder icon + "Not yet posted". Do not port a
real top-3 batter list here — port the empty state.

`PregameStarters` and `PregameLineScoreBand` were already reading from `PROBABLES` — unchanged.

## What's still standalone mock (by design, no roster identity to wire)
`PregameOdds` (win-probability split), `PregameSeries` (last 2 head-to-head results), and the
"Coming in" season-form zone in `PregameLineScoreBand` are illustrative context numbers with no
corresponding shared data source in this mock — leave as-is unless you want a dedicated
odds/series/form data shape added.

## Port note
In the real app, this is the same principle to apply at the data layer: the pregame page
should read the SAME lineup/probable-starter objects the live page and any head-to-head view
use, not separately-fetched/duplicated copies — this pass just enforces that at the mock level
so the design doesn't visually contradict itself between screens.
