# Bug audit — BUG-007 · 015 · 016 · 019 · 020 (rev 1, Oct 9, 2026)

**Read-only audit. Do NOT change any code.** Report findings only. If a fix is needed, describe it; don't apply it.

A design-side code read of `main` @ `7e28adc` suggests all five are fixed in code. This audit confirms that against REAL game data and tests the two edge cases flagged below.

## How to test
- Use real finished games from the play-by-play feed (hydrated `PlayUpdate[]`), not mock data.
- For each bug: find a game that triggers it, run the relevant derivation over its updates, and check the output against the official MLB play-by-play for that game.
- Write a small throwaway script or test (do not commit it) that loads a game's updates and prints the derived maps. If the feed can't be loaded outside the app, say so and audit by reading the code + the `[scorecard]` console logs on the game page.

---

## BUG-019 · "N runs score" pill on the wrong at-bat
**Where:** `client/src/pages/GamePage.tsx` → `scoringByAtBat` (queue-based, uses `tryEnqueue`).
**Check:**
1. **Back-to-back HRs.** Find a game with consecutive home runs. Each HR's own row carries its own pill, with the right run count and resulting score.
2. **Grand slam / multi-run hit.** One row, correct total runs.
3. **⚠️ Edge case: run with no scoring play in the queue.** Find runs that scored on a **wild pitch, passed ball, balk, error, or bases-loaded walk/HBP**. The queue is empty in that case, so the code falls back to `effectiveIdx` (the row carrying the score change). Report which row gets the pill. **Expected:** the at-bat in progress when the run scored, never the next batter's row.
4. **Score-lag.** Find a run where MLB delivers the score change on the first pitch of the NEXT at-bat. The pill must stay on the at-bat that produced the run.
5. Does `tryEnqueue`'s description check ("scores", "homer", "home run", "run(s)") miss any real scoring descriptions (e.g. "steals home", "on a throwing error")? List any that don't match.

## BUG-020 · Scorecard runner advancement drawn one at-bat early
**Where:** `GamePage.tsx` → `runnerFinalBaseByAtBat`. The v4 patch (`terminalAtBats` / `pendingCatchAll`) was NOT applied; instead the loop skips `isFinalPitchOfAtBat === false` and processes only `lastFinalUpdateByIdx`.
**Check:**
1. **The original repro: game 824164, BOT 2.** Trammell doubles. While the NEXT batter is mid at-bat, Trammell's cell must show only H→2B, with no 2B→3B segment until that next at-bat ends. Check at a live-like scrub position (Scout marker inside the next at-bat), not just the final state.
2. **Does `isFinalPitchOfAtBat` reliably arrive?** Count updates where it's `undefined`/`null` (not `false`). Those pass the `!== false` guard. If mid-AB updates with a `playResult` and an undefined flag exist, the bug can come back. Report counts per game.
3. **⚠️ Edge case: mid-at-bat stolen base / wild pitch / pickoff.** These updates usually have `playResult == null`, so the loop skips them entirely. Report:
   - When does the runner's advance appear: the moment it happens, or only when the at-bat ends?
   - Is it drawn at all, and on the right runner's cell, credited to the right at-bat?
   - Caught stealing (`runnerOutBase`): still recorded as an out?
4. **Fielder's choice / groundout with advance:** advance credited to the batter whose play caused it.

## BUG-016 · Home-run scorebook cell renders empty
**Where:** `client/src/pages/game/PitchByPitchV2.tsx` (enum → cell props, `case 'HomeRun'`) and `MatchupLeft.tsx` (`base("HR", 4, true)`).
**Check:** for a real HR, both the feed badge and the batter-card At-bats cell show the full bold diamond, the `HR` code, and the green run-scored shade. Also check 1B/2B/3B → `reachedOnPA` 1/2/3, and that `finalBase`/`scored` reflect later baserunning for non-HR hits.

## BUG-015 · Finished at-bat shows only the ending count
**Where:** `PitchByPitchV2.tsx` → `playResultToLabel` + code badge.
**Check:** every finished row reads `batter · result · count` with a code badge. List every `playResult` enum value seen across ~5 games and confirm each one maps to a real label (no blank, no raw enum, no "–"). Flag any unmapped values, especially `FieldersChoice`, `Error`, `SacBunt`, `DoublePlay`, `TriplePlay`, `CatcherInterference`, `IntentionalWalk`, `HitByPitch`/`HBP`.

## BUG-007 · "IL stint started" note placement
**Where:** `client/src/pages/PlayerPage.tsx` History game log (~line 2056 fallback rows; ~line 2184 real rows from `drilldown.gameLog`).
**Check:**
1. When does the hardcoded fallback array render? If it can ever show for a real player, report it: that's fabricated data (same class as BUG-011/013).
2. With real data, where does an IL note come from (`g.summary`)? Is it on the last game before the absence?

---

## Report format
One block per bug:
```
BUG-0XX — FIXED | STILL BROKEN | PARTIAL | COULDN'T TEST
Evidence: game id(s), inning, what rendered vs what MLB play-by-play says
Edge cases: result of each ⚠️ check
If not fixed: file + function + one-line description of the fix (do not apply)
```
End with a short list of any NEW issues found along the way.
