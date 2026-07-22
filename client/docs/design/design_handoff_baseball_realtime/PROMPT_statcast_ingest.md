# Build — Statcast/Savant ingest + light up the gated surfaces (PR 6.5 family)

You are working in the **`baseball-realtime` backend + client**. This unblocks the surfaces parked
behind pitch-level data (see `statcast-savant-brief.md` for full background). **Licensing note:**
this deployment is **personal/private use only, not a public-facing product** — the ToS caveat in
the brief is lower-stakes here, but stay within Savant's rate limits regardless (batch job, cached,
not hammering the endpoint per-request).

> Sequencing (build in this order — one ingest feeds all four):
> 1. Backend ingest + aggregation pipeline
> 2. Rich Pitching tab (`PitchingTabFull`) — biggest payoff, exercises every field
> 3. Overview hot-zones heat map — same zone source, near-zero marginal cost
> 4. Upcoming tab arsenal + whiff% — flip `MOCK_SECTION.statcast`
> 5. Pitching filter rail (In-zone/Outside-zone) — falls out of #2 for free

---

## Step 0 — Ingest (the real backend project)

Source: Baseball Savant's Statcast Search CSV endpoint (`baseballsavant.mlb.com/statcast_search`,
CSV export) — same data `pybaseball` wraps. Build:

1. **Scheduled batch job** — pull per-player, per-season pitch-level rows (not live; this is a
   season-reference dataset). Respect the ~25,000-row query cap — page/chunk by player or date range.
2. **Cache + per-player aggregation** — precompute what the surfaces below need so pages aren't
   querying Savant live: pitch-type mix %, whiff% by pitch type, zone-level SLG (9-zone grid), 9-zone
   pitch-mix by pitcher, count-state tendencies.
3. **2026 ABS coordinate transform** — `plate_z`'s reference moved from front-of-plate (≤2025) to
   mid-plate (2026+). Apply the transform in the ingest so every downstream zone/heat-map plot is
   correct without each consumer re-deriving it.
4. **Fallback:** a player with too few tracked pitches (rookie / recent call-up) should yield a
   real "sparse data" signal, not a zero-filled fake grid — needed for step 4/F-001 #1.

## Step 1 — Rich Pitching tab (`PitchingTabFull` in `holistic/player.jsx`)

Restore the five-card tab, wired to real per-`:mlbId` data:
- **Pitch-mix donut** (usage % per pitch type) — from the new ingest, shares must sum to 100%.
- **Performance vs pitch type** — merge with the ALREADY-REAL lean-tab data (AVG/SLG/OPS from
  `pitchLog`, PR 6.6) and add the gated **whiff%** column from Statcast. Don't replace the real
  cells with a new mock source — same AB/AVG/SLG numbers, whiff% is the only net-new column.
  **Merge, don't swap** — the lean tab's real cards must survive inside the restored rich tab.
- **Location heat map** ("Damage by location", SLG by 9-zone) — from the ABS-corrected zone data.
- **Count-attack grid** — pitch/count combos from the count-state field.
- **By-pitcher-handedness** — keep the real handedness slash (already wired); add back Zone%/FPS%/
  put-away now that zone data exists.
- De-mock every hardcoded literal ("314 pitches seen", the fixed Peña zone array) — everything
  per-player, derived.

## Step 2 — Overview hot-zones heat map

Read the **same** zone-SLG source as Step 1's location card (single-source discipline — they must
never drift). Replace the "coming with pitch-level data" placeholder (BUG-013) with the real grid.

## Step 3 — Upcoming tab (`player-upcoming.jsx`)

- **Pitcher arsenal card** (usage/velo/9-zone) — flip `MOCK_SECTION.statcast` off, bind real data.
- **Batter × pitch-type whiff%** — AVG/SLG/OPS are already real (PR 9.5b via `pitchLog`); add the
  whiff% column from the new ingest. Remove the "sample" label only from what's now real.
- **F-001 #1** — design the sparse-rookie-arsenal empty state alongside this (a player with few
  tracked pitches shows an honest "limited pitch data — N pitches" state, not a broken-looking mock).

## Step 4 — Pitching filter rail

Once Step 1's location data exists, wire the **In-zone / Outside-zone** filter chips to actually
filter the pitch-type table by zone membership. No separate design — falls out of Step 1.

## Must-not-break
- Numerals mono + `tabular-nums` everywhere, as always.
- Don't touch the other player tabs, the hero, or non-Statcast surfaces.
- Don't fabricate whiff%/location for a player with insufficient tracked pitches — use the sparse
  state (F-001 #1), never a zero-filled fake grid.
- Rich Pitching tab and hot-zones **must read the same zone source** — no two aggregation paths.

## Acceptance
- Two different batters show different pitch-mix, whiff%, and location heat maps on the Pitching tab.
- Overview hot-zones shows the same real zone-SLG data as the Pitching tab's location card.
- Upcoming's pitcher-arsenal and batter-whiff% cards drop their "sample" label and show real,
  per-player data; F-001 #1's sparse state renders for a thin-data rookie instead of a fabricated grid.
- Pitching filter rail's In-zone/Outside-zone chips actually filter the table.
- Ingest is a scheduled/cached batch job, not per-request scraping; ABS coordinate transform applied
  before any zone plot.

Open PRs per step (4–5 PRs), titled **"PR 6.5.N — Statcast: <surface>"**. Note in each that this
deployment is personal/private use, so the earlier ToS blocker is not gating the personal build —
but keep the ingest well-behaved (batch, cached, rate-respecting) regardless.
