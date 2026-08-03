# BUG-019 — root cause confirmed in code, exact fix

File: `client/src/pages/GamePage.tsx`, `scoringByAtBat` useMemo.

## Root cause
```ts
const targetIdx = u.playResult != null ? curIdx : (lastResultIdx ?? curIdx);
```
When a score-delta update (`runs > 0`) arrives, this attributes the run to `curIdx` (the
row's OWN at-bat) whenever that row happens to carry ANY `playResult` — even when that
playResult belongs to the NEXT batter, not the one who actually drove in the run.

MLB's feed frequently batches the score change onto the first pitch(es) of the following
at-bat. If that next at-bat resolves quickly (e.g. a first-pitch out), its `playResult` is
non-null on the very update that also carries the delayed score bump — so the run gets pinned
to that next batter instead of the batter who actually scored it. This is exactly the observed
bug: Christian Walker's HR run lands on Isaac Paredes' row; Paredes' run lands on Austin Wynns'
row (an out, opposing team, zero team runs that half — confirming it's array/row-adjacency,
not a team mixup).

## Fix
Don't key off "this row has *a* playResult." Attribute the run to `lastResultIdx` (the last
at-bat whose OWN play actually produced the run) by default, and only re-target to `curIdx`
when this row's playResult is unambiguously the one that produced these specific runs (e.g.
same update where the description explicitly signals a score, per `isScoringEvent` in
`pitchFeedModel.ts`) — not merely "the current row happens to have some result at all."

Concretely: remove the `u.playResult != null ? curIdx : ...` branch and default to
`lastResultIdx ?? curIdx`, updating `lastResultIdx` only when a row's own play is confirmed
to be the scoring play (reuse the existing `isScoringEvent`-style description check —
"scores"/"homers"/"home run" — rather than "playResult is present").
