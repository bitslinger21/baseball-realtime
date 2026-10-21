# Head-to-head v2 — pitcher cards as the selector (Oct 19, 2026) · rev 1

> Version stamp: **rev 1, Oct 19, 2026.** If your copy has no stamp, it's stale.

**Ungated. No new API.** Same data as the shipped Head-to-head view (v1, `PROMPT_headtohead_and_logo_fix.md`).
This is a restructure of its controls + the deep-dive header, not new data.

Files in this folder (design reference — read, don't copy into the app):
- `holistic/game-headtohead-v2.jsx` — **the spec.** `window.HeadToHeadScreenV2({ lineups, probables, pitching, initial })`
- `holistic/game-headtohead.jsx` — v1, unchanged except it now exposes its helpers on `window.h2hHelpers`
  (`mockH2H`, `PLAYER_MLB_IDS`, `BatterChip`, `sideKey`, …) so v2 reuses them. Mock-plumbing only.
- `Head-to-Head.html` — standalone preview with a Pregame / Live toggle.

Same props as v1, so the swap at both call sites (pregame + live game view) is a rename.

---

## 1. The pitcher cards are the selector — both toggles are removed

**Delete** the team `Segmented` (HOU / CHC) and the `Batter / Pitcher` mode `Segmented`. They are gone, not moved.

The "On the mound" card (pregame: "Starting pitchers") keeps its two halves. Each half is now a button:

- **Selected:** 3px **rust top rule** (`T.accent`), full colour, and on the eyebrow line, right side:
  `Facing the {opp.short} ↓` (rust, 11.5px, 700).
- **Unselected:** headshot `filter: grayscale(1)` at **opacity 0.6** (0.8 on hover); name + stat values in `T.textMuted`;
  the card background goes to `T.surfaceAlt` on hover and shows `Show his matchups` (muted) in the eyebrow slot.
  **Still clickable** (that's how you switch). Use `role="button"`, `tabIndex=0`, Enter/Space.
- Text is muted with **colour, not opacity**: the unselected half still carries live info and has to stay readable (AA).
- The unselected half reserves a transparent 3px top border, so switching causes no layout shift.

Picking a pitcher makes the lineup rail the **other** club's hitters. On a switch, reset the alternative to `mound`
and the batter to slot 2.

**Default selection:** the live view opens on the pitcher facing the **current live batter** (v1's `initial.side` is still
the batting team; v2 derives the pitcher side from it). Pregame opens on the away starter.

## 2. Bullpen "what if": an "Or try" row inside the selected card

This replaces Pitcher mode, whose only extra was choosing a reliever.

- The row sits only in the **selected** half, under a hairline: label `OR TRY` (11px eyebrow), then small chips:
  `{mound last name} · pitching` (pregame: `· starter`) → `{starter} · pulled` (live, only if he was relieved) → every
  bullpen arm `{last} · {hand} · {ERA}`.
- Default is the mound chip. Chips `stopPropagation` so they never toggle the card.
- When any chip other than the mound pitcher is chosen, the lineup header shows on the right, as **plain muted italic text
  (NOT a pill — a pill read as a button):**
  `What-if matchup — {last} isn't pitching`, followed by a rust text link `Back to {mound last}`.
- Bullpen list = `LINEUPS[team].bullpen`, i.e. relievers **still eligible**. A pitcher who has entered (Hader in the
  preview) is not in it; anyone who hasn't pitched is.

## 3. Lineup header

`[TeamDot 20px] {opp.short} lineup vs {pitcher name}`. The logo is the **batting** club's.

## 4. Deep-dive header: three groups, left-aligned

There used to be a large gap between the batter name and the right-aligned stats. Now:
`grid-template-columns: auto auto minmax(0,1fr)`, gap 22, each group after the first with a 1px left hairline + 22px padding:

1. Headshot 44 · **name (link)** · `{pos} · vs {pitcher} ({hand})`
2. Eyebrow `Career vs {pitcher last} · {PA} PA`, then AVG · OBP · SLG · HR · K (labels 11px, values 14px mono 700).
   PA moves into the label. **First meeting:** the eyebrow drops the PA, and the slot shows the `First meeting` pill +
   `No history yet`, in the same position (min-height 32 so the header doesn't change height).
3. Eyebrow `The read` + the one-sentence read (13.5px, `T.text`, max-width 460, `text-wrap: pretty`).
   **Moved here from under the arsenal table.** Remove it from the table card.

The body (Arsenal vs this bat table + Damage zone) is unchanged.

## 5. Player names are links

Same treatment as game-v2's names: dotted underline, `textDecorationColor: T.borderStrong`, offset 3, → player page
(`/player/{mlbId}`; the mock calls `window.openPlayerOverview()`). Applies to:
- both pitcher names in On the mound (**including the unselected card**: clicking the name opens the player and does NOT
  select the card, so `stopPropagation`),
- the relieved pitcher in `Relieved {last} · …`,
- the batter's name in the deep-dive header.

## 6. Small-label floor

All word labels in v2 are ≥ 11px (v1's deep-dive stat labels were 9.5px).

---

## Not for port
- The preview page's **Hader scenario** (`PITCHING_HADER` / `LINEUPS_HADER` in `Head-to-Head.html`) is page-local mock data
  that shows a pitching change. The design files' shared mocks still have Pearson relieving Valdez. Real data drives this.
- `mockH2H()` remains placeholder stats, as in v1.

## Acceptance
- No HOU/CHC or Batter/Pitcher segmented controls anywhere on the Head-to-head view.
- Clicking the gray card selects it; the rust rule moves; the rail shows the other lineup; nothing shifts vertically.
- Choosing a bullpen chip shows the italic what-if line + `Back to …`; clicking it returns to the mound pitcher.
- Clicking a name on the gray card opens the player and leaves the selection where it was.
- Deep-dive header: no dead gap; the read sits at the top; the first-meeting case keeps the same header height.
