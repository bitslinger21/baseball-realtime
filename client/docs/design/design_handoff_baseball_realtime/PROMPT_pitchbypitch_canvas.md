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
  feed (`game-scout.jsx` `ScoutFeed`). Live is two zones (current + Earlier below). **Scout is THREE
  ordered zones**, a top→bottom conveyor matching game flow:
  - **Upcoming** (top, own scroll, **capped at 1 visible row** `maxHeight 85`): the at-bats not yet reached, ordered like the
    rest of the feed — **last inning at top, next-up at the bottom** (adjacent to the current canvas).
    The region is **auto-scrolled to its bottom** (via a ref + rAF) so the next ~2 upcoming ABs are the
    ones visible; scroll up for later innings. Greyed (future styling). Hidden when empty (game end).
  - **Current-AB canvas** (middle, `flex:1`): the play-head AB pinned, ink left-border, ▸ marker; its
    pitch table drips/scrolls in its own region. Moving the head resets this scroll to the first pitch.
  - **Earlier at-bats** (bottom, own scroll, **capped at 2 visible rows** `maxHeight 137`): completed ABs, **newest on top**
    (most-recent adjacent to the current canvas). Hidden when empty (game start).
  - Flow: a completed AB collapses out of the canvas down into **Earlier**; the next-up AB leaves the
    bottom of **Upcoming** and enters the canvas a pitch at a time. At game start all ABs sit in
    Upcoming except the first, which is the current canvas.
- **Play/Review controls panel — bottom-anchored, no dead space (Scout).** The Scout right column is a
  flex column whose two children are the feed and the `ScoutControls` (Play/Pause + Replay/Scout +
  transport) panel. **The feed card grows to fill (`flex: 1, minHeight: 0`)** and the controls panel
  sits below it, so the panel **bottom-anchors** and the right column's total height **matches the left
  column** (MatchupLeft + MatchupContext). Concretely:
  - The `ScoutFeed` root card changed from a fixed `height: 564` to **`flex: 1, minHeight: 0`** (fills
    available height instead of leaving a gap under the controls).
  - The two-column grid uses **`alignItems: 'stretch'`** (was `'start'`) so both columns are the same
    height; the right column is `display:flex; flex-direction:column` with the feed `flex:1` and the
    controls panel `flex-shrink:0` pinned at the bottom.
  - Net effect: the empty space that used to sit under the Play/Review buttons is gone; the pitch-feed
    card is as tall as the left side. **This is the piece that was missed in the earlier port — it is a
    layout change to the ScoutControls/column wrapper, not just the feed internals.**
- **Scroll-driven play head (the three zones are ONE chronological filmstrip).** The list reads
  top→bottom as Upcoming (later/future) · Current · Earlier (older/past). Wheeling the feed moves the
  expanded (center) at-bat one step **in the direction of the scroll**: **scroll down → the center
  becomes an OLDER at-bat** (down toward Earlier — the current AB collapses up into Upcoming, the top of
  Earlier expands into center); **scroll up → a newer at-bat**. Implemented as a
  non-passive `wheel` listener on the feed root that calls `onStep(down ? -1 : 1)` with a ~300ms
  cooldown + a small deadzone; the center pitch table scrolls internally first and only steps the head
  once it hits its top/bottom edge. Clicking any at-bat (or a batter-card scorebook diamond) still
  seeks the head directly. In **live**, the same model holds: at the live edge Upcoming is empty;
  scrolling back from live populates Upcoming with the already-played ABs that are ahead of the head.
- **Collapsed rows show the outcome as a `ScorebookCell` (codeIn), not a plain circle.** Played ABs
  render `<ScorebookCell inn="" {...ab.sb} codeIn width={40} />` (diamond + base path + result code
  inside); upcoming/future ABs render a **muted empty diamond** (`state="muted"`, no code) so the
  not-yet-reached result isn't spoiled. Same atom the game-v2 feed badge + batter-card row use.
- The **pregame/final static** band still uses the older single-scroll feed — not changed here.
- With few pitches the canvas shows intentional empty space — that's the "canvas" breathing room.

## Acceptance
- Live batter header stays pinned at the top of the feed; it never scrolls away.
- Adding pitches to the live AB scrolls/grows only the pitch region; the "Earlier at-bats" block does
  not move.
- Finished at-bats sit in the bottom "Earlier at-bats" zone, collapsed, expandable, with their own
  scroll; the count reflects `pastPAs.length`.
- No console errors; past-AB expansion (mini zone + inspector) still works.
- **(Scout) The Play/Review controls panel is flush to the BOTTOM of the right column with no gap
  above it, and the pitch-feed card is the same height as the left column.** (Feed card = `flex:1`,
  grid = `alignItems:stretch`.) This was missed in the earlier port — verify it explicitly.
- **(Scout) Collapsed rows show a `ScorebookCell` (codeIn) result** — played = diamond + path + code;
  upcoming = muted empty diamond. Not a plain circle.
- **(Scout) Wheeling the feed moves the head** one AB per notch (down → older); the center pitch table
  scrolls first, then steps at its edge.
