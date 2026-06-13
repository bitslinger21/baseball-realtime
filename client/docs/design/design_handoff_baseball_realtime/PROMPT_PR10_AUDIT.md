# PR 10 — data/API audit + fix

You are auditing the **already-ported PR 10** ("At-bats" scorebook row, game-view batter card) in the `baseball-realtime` client. The UI structure ported, but **the diamonds render empty and the result code shows a fallback "–"** — i.e. the cells are rendering but **not being fed real data**. Your job: trace the data path end to end, **report every issue you find with its root cause, then fix them.** Scope is PR 10 only.

Reference: `PROMPT_PR10.md` (the original PR spec), `MIGRATION.md` → "PR 10" section, and the design source of record `holistic/shared.jsx` (`window.ScorebookCell`) + `holistic/game-v2.jsx` (`MatchupLeft`).

## Symptom
In the running app, the game-view batter card "At-bats" row shows diamonds with **no basepath traced** (empty) and a **"–" result code**. The solid/dashed frame states render correctly, so the atom is fine — the data feeding it is not.

## Audit — trace the full path, don't guess
Walk the data from the API to the rendered cell and find exactly where it breaks. Check, in order:

1. **Is the per-PA list actually built from the feed, or still a placeholder?** Find where the batter's at-bats array (the `todayPAs` equivalent) is assembled in `GamePage.tsx` / `MatchupLeft`. If it's the hardcoded demo array, an empty `[]`, or never populated from the play-by-play response, that's issue #1.

2. **Field-name mismatch (most likely culprit).** The `ScorebookCell` props are `code`, `kind`, `reached`. The API/feed almost certainly names them differently (e.g. `resultCode`, `basesReached`). If the feed objects are spread/passed straight through without renaming, the props arrive `undefined` → empty diamond + "–". Verify the actual API field names against the prop names and confirm the mapping renames them.

3. **`kind` is derived, not raw.** `kind` ('hit' | 'out' | 'walk') must be **computed** from the play result/event — it is not a raw API field. Confirm there's a derivation (e.g. event type → hit/out/walk) and that it's correct for walks (HBP too, if present) so the dashed-path/open-dot walk styling fires.

4. **`reached` / `scored` mapping.** Confirm `reached` (0–4) is set from bases reached and `scored` shades the run. An all-zero `reached` is why every diamond is empty — verify it's actually populated, not defaulting.

5. **The live PA.** Confirm the in-progress at-bat is appended as a trailing cell with `live` set (and a running-count `code` if available), and that finished PAs are ordered oldest→newest.

6. **Result-code fallback.** Find where "–" comes from. If it's a default for a missing `code`, fixing the mapping (#2) should remove it — confirm real codes (`1B`, `K`, `F8`, `BB`, …) now render.

7. **API availability.** Confirm PR 10 truly needs **no new endpoint** — the per-PA result/bases/event data must already exist in the same play-by-play payload that powers `PitchByPitchV2`. If any required field genuinely isn't in that payload, **stop and report it** as a data-gap rather than inventing a source.

8. **Foundations / component gallery crop.** The gallery view is **cut off at the bottom** — the "Scorebook at-bats" section likely overflows its card or the page container. Find and fix the overflow/height clipping so the full Scorebook section is visible.

## Fix, then verify against acceptance
After fixing, confirm all of:
- Real result codes render (no "–" fallback); diamonds trace the correct bases; walks show the dashed path + open dot; runs shade green.
- "Today" line is summary-only (`N-for-M`); per-AB results live in the diamonds.
- With **≥6 PAs the row scrolls** and does **not** overlap the `PitchByPitchV2` column or the "vs [pitcher]" row (the `min-width:0` fix).
- Live PA = trailing **neutral dashed** cell; still exactly **one rust LIVE pill** on screen (`PageTitle`).
- All numerals are **mono + tabular-nums**.
- Foundations Scorebook section renders fully, not cropped.

## Constraints
- **Scope = PR 10 only.** Don't touch other screens, PRs, or routes.
- **No new API tier**; do not invent endpoints. If data is genuinely missing, report it.
- **Do NOT** implement F-003 (bold-PA vs lighter-baserunning strokes) — ship the single-`reached` model.

## Deliverable
1. A written **audit report**: each issue found, its root cause, and the file/line. Call out explicitly whether the break was placeholder data, a field-name mismatch, a missing `kind` derivation, or a real API gap.
2. The **fixes**, in one PR titled **"PR 10 fix — wire At-bats scorebook data + Foundations crop"**, with the acceptance checklist above confirmed.
