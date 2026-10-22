# Scorecard header: shared play controls + bounded timeline (Oct 21, 2026) · rev 1

> Version stamp: **rev 1, Oct 21, 2026.** If your copy has no stamp, it's stale.

**Ungated. No new API.** This changes the header of scorecard mode in the pitch-by-pitch card (live and Scout), plus the
team logos on the timeline in both modes. The scorecard sheet, its transition (as built in `HANDOFF_scorecard_transition.md`)
and the full card / print are **unchanged**.

Design reference (read, don't copy): `holistic/scorecard-frozen.jsx` → the `controls` branch of `FrozenScorecard`'s header;
`holistic/game-scout.jsx` → `ScoutTransport`, `GameTimeline`; `holistic/game-v2.jsx` → `FeedTimeline`.
Preview: `Game Scout Mode.html` → **Scorecard**. The preview's column is narrower than the app's, so its controls wrap;
that's expected (see §4).

## 1. One shared transport component

The play controls in the scorecard header are the **same component** as in the pitch-by-pitch header. Don't copy them:
extract them once and render the component in both places. Order:

`[half-inning ▾] [speed ▾] │ [◀◀] bat [▶▶] │ [|◀] ball [▶|] │ [▶ Play]`

- Styles are identical in both headers: pill chips for half-inning and speed; 30px outlined step buttons; the outlined Play button
  (rust when playing).
- Includes the hover tips, SVG step icons and bat icon from `handoff_step_tips/`. If that hasn't been ported yet, do it
  first or together with this.
- Live view: Scout-only parts stay hidden as they are today (the live view has no play head).

## 2. Header layout: a 2×2 grid, no borders

```
┌─ col 1: auto ───────────────────────┬─ col 2: 1fr ───────────────────────────────────────┐
│ ◆ SCOREBOOK  ‹ Innings 1–8 of 9 ›   │     [transport] │ [CLE|TB] [⛶ Full card] [← Back]  │
│                                     │ [logo]  ════════════ timeline ═══════════════════  │
└─────────────────────────────────────┴────────────────────────────────────────────────────┘
```

- `grid-template-columns: auto minmax(0, 1fr)`, column gap 16, row gap 4. **No visible borders**; the box above only shows
  the grid.
- **Col 1** is only as wide as the lockup: `◆ SCOREBOOK` plus the `‹ Innings a–b of 9 ›` window with its chevrons.
  Left-justified, top-aligned, `white-space: nowrap`. Row 2 of col 1 is empty.
- **Col 2, row 1:** ONE control group, **right-justified**: the shared transport, a 1px × 22px divider (`T.border`), then
  the scorecard-only group (team toggle · Full card · ← Back, 8px gaps). Full card and Back use the transport's outlined button
  style (`scBtn`: 32px tall, 1.5px `borderStrong`, radius 8, 12.5px/700).
- **Col 2, row 2:** the timeline, **filling col 2 exactly**. Its width is bounded to the controls' horizontal space and
  starts where col 2 starts, not under the SCOREBOOK lockup. This matches the shipped app's width.
- The timeline here is the compact variant: **no inning numbers** (the sheet labels innings). Logos are shown (§3).

## 3. Team logos on the timeline (both modes)

The timeline gets a **22px logo column** on its left (10px gap) in **every** mode: pitch-by-pitch, scorecard, live and
Scout.
- Away logo (16px `TeamDot`) centred on the **away run row** (above the bar); home logo centred on the **home run row**
  (below the bar).
- The logo column belongs to the timeline, so in the scorecard header it sits **inside** col 2, at the start of the
  timeline row.
- Everything else from `handoff_timeline/` (rev 2) stands: 8px bar, one 6px dot per run, inning numbers last (feed mode only).

## 4. Wrapping

The control group is one flex row with `flex-wrap: wrap` and `justify-content: flex-end`. At normal app widths it fits on
one line. If the column is too narrow, the scorecard-only group wraps under the transport. That's acceptable; don't shrink
or hide controls to prevent it.

## Acceptance
- Scorecard mode, top row: SCOREBOOK + inning window on the left; one right-justified group on the right: transport │ team ·
  Full card · Back.
- The transport in the scorecard header is pixel-identical to the pitch-by-pitch header's, and both are the same component.
- The timeline's left edge lines up with col 2 (not with the card's left padding), and its right edge with the Back button's
  right edge.
- Team logos sit beside the timeline's run rows in both modes.
- Scorecard sheet, transition, full card and print are unchanged.
