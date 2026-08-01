# Pregame screen — simplified to 2 cards (Aug 1, 2026)

File: `holistic/game-v2.jsx` (`GameScreenV2Pregame`).

## Status
Superseded. The richer 7-card pregame exploration (`PregameMatchupLeft`, `PregameContext`,
`PregameStarters`, `PregameOdds`, `PregameSeries`, `PregamePitchByPitch`) was removed from
`game-v2.jsx` — those functions were orphaned dead code, not wired into the exported
`GameScreenV2Pregame`. The screen was deliberately reduced to 2 cards (dark line-score band +
a single Matchup card with a Preview/Head-to-head toggle), largely due to pregame data
availability.

If porting the live app's pregame state, build only what's in `README.md` §2b — the 2-card
version. Ignore the data-wiring notes below; they described the retired richer version and are
kept only for history.

## What changed (historical, retired richer version)
Several pregame components had their own independently-hardcoded roster/pitcher names,
duplicating data that already exists in the shared `LINEUPS`/`PROBABLES` mocks. That version
also had a corrected empty state for "Top of the order" (lineups aren't posted this far ahead
of game time). None of this applies to the shipped 2-card version.
