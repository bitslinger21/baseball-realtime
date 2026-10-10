# Bug fixes — from the Oct 9 audit (rev 1, Oct 9, 2026)

Follow-up to `PROMPT_bug_audit_oct9.md`. Baseline: `main` @ `ed1a8ae`. Use the same 13 audit games (824164, the seven postseason games, the five late-September games) as the test set, checked against MLB's official play-by-play.

**Do the server work first (Part A).** Parts B–D depend on it. One PR per part is fine.

---

## Part A · Server — `poller.service.ts` (BUG-022, 023, 024, 025; prerequisite for BUG-015 + 020)

**A1 · Send pitchless plays (BUG-022).** `buildPitchFrames` drops plays that have no pitches. Emit one frame for each: automatic intentional walks, and caught stealing / pickoff / stolen base plays that are their own play.
- Accept: 824164 AB66 (Alvarez, automatic IBB) has a feed row and a scorecard cell. 824164 AB11 (Carter caught stealing) reaches the browser.

**A2 · Send `isFinalPitchOfAtBat` (BUG-023).** Put it on the wire in both the live play payload and hydrate. `true` only on the last frame of an at-bat (including a pitchless play's single frame).
- Accept: zero `undefined` values across the 13 games; exactly one `true` per at-bat.

**A3 · Score as of each pitch (BUG-024).** `mapFrameToLiveUpdate` copies the play's final `result.homeScore/awayScore` onto every pitch. Use the score at that pitch (from the pitch event's own score, or by carrying the previous score forward until the event that scores).
- Accept: in Scout, 824164 AB15 shows 0-0 on the first "Ball"; the score and run pill appear only on the pitch where the run scores. Re-run the BUG-019 check: every pill still on the right row.

**A4 · Finer event mapping (BUG-025).** `mapEventToPlayResult` — map these explicitly instead of falling to `Out`/`Other`:

| MLB event | Send |
|---|---|
| Grounded Into DP, Double Play, Strikeout Double Play | `DoublePlay` |
| Triple Play | `TriplePlay` |
| Sac Fly, Sac Fly Double Play | `SacFly` |
| Sac Bunt, Sac Bunt Double Play | `SacBunt` |
| Catcher Interference | `CatcherInterference` |
| Intent Walk | `IntentionalWalk` |
| Hit By Pitch | `HitByPitch` |
| Groundout, Forceout | `Groundout` |
| Flyout, Pop Out, Lineout | `Flyout` / `PopOut` / `Lineout` |
| Field Error | `Error` |
| Fielders Choice, Fielders Choice Out | `FieldersChoice` |
| Caught Stealing *, Pickoff *, Stolen Base * | `CaughtStealing` / `Pickoff` / `StolenBase` |

Keep `Out` only as a last resort. List any MLB event strings still landing in `Other` across the 13 games.

**A5 · Send runner movements (for BUG-020).** For each play, send MLB's `runners[]` on the wire: runner id, start base, end base, out (bool), out base, and the play/event index that caused the move. This is the data Part C draws from.

---

## Part B · Labels — `PitchByPitchV2.tsx → playResultToLabel` (BUG-015)

- Add labels for every value from A4 plus the legacy `Out`, `HBP`, `Other`, so no row ever shows a raw enum or "Other". Suggested: `Out` → "Out", `HBP`/`HitByPitch` → "Hit by pitch", `IntentionalWalk` → "Intentional walk", `SacFly` → "Sac fly", `SacBunt` → "Sac bunt", `DoublePlay` → "Double play", `CatcherInterference` → "Catcher's interference", `FieldersChoice` → "Fielder's choice", `CaughtStealing` → "Caught stealing", `Pickoff` → "Picked off", `StolenBase` → "Stolen base". If the feed carries a richer description (e.g. "Groundout, 6-3"), prefer it.
- Badge codes: IBB → `IBB` on the walk's dashed path; HBP → `HBP` on the dotted path; CI → `CI`, reaches first, not a hit.
- Accept: across the 13 games, zero rows read "Other" or a raw enum; 824164's rows match MLB's result text.

## Part C · Runner tracking — `GamePage.tsx → runnerFinalBaseByAtBat` (BUG-020)

Replace the inference (playResult + before/after bases) with A5's `runners[]`: for each movement, draw a segment on the runner's own cell from start to end base, credited to the at-bat whose event caused it, at the moment that event happens (not when the at-bat ends).
- Batters reaching on E / FC / CI / dropped third strike are placed on base, and their later movement is drawn.
- Advances on outs (groundouts, flyouts, sac flies, FC) are drawn, including runs scored on groundouts.
- Mid-at-bat steals / wild pitches / passed balls / balks draw on the pitch they happen, credited to that event, even if the at-bat then ends in an out.
- Caught stealing / pickoffs draw as outs at the right base.
- Keep `recordAdvance`/`recordOut` output shape so the scorecard and `ScorebookCell` don't change.
- Accept: re-run the audit's comparison — **0 of ~150 runners** differ from MLB (was 74). Spot checks: 849834 AB41 Vargas reaches 2B on AB42 (wild pitch); 849839 AB41 Aranda scores 3B→home on the groundout; 849839 AB3 Díaz is placed on base; 824164 BOT 2 Trammell's 2B→3B still waits for Diaz's at-bat (AB14).

## Part D · Client fixes (BUG-016, BUG-007)

**D1 · Home-run path in the feed badge (BUG-016). Design decision: PUT IT BACK.** In `ScorebookCell.tsx`, remove `suppressPathForHR` (lines ~111–112, from b967059). The compact `codeIn` badge draws the full bold diamond for a HR, with the `HR` code centred on its surface halo and the green run-scored fill, the same as every other hit draws its path. If the code is hard to read on the bold path at feed size, report it with a screenshot rather than hiding the path again.
- Accept: 824164 Walker (BOT 5) and Diaz (BOT 7) HRs show the full diamond in BOTH the feed badge and the batter-card cell.

**D2 · Remove the fabricated game log (BUG-007).** In `PlayerPage.tsx → HistoryTab`, delete `HIST_GAMES` and every path that returns it. While `drilldown` loads, show the tab's loading state; if the request fails, show an error state ("Couldn't load the game log" + Try again); if it returns no games, show an empty state. Never mock rows. **IL markers are OUT OF SCOPE** — parked (needs MLB transactions data).
- Accept: Aaron Judge's History tab never shows "@ Mariners" or "IL stint started", including on a throttled or failed request.

---

## Report back
Per part: done / partial / blocked, the commit, and the acceptance results with game IDs. List any MLB event strings still unmapped, and any runner the Part C comparison still gets wrong.
