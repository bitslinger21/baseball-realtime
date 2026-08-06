# BUG-021 — runners advance/score on a 3rd-out play (should end inning, no advancement)

Game 824161, BOT 4: Peña grounds out (AB#33, `result=Out desc="In play, out(s)"`), bases loaded.
Log shows two advancement lines AFTER Peña's own play: `Trammell → HOME` and `Diaz → HOME`.
This is impossible — an out ends a plate appearance and (usually) the inning if it's the 3rd out.
No runners advance on an out unless it's a fielder's choice that happens to advance someone —
but those are tagged as `result=FieldersChoice`, not `result=Out`.

## Root cause
One of two places is incorrectly treating the `bases` state (on1/on2/on3) on an `Out` result
as if those runners actually advanced:

1. **`runnerFinalBaseByAtBat`** — the catch-all `else` branch may be firing for an `Out`
   result (if Peña's update was not deduplicated or not gated properly). An `Out` should NEVER
   trigger runner advancement via the catch-all logic.

2. **`scoringByAtBat`** — may be crediting runs when a score delta appears alongside an
   `Out` result, without checking that an out-play can't legitimately score a run (force play /
   strikeout with bases loaded doesn't advance anyone, even if the feed momentarily carries a
   higher score in the `bases` snapshot).

## Fix
- In `runnerFinalBaseByAtBat`'s catch-all `else` branch: add an early guard `if (pr === 'Out'
  || pr === 'DoublePlay' || pr === 'TriplePlay') return;` — outs never trigger advancement.
- In `scoringByAtBat` (if it's the culprit): confirm that runs are only credited when the
  advance was explicitly recorded in the runner-advancement log (the `→ HOME` lines), not
  inferred from a score delta alone. If a score delta exists but no corresponding runner
  advancement was logged, it's a late update arriving out of order — queue it for the next
  at-bat, don't retroactively apply it to the current one.

## Verify
Game 824161, BOT 4, Peña's at-bat: console should log `[scorecard] processing AB#33(Jeremy Peña)
result=Out` and immediately after, nothing else. No `Trammell → HOME` or `Diaz → HOME`. The
inning ends; the next inning's processing begins with clear runners=null.
