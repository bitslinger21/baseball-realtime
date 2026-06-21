# Build — Scorebook out-code enrichment (F-005, the gated slice of PR 13)

You are in the `baseball-realtime` client + API. The `ScorebookCell` atom already renders whatever `code` string it's handed (e.g. `1B`, `K`, `OUT`). Today, outs fall back to a generic code. **F-005 makes outs show real scorekeeping codes (`K`, `F8`, `6-3`, `L4`, `6-4-3`) WHERE the feed supports it, and degrades to an honest catch-all where it doesn't.** Do only this.

> Design source: `holistic/shared.jsx` (`window.ScorebookCell`) + `holistic/foundations.jsx` (the cell vocabulary row). The atom needs NO change — this PR produces the right `code` value feeding it. Reuses the PR 10 `parsePA` mapping point.
> Posture: this is the **gated** slice carved out of PR 13 (F-004 + the F-003 atom already shipped ungated). **A fabricated `F8` is worse than a truthful `OUT`** — correctness over richness, always.

## Step 1 — Data investigation (THE GATE — do this first, report findings)

Everything downstream depends on what the normalized play feed actually carries for an out. Before building the mapper, determine:

1. **The out-type.** Does the play event distinguish **strikeout / groundout / flyout / lineout / popout / foul-out / sac-fly / sac-bunt / double-play**, or is it a single generic `Out` enum? (PR 10 noted the backend normalizes events to an ENUM like `'Single'`/`'Out'`/`'HomeRun'` — establish exactly which out subtypes exist, if any.)
2. **Fielder credit.** For a fielded out, is there a **putout position** and an **assist sequence** (e.g. credits `[6, 3]` for a 6-3 groundout)? Positions are 1–9 (see legend). Without this, you cannot print `F8` vs `F9` or `6-3` vs `4-3`.
3. **Called vs swinging strikeout** (optional nicety) — only if a flag distinguishes them (drives `K` vs backward-`ꓘ`).

**Report what you find** — it sets which degradation tier (below) is reachable. If the enum is generic-only, the honest outcome is Tier C everywhere, and that's a correct result, not a failure.

## Step 2 — Build the play-event → scorebook-code mapper

A pure function `outCode(play) -> string`, applied wherever the cell's `code` is produced (server-side normalization emitting `code` on the wire is preferred; else the client `parsePA` path from PR 10). **Hits are already coded by PR 10 — do not touch them.** This only governs outs.

**Position legend:** 1 P · 2 C · 3 1B · 4 2B · 5 3B · 6 SS · 7 LF · 8 CF · 9 RF.

**Tier A — fielder-coded (when out-type AND fielder credit exist):**
- Strikeout → `K` (or `ꓘ` for a called third strike *if* distinguishable; else `K`).
- Groundout → the credit sequence: `6-3`, `4-3`, `5-3`, `1-3`; unassisted at a base → `{pos}U` (e.g. `3U`).
- Flyout → `F{pos}` (`F7`/`F8`/`F9`).
- Lineout → `L{pos}` (`L4`).
- Popout → `P{pos}` (`P6`); foul pop to the catcher → `P2`.
- Foul-out → `F{pos}` of the fielder who caught it (often `F2`/`F3`/`F5`).
- Sac fly → `SF`; sac bunt → `SH`.
- Double play → the full sequence `6-4-3` / `4-6-3` / `5-4-3` (omit a trailing `DP` suffix to stay legible at cell size — the sequence reads as a DP).

**Tier B — type-only (out-type known, NO fielder credit):** the conventional box-score abbreviation — `GO` (groundout) · `FO` (flyout) · `LO` (lineout) · `PO` (popout) · `K` (strikeout needs no fielder, so strikeouts are always at least this tier). Truthful, just less specific.

**Tier C — generic (out-type unknown):** `OUT`. The current fallback.

Always emit the **highest tier the data supports, per play** — a strikeout is `K` even if a groundout in the same game can only reach `OUT`.

## Step 3 — Legibility at cell size

The cell is ~50px wide; the `code` span is mono 11px, `white-space: nowrap`. Short codes (`K`, `F8`, `6-3`) fit. **Length-aware shrink:** for codes of **5+ glyphs** (`6-4-3`, `5-4-3`), drop the code font to ~9px so it never clips or wraps. Keep it a one-line, single-property tweak on the existing `code` span — don't restructure the cell.

## Out of scope (parked `future.md` F-006)
Fielder's **choice** (batter safe + a *different* runner out — needs a not-a-hit `kind` + cross-runner linkage the per-PA cell can't express), **bunt-single vs clean-single**, **spray/location**, and **error/assist attribution** (`E6`). Those are the deeper notation layer — do NOT fold them in here.

## Must-not-break
- **Correctness over richness:** never invent a position or sequence. No fielder data → Tier B; no out-type → `OUT`.
- Hits, walks, the bold/light basepath, and the `scored`/`stranded` end-states (F-003) are untouched — this is the `code` string only.
- Numerals/codes stay mono. The atom signature is unchanged.
- The `foundations.jsx` vocabulary row must still render (it exercises `K`, `F8`, `6-3`, generic `OUT`).

## Acceptance
- Investigation findings reported: which out-subtypes + fielder fields the enum exposes, and therefore which tier is reachable.
- Where the data supports it, outs show specific codes (`K`, `F8`, `6-3`, `6-4-3`); where it doesn't, they show the truthful Tier-B (`GO`/`FO`/…) or Tier-C (`OUT`) fallback — **no fabricated codes**.
- 5+ glyph codes stay legible (no clip/wrap) at the 44/50px cell.
- Hits and the F-003 basepath rendering are unchanged.

Open one PR titled **"PR 13 (F-005) — Scorebook out-code enrichment."** Note it's the gated slice of PR 13, depends on the play-event enum's out-type + fielder detail (reported in step 1), and explicitly defers F-006 (fielder's choice, spray, errors).
