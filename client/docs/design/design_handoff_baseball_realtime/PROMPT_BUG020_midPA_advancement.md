# BUG-020 (follow-up) — advancement drawn on a mid-PA sub-event, not the batter's own PA-ending result

File: `client/src/pages/GamePage.tsx`, `runnerFinalBaseByAtBat`.

## Confirmed NOT the deployment/restart issue
The server (`about.isComplete` guard) and client dedup (`lastFinalUpdateByIdx`) fixes from the
previous session are live and correct — restarting the API server does not fix this. This is a
different, more specific bug in the same function.

## Root cause
The catch-all `else` branch of `runnerFinalBaseByAtBat` (handles FC/WP/PB/SB/BK-style
advancement) fires on ANY update carrying a non-null `playResult` for an `atBatIndex`, gated
only by `isFinalPitchOfAtBat`. But a stolen base / wild pitch / passed ball / pickoff attempt
that happens mid-plate-appearance (e.g. on ball 1 or 2 of the NEXT batter's at-bat) is its own
complete "play" in MLB's feed — `about.isComplete = true` on THAT sub-event — even though the
batter at the plate hasn't finished their own PA. Example: Trammell (2B) advances to 3rd on a
stolen base that happens early in the next batter's at-bat. That sub-event is itself "final"
(a real, complete play), so `recordAdvance(b2, 3, idx)` fires immediately, drawing the
advancement before the next batter's OWN at-bat has concluded — exactly the "drawn too soon /
as soon as the next batter comes up" symptom.

## Fix
Defer any advancement attributed to an `atBatIndex` until that plate appearance has its own
CONFIRMED TERMINAL result (Single/Double/Triple/HomeRun/Walk/IntentionalWalk/HitByPitch/
SacFly/SacBunt/Strikeout/Out/DoublePlay/TriplePlay/FieldersChoice/Error — i.e. a real PA-ending
result, not just "some update for this atBatIndex was marked isFinalPitchOfAtBat"). Concretely:

1. First pass over `replayUpdates`: build a `Set<number>` of atBatIndexes that have a genuine
   PA-ending `playResult` (the terminal list above) on their own last-qualifying update — this
   is "at-bats that have actually finished."
2. Second pass (the existing loop): when a catch-all-branch update's `idx` is the batter
   CURRENTLY at the plate (i.e. `idx` is not yet in that completed set), buffer its effect
   instead of applying it immediately — hold the base-state change and any `recordAdvance`
   calls it would trigger until `idx` appears in the completed set (i.e. until that batter's
   own PA has a terminal result). Once complete, flush the buffered advancement using the
   runner state as of THAT sub-event (not re-derived from a later state).
3. HomeRun/Triple/Double/Single/Walk/IBB/HBP/SacFly branches are unaffected — those already
   only fire on genuine terminal playResults, so they're not vulnerable to this bug. Only the
   catch-all `else` branch (FC/WP/PB/SB/BK/pickoffs/etc.) needs the buffering.

## Verify
Game 824164, BOT 2: Trammell's double draws H→2nd immediately (correct — his own PA is
terminal). If a stolen base moves him to 3rd during the next batter's at-bat, that advancement
should NOT appear until the next batter's own at-bat concludes (whatever their result is) —
watch the console `[scorecard] AB#N → 3B` log; it must not print until `[scorecard] processing
AB#M` (M = the next batter's own PA-ending result) has printed.
