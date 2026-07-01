# Backend — API cleanup batch (4 PRs)

## ▶ RUNBOOK — read this first, then execute

**Where you are.** This is a **monorepo** containing both `client/` (the React frontend) and `api/` (the
backend service that ingests MLB data, maps it to domain types, and serves REST + socket.io). **All of
PROMPT-1's work happens in the `api/` workspace** — its ingest, mappers, DTOs, and socket serializers, plus
a regen of the shared generated client package. You should be working from the repo root or `api/`; do not
edit anything under `client/` for these PRs (the frontend halves are a separate prompt, PROMPT-4, that runs
in `client/`). This doc lives at `api/docs/design/` — the backend mirror of the existing
`client/docs/design/design_handoff_baseball_realtime/`.

**How to run this:**
1. Work the four sections **in order: §A, then §B, then §C, then §D.** They're independent, so order is
   for reviewability, not dependency.
2. **Open one PR per section** with the title given at the end of that section. **Stop after each PR for my
   review** — do not bundle multiple sections into one PR, and don't start the next section until I've
   reviewed the previous one.
3. **§D has a Step 0 gate.** Before writing any Splits wiring, do §D's Step 0 scope-confirm and **report the
   availability matrix back to me** (which split groups × timeframes the API can actually serve). Wait for
   my go-ahead before writing §D's code.
4. For any section that changes the wire/DTO schema, **regenerate and version-bump**
   `@bitslinger21/baseball-realtime-client` and say so in the PR — the frontend depends on it.
5. In each PR description, record the source paths / findings you confirmed, so the frontend follow-ups and
   the data audit can be updated at sign-off.

**Heads-up — three of these have a frontend half** (player Today widget, Upcoming cards, Splits tab) that
lives in the client repo and runs separately (PROMPT-4). Your job here is the **backend/data half**: get the
data correct and the client package regenerated. The screens light up after the frontend follow-ups.

**Scope guardrail.** This is a cleanup batch — surface/compute data that already exists. **Do NOT** build
the Statcast/Savant pitch-level ingest (the separate, deferred PR 6.5). Anything needing whiff% /
pitch-location / count-state / per-pitch detail is out of scope; where a feature is half-ungated (Upcoming
pitch-type: AVG/SLG yes, whiff% no), do **only** the ungated half.

---

You are working in the **`baseball-realtime` backend** (ingests MLB data, maps to domain types, serves REST + socket.io; generated client `@bitslinger21/baseball-realtime-client`). This is a **cleanup batch** — surface/compute data that already exists; **no new external provider, no Statcast/Savant**. Open **one PR per section (§A–§D)**; they're independent.

> **Hard exclusion:** do **not** build the Statcast/Savant pitch-level ingest (that's the separate, deferred PR 6.5). Anything needing whiff% / pitch-location / count-state / per-pitch detail is **out of scope** here. Where a feature is half-ungated (Upcoming pitch-type: AVG/SLG yes, whiff% no), do **only** the ungated half.

For each PR: regenerate + version-bump `@bitslinger21/baseball-realtime-client` if the wire/DTO schema changes, and call it out in the PR (the frontend depends on it).

---

## §A — Cross-feed sync: one source for line-score per-inning runs

**Bug.** The game view's **per-inning runs** come from **REST (polled ~60s)** while the **R (total runs)** comes from the **socket (live)**. After a scoring play the line score can **drift by up to ~60s** — the inning cells and the R total disagree. Same game state, two sources.

**Do.** Make the line score's per-inning runs and the R/H/E totals derive from **one source of truth** — the live socket feed — so they update together.
- Either push **per-inning run data on the socket** alongside the R/H/E totals, or have the client derive per-inning runs from the same play stream that drives R (don't keep a second ~60s REST poll feeding half the line score).
- Confirm a scoring play updates the inning cell and the R total **in the same frame** (no transient state where R increments but the inning cell lags).
- Keep H/E consistent with the same source.

**Acceptance.** Trigger (or replay) a scoring play: the inning's run cell and the R total change together, with no ~60s lag. Line score, scoring summary, and pitch-by-pitch reflect one consistent game state.

**PR title:** `Cross-feed sync — single source for line-score per-inning runs`

---

## §B — BUG-001: player ↔ active-game join (Overview "Today" widget)

**Bug.** The player Overview "Today" widget shows **"No current game data"** and a disabled **Watch live** even when the player is **currently at bat** in a live game. The player↔active-game link isn't joined.

**Do.** Provide, on the player endpoint (or a small companion lookup the player page can call), the player's **current game context** when one exists:
- the **active `providerGameId`** the player's team is in right now (live/in-progress),
- enough live state for the widget: the player's **current status** (at-bat / on-deck / in-the-hole / not-currently-up), and **today's at-bats line** (e.g. `1-for-3`) if available from data already on the game feed.
- When the player is **not** in a live game, return an explicit "no active game" (so the widget's empty state is a real answer, not a failed join).

This is a **join over data we already have** (the live game feeds + rosters/lineups — see the `BoxScoreDto` that already powers the lineups tray). Not a new ingest.

**Contract (suggested):**
```ts
// on the player response, or GET /player/:mlbId/today
todayGame?: {
  providerGameId: string;
  status: 'live' | 'final' | 'scheduled';
  playerState: 'atBat' | 'onDeck' | 'inTheHole' | 'idle';
  todayLine?: string;        // "1-for-3", derived from the game feed
} // omitted/null when the player has no game today
```

**Acceptance.** For a player at bat in a live game, the endpoint returns `todayGame` with `status:'live'` and the right `playerState` + `providerGameId`. For a player with no game today, it returns the explicit empty answer. No false "no game" while the player is actually playing.

**PR title:** `BUG-001 — player↔active-game join for Today widget`

---

## §C — Upcoming Statcast tier: AVG/SLG-by-pitch-type from `pitchLog` (ungated half only)

**Context.** The Upcoming tab's Statcast cards (pitcher arsenal + **batter × pitch-type**) currently render **mock** data because `MOCK_SECTION.statcast` was never flipped (labeled "sample", so disclosed). The **AVG/SLG/OPS by pitch type** half is **derivable now** without Statcast — by aggregating the **`pitchLog`** stat type server-side (the **same pattern already shipped in PR 6.6** for the Pitching tab's pitch-type card). **Whiff% by pitch type is NOT** derivable this way (needs Statcast) — leave it out / labeled.

**Do.**
- Reuse the **PR 6.6 `pitchLog` aggregation** to produce **per-pitch-type AVG / SLG / OPS (+ AB)** for the batter, exposed for the Upcoming tab's batter×pitch-type card.
- For the **pitcher arsenal** card: supply whatever is available **without Statcast** (e.g. pitch-type usage/mix if the MLB feed carries it; otherwise leave the arsenal card labeled and out of scope — confirm in Step 0 below what the non-Statcast feed actually exposes for a pitcher's mix).
- **Do not** fabricate or default whiff% / velocity / 9-zone location — those stay labeled "sample"/unavailable until PR 6.5.

**Step 0 (verify):** confirm the `pitchLog` aggregation yields non-empty per-pitch-type slash rows for a **batter** `:mlbId` (PR 6.6 proved this for the Pitching tab — reuse it), and check whether the pitcher's **pitch-type usage** is available from any non-Statcast field. Report findings in the PR.

**Acceptance.** The Upcoming batter×pitch-type card shows **real** AVG/SLG/OPS per pitch type for the given batter (different batters → different tables); whiff% (and any unavailable pitcher-arsenal metric) remains explicitly labeled, not faked. The frontend flips `MOCK_SECTION.statcast` for the wired card (FE prompt §3).

**PR title:** `Upcoming — wire AVG/SLG-by-pitch-type from pitchLog (whiff% stays gated)`

---

## §D — BUG-014: Splits tab — real per-player splits

**Bug.** `SplitsTab()` takes no props and makes no API calls — it renders the `SPLIT_TABLES` **mock constant**; switching **2026 / Career / Last-30d** changes only the **caption**. Same fabricated 6-table dataset for **every player**. (Layout shipped in PR 4 against the mock; data was never wired.)

The six split groups: **handedness · venue (home/away) · day-night · baserunners (men on/RISP/empty) · count · pitch-type**. Each across **{2026, Career, Last-30d}**.

**Step 0 — scope-confirm FIRST (this gates the rest of the PR).** For each of the 6 groups × 3 timeframes, determine what the **MLB Stats API can actually return** for a batter `:mlbId` (the `statSplits` / `sitCodes` split endpoint, season vs career vs lastXDays). Report a matrix: **available now** vs **needs Statcast (→ PR 6.5)** vs **not available at all**. Known facts to confirm against the live API:
- handedness, venue, day-night, baserunners/RISP, count splits are standard MLB split codes → **expected available**.
- **pitch-type splits via `splits` group=`pitchType` return ZERO rows for batters** (documented) — the slash version is derivable from **`pitchLog` aggregation** instead (PR 6.6 / §C pattern); **whiff% by pitch type needs Statcast** (→ PR 6.5).

**Do (for the groups/timeframes Step 0 says are available):**
- Wire `SplitsTab` to a real per-`:mlbId` splits source, keyed by **timeframe** so 2026 / Career / Last-30d each **refetch** real data (not a relabeled constant).
- For **pitch-type**, source the slash version from `pitchLog` (reuse §C / PR 6.6).
- For any group/timeframe the API **can't** serve (or that's Statcast-gated), return an explicit "not available" so the frontend can **gate/label** it — never fabricate.
- Include the `vs League` ±delta only where the league baseline is real.

**Contract (suggested):**
```ts
// GET /player/:mlbId/splits?timeframe=2026|career|last30
splits: Array<{
  group: 'handedness'|'venue'|'dayNight'|'baserunners'|'count'|'pitchType';
  available: boolean;            // false → frontend labels "not available"
  rows: Array<{ label: string; g?:number; ab:number; h:number; hr:number; rbi:number; bb:number; k:number; avg:number; obp:number; slg:number; ops:number; vsLeague?: number }>;
}>
```

**Acceptance.** Two different players show **different** splits; switching timeframe **refetches** and changes the numbers (not just the caption); every rendered table is real; unavailable groups/timeframes are flagged for the frontend to label. No `SPLIT_TABLES` mock reaches the user.

**PR title:** `BUG-014 — wire real per-player Splits (gate Statcast-only groups)`

---

## Batch-wide must-not
- No new external provider; no Statcast/Savant ingest (that's PR 6.5).
- Never default/fabricate a missing value — return an explicit "unavailable" so the frontend gates/labels it.
- Don't change unrelated mappers or DTOs; each section is additive/corrective to its own surface.
- Regenerate the client package per section that changes the schema; note it in the PR.

Record confirmed source paths / Step-0 matrices in each PR description so the frontend (and the provenance audit) can be updated at sign-off.
