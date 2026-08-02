# Scorebook cell: hit-result label moved to the foul-line — Aug 2, 2026

File: `scorebook-cell.js` (`window.buildScorebookGrid`, shared by `Scorebook Page.html` and
the in-app scorecard flip in `game-v2.jsx`).

## Bug
The per-cell result label (e.g. "1B") rendered centered over the infield/mound, overlapping
the field diagram. Only the LABEL was wrong — the base-path line itself was correct/expected
(a real scorecard path does cross the infield).

## Fix
New `window.scorebookBaseFromCode(code)` maps hit codes (1B/2B/3B/HR) to the base reached.
For those codes, the cell now draws a solid line from home to that base (with a small filled
dot at home) AND positions the text label along that base's OWN foul line — not centered:
- 1B → label at the 1st-base foul line (right side)
- 3B → label at the 3rd-base foul line (left side)
- 2B → label above 2nd base (no foul line there, so just outside the diamond, up top)
- HR → label behind home plate

Non-hit codes (K, groundout/flyout notations, BB, etc.) are unchanged in behavior except now
rendered centered in the cell (matches the reference — previously top-left corner).

## Port note
Pure CSS/SVG positioning fix in the shared cell renderer — no data model change. If the port
has its own copy of this cell-drawing logic (rather than importing `scorebook-cell.js`
directly), the label-position map above needs to be applied there too.
