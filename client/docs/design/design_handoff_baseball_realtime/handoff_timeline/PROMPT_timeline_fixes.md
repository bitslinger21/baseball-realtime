# Game timeline fixes (Oct 21, 2026) · rev 1

> Version stamp: **rev 1, Oct 21, 2026.** If your copy has no stamp, it's stale.

**Ungated. No new API.** Layout fixes to the game timeline: the half-inning rail with run pips above and below it, a gold
position marker, and inning numbers. It's one component, used in live, final/Scout and scorecard mode.

Design reference (read, don't copy): `holistic/game-scout.jsx` → `GameTimeline` and `holistic/game-v2.jsx` → `FeedTimeline`.

## 1. Rail height: 8px

The half-inning segment bar is **8px tall** (was 12). Everything else in the rail stays the same: segments are `flex: pitches`,
1px gaps, radius 2, `surfaceAlt` for top halves and `border` for bottom halves.

- The left label column's spacer between the two team logos must match the rail: **8px** (was 12), so each logo stays level with
  its own run lane.
- The gold marker is unchanged: a 2px line extending 6px above and below the rail, plus the 11px dot above it.

## 2. Row order, top to bottom (fixes the shipped app)

In the shipped app the home team's run pips sit **below** the inning numbers. Correct order:

```
[away logo]  away run lane    11px   pips hug the rail (bottom: 1)
             rail              8px
[home logo]  home run lane    11px   pips hug the rail (top: 1)
             inning numbers  ~13px   marginTop 3, mono 10px, textFaint, centred under each inning's two halves
```

The inning numbers are **always the last row**. The home run lane belongs to the rail, so nothing may sit between them.

**Label-column alignment:** the grid row must use `align-items: start` (not `center`). With the inning row added, the right
column is taller than the logo column; `center` pushes both logos about 7px down so they no longer line up with their lanes.
The logo column is 11 + 8 + 11 and lines up exactly with the top three rows.

Scorecard mode (`compact`: the timeline tucked under the controls) keeps showing **no inning numbers**, because the scorecard
directly below it already labels the innings.

## 3. Run marker sizes (as designed, no change)

- **1 run: a 6px dot. 2 or more runs: a 9px dot.** Only two sizes: a 2-run single and a grand slam look the same.
- Colour = team (navy `T.info` away, rust `T.accent` home); position (above or below the rail) is the main cue, beside the
  lane's team logo.
- Each dot is centred horizontally on the pitch where the runs scored (`translateX(-50%)`) and placed 1px from the rail edge.
- Tooltip: `N run(s) · {inning} · {summary}`.
- The 11px lanes fit the 9px dot with 1px to spare on each side. **Don't grow the dots** without growing the lane.

## Acceptance

- Rail measures 8px.
- Top to bottom: away pips → rail → home pips → inning numbers, in live, final and Scout.
- Each team logo lines up with its own lane (check with a 2+ run inning in each lane).
- Scorecard mode: no inning numbers; nothing else changes there.
