# Game view — pitch-by-pitch "canvas for the current AB" (dev handoff, Jul 4, 2026)

Restructures the live game-view `PitchByPitchV2` feed. **Ungated** — no new API/data; same
play-by-play feed, re-laid-out. Source of truth: `holistic/game-v2.jsx` (+ handoff copy under
`design_handoff_baseball_realtime/holistic/`).

## The problem
The old feed was one scroll: the live at-bat on top, all finished at-bats below. As new pitches
arrived, the live AB's pitch table grew and **pushed the finished at-bats down** — they shifted and
crowded the feed. The user wants the live AB to own the space as a stable "canvas."

## The layout — three fixed zones inside the 640px panel (flex column)
1. **Header** (unchanged) — "Pitch by pitch · N at-bats" + the All/Runs/K/HR/BB filter.
2. **Current-AB canvas** (`flex: 1, minHeight: 0`, rust left-border, faint rust bg):
   - **Pinned batter header** (`flexShrink: 0`) — inning + team dot · ● live badge · order + name ·
     summary · LIVE pill. Does NOT scroll.
   - **Pitch table region** (`flex: 1, overflowY: auto, minHeight: 0`) — the live AB's per-pitch
     table (chronological). **New pitches grow/scroll HERE only.** If an AB's pitch count exceeds the
     region, this region scrolls — nothing else moves.
3. **"Earlier at-bats"** (`flexShrink: 0, maxHeight: 250, overflowY: auto`, top border):
   - Sticky sub-header ("EARLIER AT-BATS" + count).
   - The finished at-bats, collapsed (newest first), each an expandable row (mini strike zone +
     `ABInspector`, unchanged). **Anchored at the bottom** with its own scroll, so live pitches never
     shift or crowd them.

## Implementation notes (React)
- Split the PA list: `livePA = PAs.find(p => p.live)`, `pastPAs = PAs.filter(p => !p.live)`.
- The live pitch table was extracted into a `LivePitchTable` component (renders `livePA.pitches`);
  it lives in the canvas region, not in the per-row map.
- The finished-AB rows reuse the **existing** collapsed-row markup + expansion logic verbatim — just
  map over `pastPAs` inside the bottom zone instead of the whole list. (Row length ref → `pastPAs.length`.)
- The old single `overflowY:auto` list container and the 1px bottom fade are gone.

## Scope / caveats
- Applies to the **live** game view (`game-v2.jsx` `PitchByPitchV2`) **and** the **finals replay/Scout**
  feed (`game-scout.jsx` `ScoutFeed`) — same three-zone canvas in both. In Scout the "current" AB is
  the **play head** (not necessarily the newest); it's pinned at top, its pitch table drips/scrolls in
  its own region, and every OTHER at-bat (played + upcoming, upcoming greyed) sits in the anchored
  bottom **"Other at-bats"** list. When the head moves to a new AB, the pitch-canvas scroll resets to
  the first pitch (the shell's old "center current row" auto-scroll was repurposed to this).
- The **pregame/final static** band still uses the older single-scroll feed — not changed here.
- With few pitches the canvas shows intentional empty space above the bottom list — that's the
  "canvas" breathing room; it fills as pitches arrive. Do not collapse it.
- Ordering within each zone is newest-first (matches the rest of the feed). In Scout the bottom list is
  reverse-chronological, so upcoming (greyed) at-bats sit above already-played ones — acceptable for v1.

## Acceptance
- Live batter header stays pinned at the top of the feed; it never scrolls away.
- Adding pitches to the live AB scrolls/grows only the pitch region; the "Earlier at-bats" block does
  not move.
- Finished at-bats sit in the bottom "Earlier at-bats" zone, collapsed, expandable, with their own
  scroll; the count reflects `pastPAs.length`.
- No console errors; past-AB expansion (mini zone + inspector) still works.
