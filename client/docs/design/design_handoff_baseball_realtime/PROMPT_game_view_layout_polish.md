# Game view — layout polish pass (post-canvas port)

> **Context.** These are the changes made to the live app after the `PROMPT_pitchbypitch_canvas.md`
> port landed. No new API surface. All changes are in the game view right column
> (`PitchByPitchV2`), the left column (`MatchupLeft`), and the dark score band (`LineScoreBand`).

---

## CHANGE 1 — Right column height is capped to the left column height

**Problem.** The two-column hero grid used CSS Grid auto-sizing. The left column
(`MatchupLeft` + `MatchupContext`) has a fixed natural height. The right column
(`PitchByPitchV2`) had a `min-height: 500px` floor plus unbounded canvas pitch content; when the
current at-bat accumulated many pitches the right column grew taller than the left, stretching the
grid row and making the layout shift as pitches arrived.

**What changed.**

- `GamePage.tsx`: The right column is now wrapped in a new `game-page__right-anchor` div (the
  actual grid item) that contains `game-page__right-col` (the flex stack).
- `GamePage.css`: The anchor is `position: relative` with no normal-flow content of its own, so it
  contributes 0 intrinsic height to the grid track. The row is therefore sized by the left column
  only. The right col is `position: absolute; inset: 0` — it fills whatever height the grid gives
  the anchor. This gives the flex chain a **definite height** so the canvas pitch region can scroll
  within it.
- `PitchByPitchV2.css`: Removed `min-height: 500px` from `.pbpv2` (changed to `min-height: 0`).

**Accepted behaviour.** The right column's visible height always equals the left column's height.
The canvas pitch region scrolls internally; it does not push the layout.

---

## CHANGE 2 — Scout mode three zones always rendered with static heights

**Problem.** The Upcoming zone and Earlier zone were conditionally rendered (`{count > 0 && ...}`).
When empty (game start, or no earlier ABs yet) the zones collapsed to zero height, and the left
column — which is fixed — no longer matched the right column's layout. Zones popping in/out also
produced a height jump.

**What changed.**

- `PitchByPitchV2.tsx`: Both zones are now unconditionally rendered. The count label is still
  shown conditionally (`{count > 0 && <span> · N</span>}`) so the header text doesn't change
  layout, only the count badge appears or disappears.
- `PitchByPitchV2.css`:
  - `.pbpv2__upcoming`: `max-height: 85px` → `height: 85px; overflow-y: auto; scrollbar-width: none`
    (always 85px, scrollable, scrollbar hidden).
  - `.pbpv2__earlier--scout`: `max-height: 137px` → `height: 137px; overflow-y: auto; scrollbar-width: none`
    (always 137px, scrollable, scrollbar hidden).

**Accepted behaviour.** All three zones (Upcoming 85px · Canvas flex:1 · Earlier 137px) are
present from the first render. Empty zones show only their header label. Scrollbars never appear.

---

## CHANGE 3 — Scout mode batter transitions via native scroll

**Problem.** An earlier attempt added CSS keyframe animations (exit + enter) to the three scout
zones when the play head advanced to a new batter. The animations caused layout issues and were
removed at the user's request.

**What changed.**

- `PitchByPitchV2.tsx`: All animation state, refs, and effects removed (`exitSnap`, `transStyle`,
  `usePrevious`, `animTimerRef`, `BATTER_TRANSITION_MS`). Zones render their content directly with
  no overlay wrappers.
- Upcoming zone — list is rendered in **natural order** (lowest `atBatIndex` first = next-up batter
  at the top). No scroll effect needed; the top of the list is always the relevant entry.
- Earlier zone — `scoutEarlierRef` is wired to the zone div. When `headAtBatIndex` changes (new
  batter completed), a `useLayoutEffect` pre-positions `scrollTop = ROW_H` (44px = one row) then
  calls `scrollTo({ top: 0, behavior: "smooth" })` — the newly completed AB smoothly scrolls into
  view from below the header. On first mount the zone snaps to `scrollTop = 0` instantly (no
  animation).
- `PitchByPitchV2.css`: All keyframe rules and animation classes removed (`pbpv2-zone-exit`,
  `pbpv2-zone-enter`, `.pbpv2__zone-out`, `.pbpv2__zone-in`, `.pbpv2__zone-body`,
  `.pbpv2__zone-content`, `.pbpv2__canvas-batter--enter`, `.pbpv2__canvas-pitches--enter`,
  `.pbpv2__pa--slide-in`).

**Accepted behaviour.** No CSS animation. When the play head advances: the Upcoming list updates
in place (next batter is still at top); the Earlier zone smoothly scrolls its new top entry into
view; the Canvas swaps content immediately via React key change.

---

## CHANGE 4 — Pitch type legend shows full names at reduced font size

**Problem.** Full pitch-type names ("4-Seam Fastball", "Sweeping Curve") wrap to a second line
when several types appear together, growing the zone-col height and causing a layout jump in the
left column.

**What changed.**

- `MatchupLeft.tsx`: Legend items render `{name}` (full pitch type name, e.g. "4-Seam Fastball").
  The `PITCH_ABBREV` map and `pitchAbbrev()` helper have been removed.
- `MatchupLeft.css`:
  - `.matchup-left__legend-item`: `font-size` reduced from `11.5px` to `10px`.
  - `.matchup-left__legend`: `flex-wrap: wrap; gap: 6px 10px; min-height: 36px; align-content: flex-start`
    — wrapping is allowed but the legend always reserves 36px (two rows at 10px) so wrapping never
    shifts the layout below it.

**Accepted behaviour.** Full pitch type names are always shown. The legend wraps to a second line
when needed; the reserved `min-height` absorbs the wrap without shifting other panels.

---

## CHANGE 5 — At-bats scorebook row: no visible scrollbar; ‹ › chevron navigation

**Problem.** When the batter's at-bat count exceeded the visible width of the scorebook row,
`overflow-x: auto` showed a native scrollbar. The scrollbar added ~15px of height to the row,
shifting the entire left-column layout while the AB was in progress and then collapsing back when
the AB ended — a visible jerk.

**What changed.**

- `MatchupLeft.css`:
  - `.matchup-left__atbats-scroll`: `scrollbar-width: none`; `::-webkit-scrollbar { display: none }`
    — scrollbar hidden cross-browser but the element still scrolls programmatically.
  - New `.matchup-left__atbats-wrap`: `position: relative; min-width: 0` — positions the chevron
    buttons relative to the scroll row.
  - New `.matchup-left__atbats-chevron` (base), `--left`, `--right` variants:
    - `position: absolute; top: 0; bottom: 0; width: 32px; font-size: 24px`
    - Left chevron: `left: -4px`, gradient `to right, var(--color-surface) 55%, transparent`
    - Right chevron: `right: -4px`, gradient `to left, var(--color-surface) 55%, transparent`
    - Hover: `color: var(--color-text)`

- `MatchupLeft.tsx`:
  - `atbatsScrollRef` (`useRef`) wired to the scroll container.
  - `canScrollLeft` / `canScrollRight` state, updated by `syncChevrons` callback on every scroll
    event (and re-synced after any programmatic scroll).
  - All three hooks (`useEffect` for scroll listener, `useEffect` for live auto-scroll to end,
    `useEffect` for scout-mode cell centering) are called **before** the `if (latest == null)`
    early return to satisfy Rules of Hooks.
  - Left chevron: `scrollTo({ left: 0, behavior: "smooth" })` — snaps to the far left in one
    click so the first cell is fully revealed and the chevron disappears.
  - Right chevron: `scrollTo({ left: el.scrollWidth, behavior: "smooth" })` — snaps to the far
    right so the last cell is fully revealed.
  - Live mode auto-scrolls to the rightmost cell when a new cell is added.
  - Scout mode centers the active cell when the play head moves (`CELL_W = 50`).

**Accepted behaviour.** No scrollbar ever appears. When content overflows left/right, the
corresponding chevron fades in over a gradient. Clicking a chevron scrolls to the absolute edge
(not by a fixed pixel amount) so the boundary cell is fully visible and the chevron immediately
disappears. The layout height of the scorebook row never changes.

---

## CHANGE 6 — Scoring summary zone hidden in the dark score band

**Problem / decision.** The scoring summary (Zone 2 of `LineScoreBand`) was taking up space in the
dark header band but the user wanted to declutter it.

**What changed.**

- `LineScoreBand.tsx`: The Zone 2 JSX block (scoring summary div, eyebrow, play-by-play rows,
  "+N more" button) has been removed from the render tree and replaced with a comment
  `{/* Zone 2 — scoring summary (hidden) */}`. Zone 1 (line score) and Zone 3 (game leaders)
  are unchanged.

**Accepted behaviour.** The dark score band shows only the line score and game leaders. The scoring
summary is not rendered (no hidden DOM, no reserved space). It can be restored by un-commenting.

---

## CHANGE 7 — Game leaders zone always renders two slots

**Problem.** `LineScoreBand` rendered a dynamic list of leaders filtered to non-null entries. The
zone grew by ~34px when the second leader appeared (first hit by the other team), causing a 4px
shift in the overall band height (zone 3 becoming taller than zone 1 for the first time).

**What changed.**

- `LineScoreBand.tsx`: `leaderSlots` is now `[awayLeader, homeLeader]` — always exactly 2 entries,
  no `.filter(Boolean)`. When a slot is `null`, an invisible placeholder div is rendered
  (`visibility: hidden`) with identical DOM structure to a real leader row, preserving the height.
  The "No hits yet" empty state still appears when both slots are null.

**Accepted behaviour.** The leaders zone is always sized for two rows from the first render. The
band never shifts height when the second leader appears.

---

## CHANGE 8 — Play-head ▸ circle removed from canvas batter header

**Problem / decision.** The scout-mode canvas batter header showed a dark filled circle containing
a `▸` glyph (reusing the `pbpv2__outcome` badge class with `background: var(--color-text)`). This
was visually unclear and the user requested its removal.

**What changed.**

- `PitchByPitchV2.tsx`: The `<div className="pbpv2__outcome" style={{ background: "var(--color-text)" }}>▸</div>`
  in the canvas batter header is replaced with `<span />` to preserve the 4-column grid layout
  (`74px 40px 1fr auto`) without the visual element.

**Accepted behaviour.** The canvas batter header shows inning/team, batter name, and "· At bat"
with no circle or icon in the outcome column.

---

## Files changed

| File | What changed |
|---|---|
| `client/src/pages/GamePage.tsx` | Wrapped right col in `right-anchor` + `right-col` divs |
| `client/src/pages/GamePage.css` | Added `.game-page__right-anchor`; made `.game-page__right-col` absolutely positioned |
| `client/src/pages/game/PitchByPitchV2.tsx` | Always-render zones; natural-order Upcoming; Earlier scroll-reveal; animation removed; ▸ circle removed |
| `client/src/pages/game/PitchByPitchV2.css` | `min-height: 500px → 0`; `height` + `overflow-y: auto` on Upcoming and Earlier; all animation keyframes/classes removed |
| `client/src/pages/game/MatchupLeft.tsx` | Full pitch names (abbrev helper removed); chevron refs/state/effects; scroll-to-edge handlers |
| `client/src/pages/game/MatchupLeft.css` | Hidden scrollbar; new chevron CSS; legend full-name styles (10px, wrap, min-height 36px) |
| `client/src/pages/game/LineScoreBand.tsx` | Zone 2 (scoring summary) removed; leaders always 2 slots with invisible placeholder |
| `client/src/pages/game/LineScoreBand.css` | No net additions (min-height reserve approach superseded by 2-slot pattern) |
