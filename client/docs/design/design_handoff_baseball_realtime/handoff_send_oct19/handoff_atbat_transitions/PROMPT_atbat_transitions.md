# At-bat end transitions — close on the final pitch, pre-stage the next batter, go straight to Scout at game end

**Rev 1 · Oct 19, 2026.** Ungated, no new API. Baseline `main` @ `7c53e7f`.

## The bug, and why it's bigger than the scorecard

`client/src/hooks/useAtBatHistory.ts` only moves an at-bat into `completedAtBats` when **the next at-bat's first pitch arrives** (`isNewAtBat`). The final pitch sets `result` but leaves the at-bat as `currentAtBat`. So:

- **Scout / finished games:** the game's last at-bat never closes, because no next pitch ever comes. The scorecard, the batter card's At-bats row and anything else built from `completedAtBats` miss the final play.
- **Live, not the 3rd out:** after the at-bat ends, the screen keeps showing the batter who just finished until the next batter's first pitch, often 20–40 seconds later.
- **Live, game-ending play:** the view goes through the half-inning "Due up" state before becoming final.

The server already sends `isFinalPitchOfAtBat` (BUG-023 fix), so the client can know the moment an at-bat ends.

---

## Part A · Close the at-bat on its final pitch (`useAtBatHistory.ts`)

- When a processed update has `isFinalPitchOfAtBat === true`, set the result fields as today, then **push the at-bat into `completedAtBats` immediately** and set `currentAtBat = null`.
- The next pitch then starts a fresh at-bat via the existing `cur == null → isNewAtBat` path. Keep the `isHalfEnd` marking: set it at close time when this play's `outs === 3`, and keep the existing inning-change check as a backup.
- **MLB resends the last pitch** with its result a few seconds later, and the existing `changed` → rebuild path handles that. Make sure the rebuild also closes on `isFinalPitchOfAtBat`, so the at-bat isn't pushed twice.
- Pitchless plays (automatic intentional walk, caught stealing as its own play) carry `isFinalPitchOfAtBat: true` on their single frame and close the same way.
- **A runner out ends the inning, not the at-bat** (caught stealing for the 3rd out while a batter is up). No `isFinalPitchOfAtBat`, so that batter's at-bat must **not** close. It's dropped as an unfinished PA, and he leads off his team's next half. See Part D.

**Accept:** on 824164 and two postseason finals in Scout, the last play of the game appears on the scorecard, in the batter card's At-bats row and in Earlier at-bats. No at-bat appears twice after the result resend. Scrubbing back and forth with the marker gives the same result.

## Part B · Live, not the 3rd out — pre-stage the next batter

When the final pitch of an at-bat arrives and `outs < 3` (and the game isn't over, Part C):

1. **Work out who is up next:** the batting team's `activeLineup`, the slot after the batter who just finished. That's the same cycle as `dueUp()` in `lineupUtils.ts`, anchored on the finished batter's id. If the live feed exposes MLB's own `linescore.offense.batter` / `onDeck` after the play, **prefer it**: it already knows about an announced pinch hitter. The lineup math is the fallback.
2. **Initialise the whole live view for him**, the same way the half-inning transition pre-stages its leadoff batter, but for the **same team in the same inning**:
   - **Batter card:** his headshot, name, today line, his At-bats row (with an empty dashed live cell) and `vs PITCHER`.
   - **Zone:** empty, count **0-0**, outs and bases as left by the play just finished.
   - **Pitch-by-pitch canvas:** pinned to him with `· up next · 0-0` and a soft **UP NEXT** pill (same style as the half-inning `DUE UP` pill), rust dropped to neutral until his first pitch. The finished at-bat is already at the top of **Earlier at-bats** with its result, code badge and scoring chip. That's where his result stays visible, so don't hold the old batter on screen.
   - **MatchupContext:** head-to-head for him versus the pitcher, with On deck / In the hole moved along by one.
   - The **height lock** still applies: nothing changes height between "up next" and live.
3. **His first pitch arrives:**
   - **Same batter as projected:** the pill drops, rust returns and pitches fill in. Nothing else moves.
   - **A different batter (pinch hitter):** re-initialise everything for the real batter, then continue normally. Also re-derive if a boxscore refresh changes `activeLineup` for that slot before the first pitch, so an announced pinch hitter shows up early.
4. **Mid-at-bat pinch hitter** (same `atBatIndex`, new `batterId`): switch the batter card and canvas to the new batter and keep the count and pitches. MLB credits the PA by count rules, so keep the existing result handling.

**Accept:** in a live game, the moment a non-3rd-out at-bat ends, the screen shows the next batter at 0-0 with UP NEXT, and the finished at-bat is at the top of Earlier at-bats. A pinch hitter's first pitch swaps the view to him. Nothing changes height.

## Part C · Game-ending play → straight to Scout, no "Due up"

When the final pitch of an at-bat **ends the game**, don't enter the half-inning transition. Switch to the finished-game (Scout) view at once, with the marker on the last pitch (`setScoutMarkerIdx(stableUpdates.length)`, as when a game loads final).

Decide game over **locally, from the play itself**. Don't wait for the schedule's `FINAL`, which can lag. Using the play's post-play score, inning, half and outs, for `inning >= 9` (or the scheduled length):

| Play | Game over when |
|---|---|
| 3rd out, **top** half | home team leads (bottom half not needed) |
| 3rd out, **bottom** half | away team leads (if tied → extra innings, normal Due up) |
| **Walk-off**: bottom half, **any outs** | home team takes the lead on this play |

The walk-off ends the game **without** a 3rd out. It's covered here even though it isn't the 3rd-out case, because it would otherwise pre-stage a next batter (Part B) for a game that's over.

- Shortened or suspended games (rain, mercy rules) aren't predictable from the play. For those, keep today's behaviour and switch when the status becomes final.
- If the local call is ever wrong (a scoring correction), the feed's live status wins on the next update.

**Accept:** a top-9 3rd out with the home team ahead, a bottom-9 3rd out with the away team ahead and a walk-off each go straight to the Scout view with the final play on the scorecard. None of them shows Due up or UP NEXT. A tied bottom-9 3rd out still shows Due up.

## Part D · Fix the due-up anchor (`halfInningTransition.ts → deriveDueUpNext`)

`deriveDueUpNext` anchors on the **last `batterId` seen** for the incoming team. If that team's previous half ended on a runner out (caught stealing / pickoff for the 3rd out) while X was at the plate, X never completed his PA and **leads off** the next half. The current anchor skips him.

Anchor on the **last completed PA** for that team (from `completedAtBats`, which Part A keeps correct), not the last update. Part B's next-batter lookup uses the same rule.

**Accept:** find a half-inning ending on a caught stealing or pickoff in the audit set (824164 AB11, Carter caught stealing). The batter who was at the plate leads off that team's next half in Due up.

---

## Report back
Per part: done / partial / blocked, the commit, and the acceptance results with game IDs. Note whether the live feed's `linescore.offense` was available for Part B or you used the lineup fallback.
