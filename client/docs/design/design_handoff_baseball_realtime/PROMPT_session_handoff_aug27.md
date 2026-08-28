# Session Handoff — Aug 27, 2026

Summary of work completed this session. Two PROMPT files were executed plus several
bugs discovered and fixed during implementation.

---

## Executed: `PROMPT_player_statcast_states.md`

### Part A — Batter Statcast rows (Stats tab)

**Shipped.** All eight discipline + contact rows now wire to real data.

**Architecture:**
- New `statcast_batter_summary` columns (migration
  `1767520000000-add-batter-discipline-metrics.ts`): `pitchesSeen INT`, `battedBalls INT`,
  `chasePct FLOAT`, `whiffPct FLOAT`, `contactPct FLOAT`, `swingPct FLOAT`,
  `exitVeloAvg FLOAT`, `exitVeloMax FLOAT`, `hardHitPct FLOAT`, `barrelPct FLOAT`,
  `launchAngleAvg FLOAT`
- `statcast.service.ts` — `computeBatterDiscipline()` + `computeBatterContact()` compute
  metrics from raw Savant CSV rows on ingest; `getLeagueContext()` computes league averages
  + percentile ranks from all stored summaries (requires `LEAGUE_MIN_BATTERS = 30`
  ingested players before reporting)
- `statcast-summary.dto.ts` — new `BatterMetricsDto` (27 fields) added to
  `StatcastSummaryDto.batterMetrics`
- `useStatcast.ts` — `BatterMetrics` type + `batterMetrics` field on `StatcastSummary`
- `PlayerPage.tsx` — `scExtra()` / `scMphExtra()` helpers; `StatsTab` calls
  `useStatcast()` and maps `bm?.field ?? null` to each row

**Sample-size gates:** discipline rows need `pitchesSeen >= 100`; contact rows need
`battedBalls >= 25`. Below threshold returns null → shows `—` with "Statcast, not
available". Above threshold but no league context (< 30 batters ingested) returns value
only with no Δ or percentile bar — handled gracefully by `scExtra`.

**Chase %, Whiff % are inverted** (`higherIsBetter = false`) so the percentile bar reads
correctly.

### Part B — Today widget off-day state

**Shipped.** `PlayerPage.tsx` + `PlayerPage.css`:
- `isOffDay = todayGameId == null`
- Widget gets `.ph__today--off` (transparent bg, dashed border, no hover)
- "OFF DAY" eyebrow + "No game today" body + "Last played Aug 26 at CHC · 2-for-4" footer
- Watch live: `disabled={isOffDay}`, `title="No game today"`, `cursor: not-allowed`
- `players.service.ts` — `fetchLastPlayedGame()` calls MLB game log API when no game today
- New field `lastGame?: { date, opponent, hits, atBats } | null` on
  `BatterOverviewTodayDto` (both API and client types)

---

## Statcast ingest bugs fixed (discovered during Part A debug)

Two bugs were in the ingest pipeline from the start — both fixed this session:

### Bug 1 — Savant URL was fetching all batters, not a specific player

`batter_id=592450` in the URL is silently ignored by the Savant API. The old URL was
returning 25 000 rows of all-player season data. Metrics were computed across the entire
league and stored as a single player's row — wrong for everyone.

**Fix.** `SAVANT_CSV_URL` now uses:
```
&batters_lookup%5B%5D=${mlbId}&hfSea=${season}%7C
```
This is the correct Savant search form encoding for a single batter + season. Verified:
returns only rows where `batter === mlbId`.

All previously ingested rows have stale data (computed from all batters). A backfill
trigger in `getOrTriggerIngest()` re-ingests any row that has `pitchCount > 0` but
`pitchesSeen == null` — so existing rows correct themselves on next page visit.

### Bug 2 — `barrel` column does not exist in the Savant detail CSV

`r['barrel'] === '1'` was always false → `barrelPct` was always 0. The Savant
pitch-level CSV does not include a `barrel` column. The correct column is:

```
launch_speed_angle === '6'   // 6 = Barrel in Savant's speed/angle classification
```

Other `launch_speed_angle` values: 1=Weak, 2=Topped, 3=Under, 4=Flare/Burner,
5=Solid Contact, 6=Barrel.

---

## Executed: `PROMPT_leaders_sync.md`

All three action items shipped:

### BUG 1 — `throughDate` added

`LeagueLeadersDto` now has `throughDate?: string`. Service sets it to
`new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })` on every
cache miss. Subtitle now renders `"2026 Season · through Aug 27"`.

### BUG 2 — AL/NL filter now fetches correct league top 10

Old behavior: fetched MLB top 10, then client-filtered to AL/NL players — showed AL/NL
players *who happened to crack the MLB top 10*, re-ranked 1..N. Cards looked authoritative
and were wrong.

**Fix.** Per-league API requests:
- Controller accepts `?league=AL|NL` (anything else → `"all"`)
- Service passes `leagueId=103` (AL) or `leagueId=104` (NL) to the MLB stats API
- Cache key is `${season}:${league}` — three independent cache slots
- Client re-fetches on league change (`league` in `useEffect` deps)
- `LeaderCard` calls `ranked(cat.leaders, "all", asc)` — data arrives pre-scoped

### Design ahead — Innings added

`{ key: 'inningsPitched', label: 'Innings' }` added to `PITCHING_CATEGORIES` in the
service. `UNIT_MAP` already had `inningsPitched: "IP"` waiting for it.

---

## Outstanding / known state

- **League averages still null** for most player pages. `getLeagueContext()` requires
  `LEAGUE_MIN_BATTERS = 30` ingested players before reporting `lgXxx` values and percentile
  ranks. As players are visited their pages trigger ingests; once 30 are in the DB the
  league context starts populating. No proactive batch ingest exists — this fills in
  organically from page visits.

- **ScoutTimeline** (completed start of session): alternating rail colors (navy for top,
  rust for bottom), away pips navy, home pips rust, inning ticks between rail and home
  pips. `HalfInningBound[]` replaces the old `inningMarkers` / `awayColor` / `homeColor`
  props. `GamePage.tsx` computes `scoutHalfInnings` from `stableUpdates`.
