# Advancement lines: 4px width + how-reached annotations — Aug 2, 2026

File: `holistic/shared.jsx` (`ScorebookCell`), `holistic/game-v2.jsx` (`sbFromCode`, TOP 8 example data).

## What changed
1. **Advancement lines are now 4px wide** (both the bold PA-result stroke and the light
   later-baserunning stroke — was 3px/1.5px).
2. **New `advances` prop on `ScorebookCell`**: an array of `{ base, label }`. For each entry,
   the cell draws a filled 6px (3px radius) circle at that base plus a text label showing HOW
   the runner reached it — the batter's own jersey # for a teammate's hit, or an event code:
   BK (balk), FC (fielder's choice), SB (stolen base), WP (wild pitch), PB (passed ball),
   E1/E3 etc. (error, with fielder #), SH (sac bunt).
3. `sbFromCode` (game-v2.jsx) now passes through an `advances` array from the PA object.
   Demonstrated on the TOP 8 grand-slam sequence: Altuve (1B) and Tucker (BB) both carry
   `advances: [{ base: 4, label: '#6' }]` — Paredes (#6) drove them both in — showing the
   light continuation line to home with the "#6" annotation, distinct from Paredes' own bold
   HR cell.
4. **Fix (verifier catch):** the base-4 (home) label was clipped by the SVG viewBox edge —
   moved above the marker instead of below.

## Port requirement (unchanged ask, now with the full annotation vocabulary)
Needs real base-occupancy tracking per half-inning so ANY runner-advancing event — not just
scoring hits — writes an `advances` entry onto the affected runner's OWN earlier PA row:
- Teammate's hit that advances this runner → label = that batter's jersey #.
- BK / FC / SB / WP / PB / E# / SH → label = that code (fielder # for E#).
- Multiple advances for one runner across an inning = multiple `advances` entries, one per
  base reached.
No new API — this is already in the live feed's play-by-play (event type + affected runners),
just not yet propagated backward onto earlier at-bat rows in the UI model.
