# Nav: PageMenu extended to Final Scorecard screen — Aug 1, 2026

File: `holistic/game-final-scorecard.jsx` (`FinalScorecardScreen`).

## Status
Completes the nav migration (see prior `PROMPT_pagenav.md` handoffs). Every real screen now
uses `window.PageMenu` inline next to the title, no separate header bar. The only holdout,
`game.jsx`, is intentionally NOT migrated — it's superseded by `game-v2.jsx` and not ported.

## What changed
Replaced the `AppHeader left={☰} right={← Today's games}` row with `navMenu={<window.PageMenu
backLabel="Today's games" active="games" />}` on `PageTitle`, matching every other screen.

## Port note
Same as the prior nav prompts: `backLabel`/back target should resolve from real router history
with a fallback, and the destinations list points at the same existing Leaders/Standings routes.
