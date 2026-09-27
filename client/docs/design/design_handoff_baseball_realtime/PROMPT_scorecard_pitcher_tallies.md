# Scorecard: pitching tallies credited to every pitcher

**Rev 1 · Sep 27, 2026.** Bug fix. Ungated: no new endpoint.

## Symptom
In the scorecard's **Pitching** rows (R / H / K / BB per inning), every pitcher shows the **whole inning's
totals**. Example: the A's used 4 pitchers, and in the 2nd inning the starter struck out 3, so all four
rows show 3 K in the 2nd.

## Cause
The bug came from the design source (`ScorecardGrid` in `game-v2.jsx`), which the port copied. Each
pitcher's per-inning tally was built from **all** of the opponent's plate appearances in that inning,
with no check of who was pitching:

```js
acc[inn] = oppPAs.filter(pa => parseInn(pa.inning) === inn).reduce(...)   // same for every pitcher
```

## Fix
Credit each plate appearance to **the pitcher who faced it**, then tally per pitcher:

```js
acc[inn] = oppPAs.filter(pa => parseInn(pa.inning) === inn && ownerOf(pa) === pitcherIndex).reduce(...)
```

- **Owner = the pitcher on the play.** The play-by-play feed carries the pitcher on each at-bat, so use
  his id. Don't infer it.
- **Mid-inning changes split correctly**, because ownership is per plate appearance, not per inning. A
  starter pulled with 2 outs in the 6th keeps the 6th's earlier batters; the reliever gets the rest.
- **Inherited runners:** a run is charged to the pitcher who put that runner on base, not the pitcher on
  the mound when he scores. If the feed carries the responsible pitcher on each run, use it for the **R**
  column. If not, crediting the run to the pitcher on the mound for that at-bat is acceptable for now;
  note it as a known limitation.
- A pitcher's row is **blank** in innings he didn't pitch (no tally marks), which the renderer already
  does for zero.
- The design mock has no per-play pitcher, so it falls back to "latest pitcher whose entry inning is at
  or before this inning". **That fallback is for the mock only. Don't port it**: it can't split a
  mid-inning change.

## Acceptance
1. A's example: the 2nd inning's 3 K appear **only** on the starter's row.
2. Summing any pitcher's row across all innings matches his boxscore line (H / K / BB; R with the
   caveat above).
3. Summing all pitchers' rows for one inning matches that inning's team totals (the old per-row values).
4. Mid-inning change: the outgoing and incoming pitchers each show only the batters they faced in that inning.
5. Same result in live, final and replay (replay only counts plays up to the marker).
