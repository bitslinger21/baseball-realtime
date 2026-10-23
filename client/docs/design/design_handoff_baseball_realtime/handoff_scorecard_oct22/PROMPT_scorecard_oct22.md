# Scorecard header corner + pregame analytics + scoring pill — 3 changes

**rev 1 · Oct 22, 2026** · Ungated, no new API · Follows `handoff_scorecard_pregame_fixes/` (rev 6, done)

Preview: `Scorecard - Before First Pitch (standalone).html` (one file, double-click, open at ≥1400px).
Design source: `holistic/scorecard-frozen.jsx` (`SfLeft`), `holistic/game-v2.jsx` (`WinProbTimeline`, `LeverageCard`),
`holistic/game-scout.jsx` (Earlier at-bats row + current at-bat header).

## 1 · Scorecard sheet: drop the dark team bar, team goes in the header corner

The dark bar above the sheet (`[logo] Tampa Bay Rays` in `app_now_oct22.png` from the previous handoff) **goes**.
The sheet's frozen left column already has two header cells. They now carry the team, with logo:

- Top-left header: `[logo] Batting · Astros`. This is the team whose card it is.
- Pitching header: `[logo] Pitching · Cubs`. **This is the OPPOSING team.** A team's card lists the pitchers its
  batters faced (the defense), as on a paper scorecard. The pitcher rows, their ERA/hand and the per-inning pitcher
  tallies all come from the **other** team's pitchers.

Details:
- Use the team's **nickname** (`Astros`, `Rays`, `Guardians`), not the abbreviation and not the full name.
- Logo = the existing `TeamDot` at 18px, 7px gap, before the label. Header cells stay 30px tall.
- Render the label as ONE string (`` `Batting · ${nickname}` ``). The header cell is `display:flex`, so splitting
  static text and an expression into separate flex items drops the space ("Batting ·Astros").
- **Print too:** same header cells on the printed sheet, and the print heading reads `Astros batting` (nickname).
- The team toggle in the card header (`CLE | TB`) **keeps abbreviations**. It's a compact control.
- Space gained (~28px) goes to the sheet.

## 2 · Win probability + Leverage before the first pitch

Show both as their **real cards, at their real heights**. Not a stub, not hidden. Add a `pregame` prop to both.

**Win probability (`pregame`):**
- Keep: card, eyebrow, the 100 / 50 / 0 gridlines (dashed 50), axis labels, team anchors, inning numbers 1–9.
- Remove: the trend line, the shaded areas, the end dot.
- Header value (`84% HOU`) is **not rendered visibly**. Keep its box (`visibility:hidden` or a fixed min-height) so the
  header doesn't change height when the first value arrives.
- "How to read" caption stays.
- X domain = the full 1–9 (same as a final).

**Leverage (`pregame`):**
- Remove: the value (`2.4×`), the HIGH/MED/LOW pill, the scale fill, `peak today …`.
- Keep: the eyebrow, the scale track, the avg 1.0 marker, the `0` and max labels.
- Copy: `How much this moment can swing the outcome vs. an average play. Starts at the first pitch.`
- Hidden pieces keep their space (`visibility:hidden`), so nothing moves at the first pitch.

**Rule:** the row must be the same height before and after the first pitch. At the first pitch the line
draws from 50% and the value/pill fill in; nothing else changes.

## 3 · Scoring pill in Earlier at-bats: no clipping

The green `N runs │ score` pill could get clipped in a narrow row. On the pill:
`flex-shrink:0; box-sizing:border-box; line-height:1.2; white-space:nowrap`. On the row that holds name + result +
pill: `flex-wrap:wrap; row-gap:6px; min-width:0; padding-block:2px`, and `min-width:0` on the name/result span.
The pill wraps to its own line whole and never cuts off. Apply the same to the current at-bat header's pill.

## Acceptance

- [ ] No dark team bar above the sheet, on screen or in print.
- [ ] HOU card: `[logo] Batting · Astros` over HOU batters; `[logo] Pitching · Cubs` over CHC pitchers. Toggle to
      CHC flips both.
- [ ] Printed pages: same header cells; heading `Astros batting` / `Cubs batting`.
- [ ] Before the first pitch: Win probability shows axes and anchors with no line, no shading, no dot, no header value.
      Leverage shows the scale and avg marker only, with "Starts at the first pitch."
- [ ] The analytics row has the same pixel height before and after the first pitch.
- [ ] A scoring pill in a narrow Earlier at-bats row wraps whole; it's never clipped.
