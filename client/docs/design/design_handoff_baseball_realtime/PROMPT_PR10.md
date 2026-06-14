# Build PR 10 only

You are working in the `baseball-realtime` client. PRs 1–9 of the "editorial scorebook" redesign have already landed. **Do only PR 10. Touch nothing else.**

## What to read first
- `MIGRATION.md` → section **"PR 10 — Game view: At-bats scorebook row (batter card)"**. That is the full spec. Follow it exactly.
- The design source of record (in this package): `holistic/shared.jsx` (the `window.ScorebookCell` atom) and `holistic/game-v2.jsx` (the `MatchupLeft` batter card with the At-bats row). Port from these verbatim.

## What PR 10 is
A horizontally-scrolling row of scorebook diamond cells in the game-view batter card — one cell per plate appearance the current batter has had today. **No new API tier needed**; the data comes from the same play-by-play feed that already powers `PitchByPitchV2`.

## Do exactly this
1. **Add a new primitive** `client/src/components/primitives/ScorebookCell.tsx` (+ `.css`). Port `window.ScorebookCell` from `holistic/shared.jsx` verbatim — it's a game-state primitive like `StrikeZone`/`Bases`; do not redesign the diamond geometry. Use the existing CSS-var tokens (`--color-*`, `--font-mono`, `--radius-sm`).
2. **Edit `MatchupLeft` in `client/src/features/game/GamePage.tsx`** (matches `holistic/game-v2.jsx`):
   - Trim the "Today" row value to the summary only (`N-for-M`); drop the trailing `· 1B · K · F8 · BB`.
   - Insert an "At-bats" block between the Today row and the "vs [pitcher]" row: an uppercase `At-bats` label + a `display:flex; gap:6px; overflow-x:auto` row mapping the batter's PAs (oldest→newest) to `<ScorebookCell width={44} />`, with the in-progress PA as a trailing `<ScorebookCell live width={44} />`.
3. **Wire real data** from the existing play-by-play feed: per-PA `{ inning, resultCode, kind, basesReached, scored?, live? }` for the current batter. No new endpoint.
4. Add `ScorebookCell` to the Foundations / component gallery if one exists.

## Must-not-break rules
- **The `min-width:0` overflow fix is load-bearing.** Set `min-width:0` on the batter-card column, the inner stat grid (`grid-template-columns: minmax(0,1fr)`, not `1fr`), the At-bats wrapper, AND the scroll row. Without all four, the card overlaps the `PitchByPitchV2` column and the scroll never engages. **Test with ≥6 PAs.**
- **Live cell is neutral dashed, never rust.** There is exactly one rust LIVE pill on the screen (the `PageTitle`). Don't add another.
- **All numerals are mono + tabular-nums.**
- **Do NOT** implement the bold-PA vs lighter-baserunning stroke treatment (that's deferred — `future.md` F-003). Ship the single-`reached` model.

## Acceptance
- `ScorebookCell` renders, is used in the batter card, and appears in the gallery.
- "Today" line is summary-only; per-AB results live in the diamonds.
- At-bats row sits between Today and "vs [pitcher]"; ~5 cells fit at design width; **with ≥6 PAs it scrolls and does not overlap** the pitch-by-pitch column.
- Live PA = trailing neutral-dashed cell; still exactly one rust LIVE pill.
- All numerals mono.

Open one PR titled **"PR 10 — Game view: At-bats scorebook row"**; mention the `min-width:0` fix in the description.
