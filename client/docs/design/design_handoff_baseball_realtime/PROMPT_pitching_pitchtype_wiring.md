# Build — Pitching tab: wire "Performance by pitch type" from pitchLog aggregation

You are in the `baseball-realtime` client + API. The lean Pitching tab (BUG-011 "redesign down") shipped with **only the "By pitcher hand" card rendering** — the **"Performance by pitch type"** card (the wider, left-hand card) is missing because its data source came back empty. This PR adds the missing data and renders the card. Do only this.

> Frontend reference: `holistic/player.jsx` → `PitchingTab` — the signed-off design. The card already exists in the design; it just needs a real data source.

## Why it's missing (corrected data provenance)

The original BUG-011 prompt assumed pitch-type slash splits came from the MLB **`statSplits`** endpoint with pitch-type sit codes (`pff`, `psi`, `psl`, …). **That endpoint returns ZERO rows for batters** — confirmed empty across every variant (`statSplits`, `statSplitsAdvanced`, `careerStatSplits`) and season. Savant's CSV export also blocks server-side requests. So the card had no data and collapsed; "By pitcher hand" slid into the wide left grid slot (that's the empty space to its right), and the subtitle reads "189 at-bats" because it's summing only the two handedness rows (144 + 45).

**The data IS available — derive it server-side from the `pitchLog` stat type.** `pitchLog` returns one entry per pitch, with enough per-pitch fields to aggregate the slash line yourself. Verified: player `665161` / 2026 `pitchLog` = 642 pitches; aggregating AB-ending pitches by type gives AB totals that sum to the player's real season AB (152 for Peña). Handedness splits are unaffected — keep them as-is (they already work).

## Backend — new aggregation (one method, no new API key, no Savant)

Add a method to `PlayersService` that, for a given `mlbId` + season:

1. Fetch the player's **`pitchLog`** stat type.
2. Group **AB-ending pitches** by `stat.play.details.type.description` (the pitch name).
3. Per group accumulate:
   - **AB** — count of at-bat-ending pitches (`stat.play.details.isAtBat`).
   - **Hits** and **total bases** — from `stat.play.details.isBaseHit` / `stat.play.details.event` (`single`/`double`/`triple`/`home_run`).
   - **On-base events** (for OBP→OPS) — hits + walks/HBP from `event` (`walk`, `hit_by_pitch`), over plate appearances (`stat.play.details.isPlateAppearance`).
4. Compute **AVG = H/AB**, **SLG = TB/AB**, **OBP** from on-base events / PA, **OPS = OBP + SLG**.
5. Emit `SplitRowDto` rows with **`group = 'pitchType'`** — one row per pitch type — so the frontend consumes them through the same splits shape it already uses for handedness.

Available per-entry fields (confirmed): `stat.play.details.type.description` (pitch name) · `stat.play.details.isAtBat` / `isPlateAppearance` / `isBaseHit` · `stat.play.details.event` (single/double/triple/home_run/walk/hit_by_pitch/…). Sum hits + TB + BB/HBP from these.

## Frontend — render the card from the real rows

The card is already designed in `PitchingTab` (`holistic/player.jsx`). Wire it to the new `group:'pitchType'` rows:

- Columns: **Pitch | AB | AVG | SLG | OPS**, **sorted most-faced first (by AB)**.
- **Render whatever pitch types come back** — do NOT hardcode a fixed six. Real data includes Sweeper and Splitter beyond the original list.
- **Pitch color dot:** keep the sanctioned palette — four-seam `#dc2626`, sinker `#ea580c`, slider `#0891b2`, curve `#3b82f6`, change `#16a34a`, cutter `#a3a3a3`. **Extend it** for the new types: **sweeper** → `#0e7490` (slider family), **splitter** → `#15803d` (change family). Map by normalized pitch name; unknown types fall back to `#a3a3a3`.
- **SLG cell embeds the small colored bar** scaled to a `.600` ceiling (one-cell pattern, not a separate column).
- Hot accents: **AVG ≥ .280** and **OPS ≥ .800** in rust.
- **Derived footer** (compute, don't hardcode): "Most vulnerable to the {maxOPS pitch} ({OPS} OPS); quietest against the {minOPS pitch} ({OPS})."
- **Subtitle fix:** "{totalAB} at-bats by pitch type & hand · 2026" where `totalAB` now sums the **pitch-type** rows (≈ the player's season AB), NOT the handedness rows. The "189" was the symptom of the missing data — it should match the pitch-type total once rows exist.

## Layout (this also closes the empty-gap bug)
Once Card 1 has data it fills the wide left slot and "By pitcher hand" moves to the narrow right slot — the two pair side by side in the existing `grid-template-columns:1.55fr 1fr` row, parked strip full-width below. No separate layout change needed; the gap was a symptom of the missing card.

## Must-not-break
- Numerals **mono + `tabular-nums`** in every cell and footer.
- Rust = hot accents only.
- Don't touch handedness card data, the parked strip, the other tabs, or the player hero.
- Pitch COUNT is now technically available from `pitchLog` (642 pitches), but **keep the subtitle AB-based** — do not reintroduce a "pitches seen" count line unless separately asked.

## Acceptance
- Two **different** batters' Pitching tabs show **different** pitch-type tables that sum to each player's real season AB.
- "Performance by pitch type" renders left/wide; "By pitcher hand" right/narrow; no empty gap.
- Subtitle AB matches the pitch-type total, not 144+45.
- Sweeper/Splitter (and any other returned types) render with a color dot; rows sorted by AB; derived footer correct.
- No `statSplits`/Savant dependency — data comes from the new `pitchLog` aggregation in `PlayersService`.

Open one PR: **"BUG-011 follow-up — Pitching tab: aggregate pitch-type splits from pitchLog."** Note it corrects the data-source assumption in the original BUG-011 prompt (statSplits returns zero rows for batters) and is **not** gated on Savant — it's a server-side aggregation of data the API already returns.
