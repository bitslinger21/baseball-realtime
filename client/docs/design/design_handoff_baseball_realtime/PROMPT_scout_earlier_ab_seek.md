# Scout mode — clicking an "Earlier at-bat" must MOVE THE MARKER, not expand in place

**Date:** Sep 8, 2026 · **Ungated** — no new API, no new data, no design change
**Status:** the design source is already correct; this is a **port defect** in the app.
**Design source:** `holistic/game-scout.jsx` — `ScoutFeed` / `CollapsedRow`.
Preview: `review-game-scout.html` (scroll the feed to "Earlier at-bats" and click a row).
**App scope:** `PitchByPitchV2`'s `scoutMode` branch (the earlier-at-bats zone). Nothing else.

## Problem

In Scout mode, clicking a row in the **Earlier at-bats** zone expands that at-bat **in place** —
an accordion inside the bottom zone, the way the *live* view's past-AB inspector works. The
marker does not move. The pinned canvas, the batter card, the strike zone, the scorebook row,
the timeline and the line-score bar all keep describing a different at-bat than the one the
user just opened.

That is the live view's interaction leaking into Scout. Scout has no accordion model: it has
**one marker that the whole screen reflects**. An expand-in-place row creates a *second*,
competing notion of "the at-bat I'm looking at" — and the two disagree on screen at the same
time.

## Expected behaviour

Clicking an earlier at-bat **seeks the marker to that at-bat**, and the whole screen follows:

1. The clicked AB leaves the Earlier zone and becomes the **pinned current-AB canvas** in the
   middle, with its full pitch table.
2. Every AB now after the marker (including the one that *was* current) moves into
   **Upcoming**; every AB before it stays in **Earlier**.
3. The batter card, strike zone, "Today · through marker" line, at-bats scorebook row (the
   clicked AB's cell becomes the rust-dashed selection), On-the-mound strip, `MatchupContext`,
   Due-up, the timeline marker, and the sticky line-score bar all re-read at the new marker.
4. Playing state is unaffected by the *click itself* — the marker just relocates (Scout's normal
   seek behaviour applies).

This is the design's stated rule, already written at the top of `game-scout.jsx`:

> "Click a feed PA", "click a scorebook cell", and "expand an AB" are the SAME action:
> seek the one head to that AB's end.

## The fix

`CollapsedRow`'s click handler is a **seek**, not a toggle:

```jsx
<div onClick={() => onSeek(ab.last)} style={{ …, cursor: 'pointer' }}>
```

`ab.last` = the index of that at-bat's final pitch, so the AB opens **fully played** (all its
pitches visible) rather than mid-count — which is what "show me that at-bat" means when
reviewing. `abStatus` then classifies it `current` (`H >= ab.first && H <= ab.last`), which is
what promotes it into the canvas zone; no separate expanded/selected state exists or is needed.

In the app: delete the scout branch's expanded-row state and its inline `ABInspector` render,
and route the row's `onClick` to the same seek callback the feed's other click targets and the
scorebook cells already use. **There should be no per-row open/closed state in Scout at all.**

## Affordance

The row's trailing glyph stays `▸` (a seek/jump), **not** a `▾` chevron — a disclosure caret
promises expand-in-place, which is precisely the wrong promise. Future (post-marker) rows show
`·` and 0.4 opacity. Unchanged from the design source.

## Acceptance

1. In Scout, scroll the feed to **Earlier at-bats** and click any row → that at-bat becomes the
   pinned canvas with its pitch table; nothing expands inside the Earlier zone.
2. After the click, the **batter card, strike zone and scorebook row** all show the clicked
   at-bat's batter — not the previously-current one.
3. The at-bat that *was* current is now the top entry of **Upcoming**.
4. The **timeline marker** and the sticky **line-score bar** score both move back to that point.
5. Clicking a scorebook diamond and clicking a feed row for the SAME at-bat land on an
   identical screen state.
6. No row in the Earlier zone can be in an "open" state — there is no such state.
