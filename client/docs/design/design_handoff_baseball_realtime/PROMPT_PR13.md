# PROMPT — PR 13: Game view scorebook depth + batting-order spot

> Paste-ready for Claude Code. Full spec: `MIGRATION.md` → **PR 13**. Design source of truth (re-synced): `holistic/shared.jsx` (the `ScorebookCell` atom + `OrderSpot`), `holistic/game-v2.jsx` (the `MatchupLeft` batter card, `PitchByPitchV2` rows, Due-up), `holistic/foundations.jsx` (the full `ScorebookCell` vocabulary reference).

---

## What this is

Three small, related game-view enhancements bundled into ONE PR because they touch the same files (`ScorebookCell` in `shared.jsx`; the batter card + feed rows in `game-v2.jsx`).

**Posture: an UNGATED visual core you ship now, plus GATED data enrichments that light up when their data lands.** The atom degrades to today's rendering, so there is never a layout hole.

---

## F-004 — batting-order spot · UNGATED, ship now

A small squared mono chip (`OrderSpot`, in `shared.jsx`/`game-v2.jsx` design source) showing the batter's lineup position (1–9), placed **before the batter name** in three places:
1. `PitchByPitchV2` PA rows (live + finished),
2. the `MatchupLeft` "At bat" batter card,
3. the Due-up on-deck / in-the-hole rows.

- **No new API** — the batting-order slot is already known from the same lineup feed that powers the Lineups tray. Thread that slot through to the three spots.
- Keep it **visually distinct** from the jersey number (`#27`, inline) and the result-icon circle: it's a bordered squared chip, subtle (surfaceAlt fill, muted ink).
- **Accept:** every PA row, the batter card, and both due-up rows show the correct order spot, matching the Lineups tray. Three numbers per row (order / jersey / result) stay distinct. Hover title = "Batting Nth".

## F-003 — `ScorebookCell`: at-bat result vs. baserunning

Port the re-synced `ScorebookCell` atom verbatim from `holistic/shared.jsx`. The diamond now reads with **stroke weight**:
- **Bold** basepath = what the batter did at the plate (bases earned off the bat; **dashed** for a walk).
- **Light** basepath = how far he advanced **afterward** as a baserunner.
- End-states: **green** shade = run; **hollow ring** at the final base = left on base; **×** = thrown out on the bases (distinct from a plate out = empty diamond).

New optional props: `reachedOnPA` (bold endpoint) · `finalBase` (light endpoint) · `outAt` (× base) · `stranded`. The old `reached` shorthand still works.

- **UNGATED (ship now):** the atom + two-tone system. **Passing only `reachedOnPA` (= today's `reached`) renders identically to today** — bold path + dot, no light segment. Safe on current data.
- **GATED on baserunning-outcome data:** the light segment + scored/stranded/out-on-bases states need per-runner baserunning tracking (did this runner later score / get stranded / get thrown out). `scored` already exists (the PR 10 path); `finalBase` / `outAt` / `stranded` need data the feed may not carry yet. Until it does, **omit those props** → the cell shows the PA result only, no hole.
- **Accept:** the `foundations.jsx` `ScorebookCell` row (Single / Double / Walk / Singled·scored / Walked·stranded / Caught stealing / Strikeout / Groundout / Out·generic / Home run / Live) renders at parity. The batter-card "At-bats" row uses enriched props where baserunning data exists, degrades cleanly where it doesn't.

## F-005 — out-code enrichment · GATED on the play enum

`ScorebookCell` renders whatever `code` string it's handed. Show the real code (`K`, `F8`, `F9`, `6-3`, `L4`…) **when the feed carries fielder/out-type detail**, and the honest catch-all **`OUT`** when it doesn't. A fabricated `F8` is worse than a truthful `OUT`.

- **Answer this data question FIRST (it is the gate):** *what values can the normalized play enum take, and does any out carry out-type + fielder/position detail* (position 8 = CF vs 9 = RF)? If the enum only says generic "Out" → `OUT`. If it carries position → `F8`/`F9`/`6-3` render for free. Build a play-event → scorebook-code mapper that **degrades to `OUT`**.
- **Accept:** outs show specific codes where data supports them, `OUT` otherwise; longer codes stay legible at the 44px cell.

---

## Out of scope — do NOT build (parked `future.md` F-006)

Full traditional scorekeeping: **fielder's choice** (batter safe + a *different* runner out — needs a not-a-hit `kind` + cross-runner linkage the per-PA cell doesn't have), **bunt vs. clean-hit**, **spray/location**, error/assist chains. A deeper data + notation layer; keep it out of PR 13.

---

## Ship & commit

- Ship **F-004 + the F-003 atom (ungated)** immediately. Land the **F-003 baserunning enrichment** and **F-005 out-codes** behind their data as it arrives — no new endpoints for the ungated core.
- Keep the diff tight: `ScorebookCell` (atom) + the batter card / feed-row / due-up wiring. Numerals stay mono. No `scrollIntoView`.
- **No design files in the app repo** — port into the real components; don't copy `holistic/*.jsx`.
- One PR: **"PR 13 — Game view: scorebook depth + batting-order spot."**
