# Game view — Last-pitch zone: fixed 3-column grid, per-column alignment (dev handoff, Jul 18, 2026)

Follow-up to `PROMPT_lastpitch_dark_band.md` (which moved the last-pitch panel into the dark
line-score band). Final layout for that zone's three pieces of content — no new API, no data change.
Source of truth: `holistic/game-v2.jsx` (live). Scout mode's mirror in `holistic/game-scout.jsx` got
the identical treatment for visual consistency, but isn't part of this handoff's file set.

## What changed

The zone holds three pieces of content — **pitch type**, **speed**, **result** — that previously
shifted position as pitch data changed length. Fixed with a **CSS grid of fixed-width columns**, each
with its own alignment:

```
gridTemplateColumns: '150px 70px 190px'
```

- **Pitch type column (150px)** — anchored **left**, wraps onto a second line on overflow (no
  `nowrap`/ellipsis) so a long name like "Four-Seam Fastball" wraps cleanly instead of truncating or
  pushing other columns around.
- **Speed column (70px)** — anchored **right**; mph number + "MPH" caption, bordered both sides as a
  visual divider.
- **Result column (190px)** — anchored **left**; the cream outcome pill, left-aligned within its
  column (not centered or full-width). Widened from an initial 110px, which clipped longer result
  text (e.g. "Called strike, strikeout", "Swinging strike, strikeout") — 190px comfortably fits the
  longest realistic outcome strings. No `nowrap`/ellipsis on the pill text either; it wraps rather
  than clips if something even longer ever comes through.

Because every column is a fixed pixel width, nothing recalculates when the underlying pitch data
changes — only the text inside each column changes. The whole 3-column group is right-anchored inside
its zone via `display: flex; justify-content: flex-end` on the zone's outer container, so extra space
collects to the left (toward Game Leaders) rather than the columns drifting.

**Zone/band width:** widened to fit the larger result column — live view's Last-pitch zone is 464px
(unchanged, already had headroom); Scout mode's zone grew 400px → 460px to accommodate the same
190px result column plus padding/gaps.

## Acceptance

- Column widths never change regardless of pitch-type name length, mph value, or result text length.
- Pitch type left-aligned and wraps on overflow; speed right-aligned; result left-aligned and no
  longer clipped — verify against "Called strike, strikeout" / "Swinging strike, strikeout" (the
  longest strings in the mock data).
- The whole group stays anchored to the right edge of the zone at all times.
