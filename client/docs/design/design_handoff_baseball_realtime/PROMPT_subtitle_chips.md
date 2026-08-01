# Game view: subtitle-line chips (countdown / elapsed) — Aug 1, 2026

File: `holistic/game-v2.jsx` (both `GameScreenV2Pregame` and `GameScreenV2`).

## What changed
1. **Pregame:** the generic "SCHEDULED" status pill (was in `subtitleRight`) is replaced by a
   live countdown chip trailing the venue/date subtitle line: "Wrigley Field · Sun May 24 ·
   8:05p ET · **First pitch in 2h 14m**". More useful than a static status label — tells the
   user exactly how long until first pitch, and made the separate SCHEDULED pill redundant.
2. **Live:** the elapsed-time chip moved out of `subtitleRight` (where it sat next to the LIVE
   pill) into the subtitle line itself, trailing at the end: "Wrigley Field · Sun May 24 ·
   ▼ 9th · **2:47 elapsed**". `subtitleRight` now holds only the `LivePill` — one state
   signal on the right, all descriptive facts (venue/date/inning/elapsed) grouped on the left.

## Port note
- Pregame countdown needs a live-updating value (recompute from game start time; format as
  "Xh Ym" > 1h, "Xm" under 1h, and swap to "First pitch any moment" / hide once very close).
- Elapsed-time chip needs the same live-updating source it already used in `subtitleRight`
  today — this is a placement change only, not a new data need.
- Both chips use `Pill tone="soft"` with `font-family: mono` (numerals — standard token rule).
