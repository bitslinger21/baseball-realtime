# Scorebook cell: 1B/BB label repositioned further into foul territory — Aug 2, 2026

File: `scorebook-cell.js` (`window.buildScorebookGrid`).

## What changed
Follow-up to the previous fix. The 1B/BB (and HBP, same base=1 path) label was still sitting
in the narrow wedge where the foul line meets the diamond corner — technically outside the
infield but still reading as cramped/overlapping. Moved further out into clearly open foul
territory (away from both the diamond edge and the base-path line), mirrored symmetrically on
the 3B side. Verified in isolation across 1B/BB/3B test cells.

## Port note
Coordinate-only change in the shared cell renderer. No data/behavior change beyond the earlier
BB/HBP-parity and HR-simplification fixes already handed off.
