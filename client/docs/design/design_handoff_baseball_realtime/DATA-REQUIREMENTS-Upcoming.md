# Upcoming Tab — Data Requirements & Availability Audit

**Purpose:** This is the complete list of data the **Player · Upcoming tab** (handoff **PR 9**, design source `holistic/player-upcoming.jsx`) consumes. The design is signed off and currently runs on a **mock dataset**; PR 9 is gated on this data existing.

**Your task (Claude Code):** For **every field below**, determine its status in this codebase and report back using the verdict codes:

- **`A` — Available now** in the generated API client (`@bitslinger21/baseball-realtime-client`) or an existing endpoint we already call.
- **`X` — Exists server-side but not exposed** to the client (needs a client method / hydrate param / field added to a response).
- **`N` — Not available** anywhere — needs a new endpoint.
- **`S` — Needs Statcast ingestion** (Baseball Savant or equivalent) — not in the standard MLB Stats API.
- **`R` — Reuse** — already wired elsewhere in this app (point to where).

Please answer the **5 key questions** at the bottom after the audit.

---

## How the tab is structured (context)

The player's **next 3 games**, each against its **probable starting pitcher**. A game-selector rail picks a game; a deep-dive shows how the batter projects against that starter. Sections: **Head-to-head**, **What he throws** (arsenal), **The read** (derived verdict), **Arsenal vs your bat** (his pitch mix × the batter's pitch-type performance), **Matchup splits**, **Location** (two heat maps), **Recent meetings**.

The data divides into **per-game/matchup data** (groups 1–5) and **batter reference data** (group 6, player-level, reused across all 3 games).

---

## Group 1 — Schedule lookahead  ·  powers: game rail, deep-dive header

The player's team's **next 3 scheduled games** from today forward.

| Field | Type | Notes | Status |
|---|---|---|---|
| `gameId` / `providerGameId` | string | for linking to the game view | ☐ |
| `date` | date | game date | ☐ |
| `startTime` | datetime | local start (rendered "7:10p ET") | ☐ |
| `home` | boolean | is the player's team home? (drives "vs" / "@") | ☐ |
| `opponent.teamId` | number | opponent — we already render team logos by id | ☐ |
| `venue` | string | ballpark name | ☐ |

**Q:** Can we query a team's upcoming N games (date-range schedule)? Most MLB schedule endpoints support this — confirm it's reachable via the client.

---

## Group 2 — Probable starters  ·  powers: pitcher identity on every card, the join key for groups 3 & 5

The **probable starting pitcher** for each upcoming game.

| Field | Type | Notes | Status |
|---|---|---|---|
| `pitcher.playerId` (mlbId) | number | identity + headshot | ☐ |
| `pitcher.fullName` | string | | ☐ |
| `pitcher.throws` | `'L' \| 'R'` | hand — drives which handedness split shows | ☐ |
| `pitcher.jerseyNumber` | number | optional | ☐ |
| `pitcher.isRookie` | boolean | shows a ROOKIE pill | ☐ |
| `pitcher.season.{wins,losses,era,whip,k9}` | numbers | season line on the card | ☐ |

**⚠️ Known caveat to confirm:** probable pitchers are typically only announced **~1 day ahead**, so games 2 and 3 may have **no probable yet**. **Q:** How far ahead are probables populated in our data? (This determines whether we need a "Probable TBD" state for the later games — see Edge States.)

---

## Group 3 — Pitcher arsenal  ·  powers: "What he throws", Location heat (his side), left column of "Arsenal vs your bat"

Per-pitcher **pitch mix** for the season. Likely **Statcast**.

| Field | Type | Notes | Status |
|---|---|---|---|
| `arsenal[].pitchType` | string | e.g. Four-seam, Slider, Splitter, Sweeper | ☐ |
| `arsenal[].usagePct` | number | share of pitches (sums to ~100) | ☐ |
| `arsenal[].avgVelo` | number | mph | ☐ |
| `pitcherLocation[9]` | number[9] | pitch-frequency by 3×3 zone (the heat map) | ☐ |

**Q:** Do we have **per-pitcher pitch-type usage + velocity** anywhere (provider feed, Statcast table, cached leaderboard)? The 9-zone location grid is the softest requirement — if unavailable, that one heat map can be deferred without breaking the section.

---

## Group 4 — Batter × pitch-type performance  ·  powers: right column of "Arsenal vs your bat" (the KEY THREAT flag)

How the **batter** performs against each **pitch type**. **This is the SAME data PR 6.5 (Pitching tab) needs — treat as one dependency.** Likely **Statcast**.

| Field | Type | Notes | Status |
|---|---|---|---|
| `batterVsPitchType[type].avg` | string/number | per pitch type | ☐ |
| `batterVsPitchType[type].slg` | string/number | drives the KEY THREAT auto-flag (SLG < .250) | ☐ |
| `batterVsPitchType[type].whiffPct` | number | | ☐ |

Pitch types needed (union of what pitchers throw): Four-seam, Sinker, Cutter, Slider, Sweeper, Curveball, Splitter, Changeup.

**Q:** Is batter performance **broken out by pitch type** available? If PR 6.5 already sourced it, this is `R` (reuse).

---

## Group 5 — Batter vs pitcher head-to-head  ·  powers: Head-to-head card, rail verdict pill, Recent meetings

The batter's career line **against this specific pitcher**, plus a recent plate-appearance log. **Must support a null / "never faced" result** — that drives the designed "first meeting" empty state.

| Field | Type | Notes | Status |
|---|---|---|---|
| `h2h.pa,ab,h,hr,rbi,bb,k` | numbers | career totals vs this pitcher | ☐ |
| `h2h.avg,obp,slg,ops` | strings | **derive from the totals — do not source separately** | ☐ |
| `h2h.lastFaced` | date | "last faced Aug 2024" | ☐ |
| `h2h.log[]` | array | recent meetings: `{date, result, detail}` | ☐ |
| **null path** | — | endpoint must cleanly return "no history" (not an error) | ☐ |

**Q:** Is there a **batter-vs-pitcher** split (career line)? MLB Stats API typically exposes a `vsPlayer` stat split. The **per-PA log** is the harder half — confirm separately (it may require play-by-play aggregation). The line alone is enough to ship the card; the log can degrade gracefully.

---

## Group 6 — Batter reference splits  ·  powers: Matchup splits card

Player-level, reused across all 3 games.

| Field | Type | Notes | Status |
|---|---|---|---|
| `vsRHP` / `vsLHP` slash + OPS + vs-league delta | — | handedness split | ☐ |
| `vsFastball / vsBreaking / vsOffspeed` slash + OPS + delta | — | pitch-class split | ☐ |

**Q:** These already exist on the **Splits tab** (PR 4). Confirm they're reusable here (`R`).

---

## Derived (NOT fetched) — for awareness

- **`lean`** (`batter` / `pitcher` / `even`) and the **`read`** sentence are **derived/templated**, not API fields. Recommended: compute a lean score from the platoon split (group 6) + arsenal-vs-weakness (groups 3×4) + H2H sample weight (group 5), and template the prose with a confidence floor for tiny samples. No backend work — but confirm we're OK generating this client-side vs. authoring editorially.
- **`pitcher.attack`** one-liner ("works the bottom third…") is currently authored copy — same decision.

---

## Edge / empty states the real data introduces (design gaps to flag)

The mock always has 3 fully-populated games. Real data won't. Three states are **not yet designed** — flag if you hit them:

1. **No upcoming games** (off-day / offseason / end of season).
2. **Probable TBD** — a scheduled game whose starter isn't announced yet (very likely for games 2–3; see Group 2).
3. **Sparse Statcast** — a rookie/call-up with little or no arsenal / pitch-type history.

The **"first meeting"** (Group 5 null) and the **"Sample data · live feed pending"** flag (shown while any of groups 1–5 are still mock) are already designed.

---

## Please report back in this format

1. **Per-group verdict table** — each field above marked `A / X / N / S / R`, with a one-line note (endpoint name, client method, or "needs Savant ingest").
2. **Answer the key question in each group** (6 questions, bolded above).
3. **The single biggest gating answer:** _Do we already have Statcast pitch-arsenal (Group 3) and batter-by-pitch-type (Group 4), or do those need a Baseball Savant ingestion?_ — this sizes the heavy half (PR 9b + PR 6.5).
4. **Probables horizon:** how many games ahead are probable starters populated? (Determines the "Probable TBD" state need.)
5. **Recommended split:** confirm or adjust the proposed **PR 9a** (MLB-data tier: groups 1, 2, 5, 6) vs **PR 9b** (Statcast tier: groups 3, 4 — joint with PR 6.5).
