# Build BUG-011 fix — Pitching tab "redesign down" (lean, player-specific)

You are working in the `baseball-realtime` client (React 19 + Vite + TypeScript). The "editorial scorebook" redesign is largely landed (PRs 1–13). **Do only this change. Touch nothing else.**

> Self-contained spec is inline. Reference (in the handoff package): `holistic/player.jsx` — the signed-off design source. The lean tab is `PitchingTab`; the OLD rich tab is preserved in the same file as `PitchingTabFull` (parked, not rendered). Port `PitchingTab` **verbatim**, wired to real per-player data.

---

## Why this change

The Pitching tab that shipped in **PR 6** renders **identical, fabricated data for every player** (BUG-011). Its design was a single-player Peña mock with no per-`:mlbId` data path, and four of its five cards (pitch-mix donut, Whiff%, location heat map, counts-attacked) have **no backing data anywhere in the current API** — wiring them needs a new Statcast/Savant pitch-level ingest that does not exist yet.

> **⚠️ DATA-SOURCE CORRECTION (Jun 20, 2026 — supersedes the source assumptions below).** This prompt originally assumed pitch-type slash splits come from `splits` group=`pitchType`. **They do NOT** — the MLB `statSplits` pitch-type sit codes return **zero rows for batters** (confirmed across `statSplits`/`statSplitsAdvanced`/`careerStatSplits`, every season; Savant CSV blocks server-side). The pitch-type slash line must be **aggregated server-side from the `pitchLog` stat type** instead. **That wiring is a separate follow-up PR — `PROMPT_pitching_pitchtype_wiring.md` (handoff PR 6.6).** Handedness splits are unaffected (they work). So this lean tab's Card 1 ("Performance by pitch type") renders only once PR 6.6 lands; the port that shipped from THIS prompt showed it empty (subtitle "189" = the handedness sum). Where this prompt says `splits group=pitchType`, read `pitchLog` aggregation.

**Decision (Jun 20, 2026): redesign down.** Replace the rich tab with a **lean, genuinely player-specific** tab built ONLY from data the API can produce — pitch-type slash splits (aggregated from `pitchLog` — see correction above) and handedness slash splits. The rich five-card version is **parked** (kept in the design file as `PitchingTabFull`) to restore when the Savant ingest lands (that restoration is handoff **PR 6.5**).

**This PR is NOT gated** — unlike PR 3.5 / PR 6.5, every value the lean tab shows already exists in the API. Ship it now; it removes fabricated production data.

## What the lean tab contains (all real, keyed to `:mlbId`)

A header, a reduced filter rail, two data cards, and an honest "coming later" strip.

### Header
- Title: **"How pitchers attack {playerLastName}"** (e.g. "How pitchers attack Peña") — now genuinely per-player.
- Subtitle: **"{totalAB} at-bats by pitch type & hand · {season}"** where `totalAB` is summed from the pitch-type splits. **Do NOT** reintroduce the old "314 pitches seen" line — pitch COUNT is not available (we only have AB-based splits).
- **Filter rail reduced to `All / vs LHP / vs RHP`** (was `All / vs LHP / vs RHP / In strike zone / Outside zone`). The two zone filters are GONE — zone membership needs pitch-location data we don't have. The rail may stay display-only for now (the handedness slices exist, so wiring `vs LHP` / `vs RHP` is optional polish, not required for this PR).

### Card 1 — "Performance by pitch type" (the hero)
Source: **`pitchLog` aggregation** for this player + season (NOT `splits` group=`pitchType`, which is empty for batters — see correction at top; wiring = PR 6.6).
Table columns: **Pitch | AB | AVG | SLG | OPS**, sorted most-faced first (by AB).
- Pitch name carries its color dot (keep the sanctioned per-pitch palette: four-seam `#dc2626`, sinker `#ea580c`, slider `#0891b2`, curve `#3b82f6`, change `#16a34a`, cutter `#a3a3a3`).
- The **SLG cell embeds a small colored bar** beside the value (scaled to a `.600` ceiling) — same one-cell pattern as before, not a separate column.
- `AVG` accents (hot) at `≥ .280`; `OPS` accents at `≥ .800`.
- Footer line, **derived from the table** (not hardcoded): "Most vulnerable to the {maxOPS pitch} ({OPS} OPS); quietest against the {minOPS pitch} ({OPS})." Compute max/min by OPS — never hand-assert.

### Card 2 — "By pitcher hand" (platoon split)
Source: `splits` group=`handedness` (vs LHP / vs RHP) for this player + season.
Table columns: **vs | AB | AVG | OBP | SLG | OPS**, rows vs RHP and vs LHP.
- `OPS` accents (hot) at `≥ .800`.
- Footer line, **derived**: "Hits {higher-OPS hand} harder — {OPS} OPS vs {OPS} against {other hand}."

### Parked-features strip (below the two cards)
A single dashed `surfaceAlt` strip: bold **"Coming with pitch-level data"** + four ghost chips — **Pitch mix · Whiff rate · Location heat map · Count tendencies** + a muted "Unlocks when Statcast per-pitch data is connected." This is intentionally NOT a fake empty card; it sets expectation and explains why this tab is leaner than the others. Keep it.

## Data you need (all already in the API)
- **Pitch-type slash splits** — AVG/SLG/OPS + AB per pitch type, **aggregated server-side from the `pitchLog` stat type** (group AB-ending pitches by `type.description`, accumulate H/TB/BB-HBP from `event`). NOT `splits` group=`pitchType` (zero rows for batters). Wiring spec: `PROMPT_pitching_pitchtype_wiring.md` / PR 6.6. (Whiff% is NOT available — the lean table doesn't use it.)
- **Handedness slash splits** — AVG/OBP/SLG/OPS + AB vs LHP / vs RHP, via `splits` group=`handedness`.
No new endpoints. If a player has sparse data (few pitch types faced, no LHP sample), render only the rows that exist — don't pad.

## What to REMOVE from the shipped (PR 6) tab
Delete from the rendered tab (they live on in `PitchingTabFull`, parked):
- Pitch-mix **Donut** + the "SEEN / {count}" center.
- **Whiff%** column.
- **Damage by location** heat-map card (the `HotZone`/`StrikeZone`-heat block) and its outside-zone caption.
- The **By pitcher handedness** rich columns (FB%/BRK%/OS%/Zone%/First-pitch strike/Put-away) — replaced by the plain slash-line platoon table.
- **Counts attacked** grid.
- The two zone rail chips (`In strike zone` / `Outside zone`).

Keep `PitchingTabFull` in the file (or an equivalent parked module) — do NOT delete it; PR 6.5 restores it.

## Must-not-break
- **Numerals mono** with `tabular-nums` — every number in both tables + footers.
- **Per-pitch colors** stay the sanctioned exception (don't token-ify).
- **Rust = hot only** — the hot AVG/OPS accents and the "most vulnerable" OPS value; nothing decorative.
- Don't touch the other five tabs, the hero, or the tab nav.
- For a **pitcher's** profile this tab is still meaningless — keep the existing "Pitcher arsenal — coming separately" placeholder (open question #4, unchanged).

## Acceptance
- Open **two different** batters' Pitching tabs — the numbers DIFFER and match each player's real pitch-type and handedness splits. No shared/fabricated dataset.
- Title shows the actual player; subtitle shows real summed AB; no "314 pitches seen."
- Rail is `All / vs LHP / vs RHP` only.
- "Performance by pitch type" (AB/AVG/SLG-bar/OPS, sorted by AB, derived footer) and "By pitcher hand" (AVG/OBP/SLG/OPS, derived platoon footer) both render from real data.
- Parked "Coming with pitch-level data" strip present.
- Numerals mono; pitch colors intact; no rich-card remnants in the rendered tab.

Open one PR titled **"BUG-011 — Pitching tab: redesign down to available data"**; note that `PitchingTabFull` is parked for PR 6.5 (Statcast ingest), and that this PR removes fabricated per-player data with no new API dependency.
