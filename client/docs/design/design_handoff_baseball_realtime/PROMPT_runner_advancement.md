# Runner-advancement marking on scoring plays — Aug 2, 2026

File: `holistic/game-v2.jsx` (`sbFromCode`, `PitchByPitchV2` collapsed-PA scorebook cell).

## Problem
When a batter's hit scores runners already on base, only the batter's OWN scorebook cell
showed the play — the other runners' cells stayed frozen at their own PA result (e.g. Altuve's
"1B" cell didn't reflect that he later scored on a teammate's grand slam).

## Fix
`sbFromCode` now takes the full PA object (not just the icon) and honors explicit
`finalBase`/`scored` overrides on that PA, drawing the existing bold/light `ScorebookCell`
convention: bold = what the runner did at HIS OWN plate appearance, light = later baserunning
(the SAME split already used elsewhere in the design, e.g. the batter-card at-bats row).
Demonstrated on TOP 8: Altuve (1B) and Tucker (BB) now show a light extension to home,
scored on Paredes' grand slam — Paredes' own HR cell is unaffected (bold only, he's the one
who drove it in).

## Port requirement
This needs real base-occupancy tracking across a half-inning, not just per-PA data:
- Track who is on which base as of each play (from the live feed's base-state per pitch/PA,
  which the app already receives for the diamond-view B/S/O + bases display).
- When a play produces a run, walk the runner(s) who were on base back to THEIR OWN at-bat
  row and update ITS `finalBase`/scored state (not just the batter's row) — same idea as the
  BUG-019 scoring-pill fix, but this needs to write to multiple historical PA rows, not one.
- Bold segment = that runner's own PA result. Light segment = advancement from a later
  teammate's play. Only apply the light extension once — don't re-derive it every render if
  already computed; cache per at-bat once the scoring play is known.

No new API needed — this is feed data already available (base-before/base-after per play),
just not currently propagated backward onto earlier at-bat rows in the UI model.
