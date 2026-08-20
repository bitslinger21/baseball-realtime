# Scoring Widget v2 — Button Layout & Back Side

**Design Update:** Jul 2026

## Changes

### Front & Back Button Stack
- **Size:** 24×24px (reduced from 32px)
- **Gap:** 3px between buttons
- **Border radius:** 4px
- **Stack order:** Minimize (bar icon) on top, Flip (⟲) below
- **Both sides:** Identical button treatment (back now has minimize + flip stacked)

### Back Side Interactive
- Removed `pointerEvents: 'none'` so buttons are clickable
- Minimize button available to collapse widget from back view
- Flip button to return to front

## Technical Notes
- Bar icon width 10px, height 1px (scaled from 12×1.5 at 32px size)
- Flip icon font-size 13px
- Minimize bar icon font-size 12px
- All hover/active states preserved

## Files Changed
- `holistic/scoring-widget.jsx` — Button component style updates (2 locations: front header + back header)

## Integration
No API or data changes. Visual refinement only.
