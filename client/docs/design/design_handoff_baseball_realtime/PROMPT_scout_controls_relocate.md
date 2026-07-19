# Scout controls — relocate into the pitch-by-pitch header (dev handoff, Jul 18, 2026)

Layout change only. No new API, no state changes — `ScoutControls` already has everything it needs
(`playing`, `onToggle`, `onStep`, `headMoment`, `totalMoments`, `contextLabel`, all passed down from
`GamePage.tsx`). This just moves where it renders.

## What changes

Today, for a final game, `GamePage.tsx` renders `<PitchByPitchV2 .../>` and then `<ScoutControls .../>`
as a **separate sibling** underneath it inside `.game-page__right-col`. Move it **into
`PitchByPitchV2`'s own header** (`.pbpv2__header`), replacing the static "Pitch by pitch · N at-bats"
title in scout mode.

**Why:** the transport is the primary interaction on this screen — it drives the one play head
everything else reflects. Anchoring it to the header of the content it controls (instead of floating
below the feed as a separate card) keeps it visually attached and reclaims vertical space.

## Header layout (scout mode only)

```
[ 9th · Kyle Tucker ]                         [ ▶ Play ] [ ⏮ ] [ ⏭ ]   42 / 58
```

- **Left:** `contextLabel` (e.g. "▲ 3 · Kyle Tucker") — replaces the "Pitch by pitch · N at-bats"
  text entirely in scout mode.
- **Right:** the Play/Pause pill + step buttons (unchanged markup/behavior from `ScoutControls`),
  followed by the `headMoment / totalMoments` progress readout.
- The `Segmented` filter (All/Runs/K/HR/BB) already doesn't render in scout mode (`{!scoutMode && ...}`)
  — no conflict there.
- **Drop `ScoutControls`'s explanatory hint paragraph** ("Playing: pitches advance on their own…" /
  "Review: paused at the play head…") — it doesn't move with the control into the header; the header
  is a compact bar, not a card, and the hint was mainly onboarding copy that isn't needed once the
  control lives in its natural spot.

## Implementation

1. In `PitchByPitchV2.tsx`, add the `ScoutControls` props to `PitchByPitchV2Props` (or a single
   `scoutControls` object prop) so `GamePage.tsx` passes them straight through instead of rendering a
   separate `<ScoutControls>` element.
2. In `.pbpv2__header`, branch on `scoutMode`:
   - `scoutMode` → render `contextLabel` on the left, and the play/step button group + progress
     readout (reuse `scout-controls__play-btn` / `scout-controls__step-btn` / the progress `num` span
     classes — same visual language, just relocated markup) on the right.
   - otherwise → unchanged (title + count + `Segmented` filter).
3. In `GamePage.tsx`, remove the standalone `<ScoutControls .../>` render after `<PitchByPitchV2>` and
   pass its props into `<PitchByPitchV2>` instead.
4. Delete (or leave unused, dev's call) the now-orphaned `.scout-controls` / `.scout-controls__hint`
   CSS rules in `ScoutControls.css` — the bar's own classes (`__play-btn`, `__step-btn`, `__info*`) are
   still needed, just wherever they end up living (either keep `ScoutControls.tsx` as a smaller
   presentational piece rendered inside the header, or inline it into `PitchByPitchV2` — dev's call on
   which is cleaner given the codebase's patterns).

## Acceptance

- Final games: the pitch-by-pitch header shows the play-head context + transport, not static
  "Pitch by pitch" text.
- Live games: header unchanged (title, count, filter).
- No leftover `ScoutControls` card below the feed.
- No hint paragraph anywhere in the relocated control.
- Play/Pause, step, and seek-by-click behavior all unchanged — this is a pure relocation.
