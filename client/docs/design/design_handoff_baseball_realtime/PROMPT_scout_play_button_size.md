# Fix — Scout header Play/Pause control is oversized (text pill instead of icon circle)

You are in the `baseball-realtime` client. **Do only this. Touch nothing else.**

## The bug

After relocating `ScoutControls` into the pitch-feed header (`PROMPT_scout_controls_relocate.md`), the **Play/Pause control still renders as the old text pill** (rounded rect, "Play" label, ⏮/⏭ in bordered squares) — it's taller than the row around it, so it forces extra header height and visibly pushes/pads the space below the batter name.

## Expected (matches `holistic/game-scout.jsx`)

Play/Pause is a **28×28px solid circle, icon-only, no text label**:
- `▶` when paused / `⏸` when playing.
- `background: ink` when paused, `background: accent` (rust) when playing, `color: #fff`, `border: none`, `border-radius: 50%`.
- Step buttons (⏮/⏭) are small **26×26px** icon buttons beside it — not bordered squares with independent padding.
- The whole control cluster (context label left, selects + play + steps + counter right) fits in one compact row — no extra vertical space.

## Do

Replace the ported `ScoutControls` pill markup/CSS with the compact icon-circle button (28×28, no label) + 26×26 step buttons, per the reference file. Keep click/keyboard behavior (Play↔Pause toggle, ⏮/⏭ step) unchanged — this is a visual-size fix only.

## Acceptance
- Play/Pause is a 28px circle with no visible text, not a pill.
- Header row height no longer grows/pads below the batter name.
- ⏮/⏭ are 26px icon buttons, same row.
