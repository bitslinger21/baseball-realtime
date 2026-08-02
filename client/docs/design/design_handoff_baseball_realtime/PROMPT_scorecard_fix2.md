# Scorebook cell: BB/HBP path parity + HR simplified + overflow clip fix — Aug 2, 2026

File: `scorebook-cell.js` (`window.buildScorebookGrid`).

## What changed
1. **BB/HBP now match 1B.** `scorebookBaseFromCode` previously only mapped 1B/2B/3B/HR to a
   base. Now BB/IBB/HBP also resolve to base 1, so any way of reaching first draws the same
   home-to-first path with the label on the 1st-base foul line — consistent treatment, not
   just hits.
2. **HR simplified to a centered code** (no drawn path), matching how K/outs already render.
   A full base-to-base loop line added complexity without much payoff — HR is already clear
   from the code itself plus the line-score/RBI context.
3. **Overflow/clip fix.** The path + label are now wrapped in an SVG `<clipPath>` scoped to
   the field's own 0–100 viewBox (unique id per cell). Cause of the earlier bug: the flip
   view's pan/zoom + 3D-transform wrapper (perspective/backface-visibility) can defeat a plain
   `overflow:hidden` clip on some rendering engines, letting the drawn line/label bleed into
   neighboring cells. The explicit clipPath makes containment independent of the ancestor
   transform context.

## Port note
Pure rendering fix in the shared cell renderer, verified in isolation (1B/2B/3B/HR/BB test
cells, all contained, no overflow). No data model change. If the port has its own copy of this
drawing logic rather than importing `scorebook-cell.js` directly, apply the same three
changes there.
