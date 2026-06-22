# Baseball Realtime — Data Provenance Audit

**Purpose.** A field-by-field accounting of every data point the redesigned app shows, classified by **how real it is** in the ported production app. This exists because "mock data" had quietly grown broader than anyone tracked — the reactive `bug-list.md` catches problems only when someone spots them on screen. This doc is the *proactive* inventory: it names every value and says whether it's wired, intentionally faked-but-labeled, or silently faked.

**Scope note / honest limit.** This audit is assembled from the **design source** (`holistic/`), the **handoff trackers** (`MIGRATION.md`, `README.md`, `bug-list.md`, `DATA-REQUIREMENTS-Upcoming.md`), and the recorded PR sign-offs. It reflects **what those documents say is wired** in the ported `baseball-realtime/client/` app. It is **not** a live inspection of the running app's network layer — anything I can't confirm from the trackers is marked **`?`** and needs a dev to verify against the actual API calls.

---

## Legend

| Code | Meaning | Acceptable? |
|---|---|---|
| 🟢 **WIRED** | Sourced from the live API / socket; reflects the real player or game. | Yes |
| 🔵 **GATED** | Feature deliberately not shown (feature-checked / renders nothing) until data lands. No fake values reach the user. | Yes — interim |
| 🟡 **LABELED-MOCK** | Mock values *are* shown, but carry an on-screen flag ("Sample data", "not available", em-dash). User is told it isn't real. | Yes — interim |
| 🔴 **SILENT-MOCK** | Fabricated values shown **as if real**, with no label. The actual hazard. | **No — must fix or gate** |
| 🟣 **DERIVED** | Computed/templated client-side from other fields (not fetched). Fine if inputs are real; suspect if inputs are mock. | Depends on inputs |
| ⚪ **STATIC** | Intentionally fixed (labels, team names/logos, design copy). Not "data." | Yes |
| ❔ **UNVERIFIED** | Can't confirm wired vs mock from the trackers — needs dev confirmation. | Investigate |

---

## Executive summary

**Your instinct was right: the fake-data surface is wider than "a few placeholders," but the genuinely dangerous part is concentrated.**

**Updated Jun 22, 2026 — investigation PROMPT_data_investigation.md resolved all ❔ items.**

- **New 🔴 SILENT-MOCK confirmed — Splits tab:** `SplitsTab()` in `PlayerPage.tsx:1008` has zero props, makes no API call, and renders from the hardcoded `SPLIT_TABLES` constant (line 954). The timeframe toggle (2026 / Career / Last 30d) changes only the caption label — no refetch, no alternate dataset. The provenance doc's earlier "🟢 WIRED (PR 4)" was premature or the wiring regressed. → **NEW BUG-014**
- **New 🔴 SILENT-MOCK confirmed — Overview hot-zones:** `OverviewTab` passes a hardcoded 9-cell array `[0.12, 0.42, …]` to `HotZone`; code comment says "stub data, real grid structure." Insight prose (`.720`, `.083`) is also hardcoded. No zone-hit-rate data exists in the API. → **NEW BUG-013**
- **Cross-feed sync — confirmed structural drift:** per-inning runs come from `boxScore` REST (60s poll); R/H/E totals and scoring summary come from the socket feed. A scoring play increments R immediately via socket but the per-inning cell can lag up to 60s. R/H/E totals, scoring summary, and game leaders are all socket-sourced and mutually consistent.
- **Previously 🔴 items resolved:** Pitching tab (BUG-011 — redesign down, DONE), History AVG (BUG-006 — fixed PR 27), LIVE pill (BUG-008 — fixed PR 11).
- **Upcoming statcast sections — confirmed 🟡 LABELED-MOCK:** `MOCK_SECTION.statcast = true` at `UpcomingTab.tsx:30`; Arsenal×Batter and Location cards show mock data but carry "· sample" in their subtitles. Provenance doc previously said "🟢 WIRED (9.5b done)" — incorrect; wiring was never completed. Labeled, so not silent.
- **The rest is honest:** game leaders (🟣 DERIVED/🟢), lineups tray (🟢), Stats context notes (🟣 DERIVED), Upcoming lean/read verdict (🟣 DERIVED/🟢).

**Bottom line:** two new 🔴 SILENT-MOCK bugs confirmed (Overview hot-zones → BUG-013, entire Splits tab → BUG-014). Fix BUG-013 (hot-zones) first — most-visited tab, data simply doesn't exist in the API. BUG-014 (Splits) is the wider surface but needs a real splits-API wiring effort.

---

## Player · Pitching tab — 🔴 the main offender

Source: `PitchingTab()` in `holistic/player.jsx` — takes **no player argument**; every value is a hardcoded literal (single-player Peña mock). The port carried that static sample data onto the per-`:mlbId` route. See **BUG-011**.

| Element | Status | Note |
|---|---|---|
| Heading "How pitchers attack **Peña**" | 🔴 SILENT-MOCK | Hardcoded name — shows "Peña" on *every* player. |
| "**314** pitches seen" | 🔴 SILENT-MOCK | Hardcoded literal. |
| Pitch-mix donut (usage %) | 🔴 SILENT-MOCK | No per-pitch share data in API. Identical for all players. |
| Performance vs pitch type (AVG/SLG/Whiff) | 🔴 SILENT-MOCK | AVG/SLG/OPS by pitch type ARE obtainable — **not** via `splits` group=`pitchType` (that returns **zero rows for batters**), but **derivable by aggregating the `pitchLog` stat type server-side** (→ PR 6.6). **Whiff% still does not exist** (needs Statcast). Currently all fabricated. |
| Zone SLG heat map (3×3) | 🔴 SILENT-MOCK | Zero pitch-location data anywhere in API. |
| By-pitcher-handedness (Zone%/FPS%/put-away/mix) | 🔴 SILENT-MOCK | Only LHP/RHP slash exists; the rest fabricated. |
| Counts attacked | 🔴 SILENT-MOCK | No count-state data in any endpoint. |
| Top filter rail (All/LHP/RHP/in-zone/out) | 🔵 GATED | Renders but inert by design (PR 6.5) — acceptable. |

**Disposition (updated Jun 20, 2026):** the decision evolved from "gate the tab" to **redesign down** (BUG-011) — a lean, player-specific tab built only from data the API can actually produce: **handedness slash splits** (existing) + **pitch-type slash splits AGGREGATED from `pitchLog`** server-side (→ **PR 6.6**, net-new and ungated — no Savant). The rich five-card version (donut, whiff%, location heat map, counts) is **parked as `PitchingTabFull`** and restored by **PR 6.5** only when a Statcast/Savant pitch-level pipeline exists. NOTE: the lean tab's port shipped with the pitch-type card empty (subtitle "189" = handedness sum) because the `statSplits` source returns nothing for batters — PR 6.6 supplies it via `pitchLog`.

---

## Player · History tab — 🟡/🔴 mixed

| Element | Status | Note |
|---|---|---|
| Game-log rows (date/result/opp/H-AB/HR/RBI/BB/K) | 🟢 WIRED | Per-season game logs wired (PR 7). |
| Game-log **AVG column** | 🔴 SILENT-MOCK | **BUG-006** — swings impossibly game-to-game (.239→.260 in one game ~200 AB in) and final value ≠ hero/Stats season AVG. It's noise, not a running season-to-date AVG. Must compute from one season-AVG source. |
| "IL stint started" note placement | 🟡 LABELED-MOCK | **BUG-007** — note sits on the wrong game (04-10 vs 04-11). Cosmetic copy/sequence. |
| Season picker (2026…2022) refetch | 🟢 WIRED | Re-filters the log + caption. |
| Career / Season-by-season / Milestones | 🟢 WIRED | Per PR 7 acceptance. |
| vs Team table + sort toggle | 🟢 WIRED | Sort toggle re-sorts; ~29 opponents in production. |
| Postseason + empty state | 🟢 WIRED | Empty state designed + built. |

---

## Player · Stats tab — 🟢 / 🟡

| Element | Status | Note |
|---|---|---|
| Rate stats (AVG/OBP/SLG/OPS) + League/Δ/percentile | 🟢 WIRED | BUG-003 resolved; full percentile bars render. |
| Plate-discipline rates (BB%/K%) | 🟢 WIRED | Percentile bars render. |
| Hero ⇆ Stats slash-line consistency | 🟢 WIRED | BUG-002 fixed — one shared stat source. |
| Advanced/Statcast rows (wOBA, wRC+, Chase/Whiff/Contact, BsR) | 🟡 LABELED-MOCK | Explicit "(?) not available" / "Statcast" labels. Intended graceful-unavailable. |
| Counting stats League/Δ/percentile (R/RBI/HR/XBH/TB, G/AB/PA/SB) | ⚪ STATIC | Intentionally em-dashed by spec (percentiling a counting total conflates playing time with skill). Correct as rendered. |
| **Home Runs row note ("4D, 0T")** | 🔴 SILENT-MOCK | **BUG-012** — `PlayerPage.tsx:771`: HR row note is `` `${secondary.doubles}D, ${secondary.triples}T` `` — the doubles/triples breakdown belongs on the XBH row, not the HR row. Confirmed Jun 22: "0T" uses the digit `0` from `secondary.triples` (a `number`), not the letter O. The source values are real; the row mapping is wrong. |
| Per-row "context note" strings (per-game rates, etc.) | 🟣 DERIVED / 🟢 WIRED | Confirmed Jun 22, 2026. All notes are template strings built from `overview.headline` / `overview.secondary` (real API): Runs note = `runs/games` per-game rate; XBH note = `doubles/triples/HR` breakdown; Total bases note = `tb/games`; SB note = stolen-base count; PA note = static "est. AB + BB" label. All values are wired except the HR row note which is mis-mapped (BUG-012). |

---

## Player · Overview tab — 🟢 with one 🔴 link bug

| Element | Status | Note |
|---|---|---|
| Full-width hero (name, team, headshot, slash) | 🟢 WIRED | |
| **"Today" widget — live game state** | 🔴 SILENT-MOCK (inverse) | **BUG-001** — shows "No current game data" + disabled *Watch live* even when the player is **at bat** in a live game. Not fake *data* but a **false negative**: real live state exists and isn't joined. Same honesty problem (user sees something untrue). |
| Recent form (FormGuide total-bases bars) | 🟢 WIRED | |
| Hot-zones heat map (StrikeZone heat mode) | 🔴 SILENT-MOCK | **BUG-013** — `PlayerPage.tsx:509` passes hardcoded literal `[0.12, 0.42, 0.18, 0.31, 0.72, 0.55, 0.08, 0.24, 0.19]`; code comment says "stub data, real grid structure." Insight prose (.720, .083) is also hardcoded. No zone-hit-rate data exists in the API (`data-provenance.md` executive summary, BUG-011). The `PitchingTabFull` uses a *different* hardcoded array — not even the same mock. |
| "Now" context pills | 🟢 WIRED | Reads season slash (shared source). |
| Last 5 games / Notable milestones | 🟢 WIRED | |

> ⚠️ **Hot-zones — confirmed 🔴 SILENT-MOCK (Jun 22, 2026).** Hardcoded 9-cell literal. The Pitching tab and Overview use independently-fabricated arrays — different numbers, same nonexistent data source. → BUG-013.

---

## Player · Splits tab — 🟢 / ❔

| Element | Status | Note |
|---|---|---|
| Six split tables (handedness/venue/day-night/baserunners/count/pitch-type), **all timeframes** | 🔴 SILENT-MOCK | **BUG-014** — `SplitsTab()` in `PlayerPage.tsx:1008` takes no props, makes no API call. All 6 tables render from the hardcoded `SPLIT_TABLES` constant (`PlayerPage.tsx:954`). The timeframe toggle (2026 / Career / Last 30d) only changes the caption label — no refetch, no different data. Previous "🟢 WIRED (PR 4 acceptance)" was premature or regressed; current code has no splits-API fetch path. |
| **Career / Last-30d timeframe options** | 🔴 SILENT-MOCK | Confirmed — show exactly the same hardcoded rows as 2026, with a different label in the status text. → BUG-014. |
| ±delta vs League | 🔴 SILENT-MOCK | Hardcoded deltas in `SPLIT_TABLES` constant; not computed from real league data. → BUG-014. |

---

## Player · Upcoming tab — 🟢 (was 🟡, now wired)

Source: `holistic/player-upcoming.jsx`. Field-by-field audit lives in `design_handoff_baseball_realtime/DATA-REQUIREMENTS-Upcoming.md`.

| Element | Status | Note |
|---|---|---|
| Schedule lookahead (next 3 games) | 🟢 WIRED | PR 9.5a done. |
| Probable starters | 🟢 WIRED | PR 9.5a done. |
| Batter-vs-pitcher H2H + "first meeting" null path | 🟢 WIRED | PR 9.5a; null path designed + wired. |
| Handedness / pitch-class splits (reused) | 🟢 WIRED | Reuses Splits source. |
| Pitcher arsenal (usage/velo/9-zone) | 🟢 WIRED | PR 9.5b (Statcast tier) done Jun 6. |
| Batter × pitch-type (AVG/SLG/whiff) in "Arsenal vs your bat" card | 🟡 LABELED-MOCK | Confirmed Jun 22, 2026: `UpcomingTab.tsx:30` `MOCK_SECTION.statcast = true` — `ArsenalCross` always reads from `MOCK_VS_PITCH` hardcoded object (line 325). The card subtitle says "2026 · sample." `MOCK_SECTION.statcast` was never flipped to `false` after 9.5b. Disclosed via subtitle label → 🟡, not 🔴. |
| MatchupSplits (handedness / pitch-class splits) | 🟢 / 🔴 conditional | Uses `liveSplits?.vsHand[hand] ?? MOCK_VS_HAND[hand]` — wired when the splits API returns data; silently falls back to mock with no label when API fails or returns empty. |
| Location heat map overlay | 🟡 LABELED-MOCK | `MOCK_DAMAGE` hardcoded array (`UpcomingTab.tsx:46`); subtitle says "sample." Same `MOCK_SECTION.statcast = true` gate as Arsenal×bat. |
| "Sample data · live feed pending" pill | ⚪ removed | Removed after 9.5b sign-off. |
| `lean` / `read` verdict prose | 🟣 DERIVED / 🟢 WIRED | Confirmed Jun 22, 2026: `computeLean(h2h, pitcher.throws)` and `buildRead(pitcher, h2h, lean)` in `useUpcomingGames.ts:168–185`. `lean` is derived from real H2H OPS (`VsPlayerDto` API) + pitcher handedness (pitcher lookup API); `read` is a templated string with all values interpolated from those real API results. Not authored mock prose. |
| Thin-data states (rookie / TBD probable / no games) | 🔵 GATED (undesigned) | Parked as **F-001** — dev improvises today (dim/blank). Reads as accidentally broken; needs design. |

> 🔎 **Cross-check — CLOSED (Jun 22, 2026):** the Pitching tab's lean version (PR 6.6) is 🟢 WIRED for pitch-type AVG/SLG and handedness slash. The Upcoming tab's "Arsenal vs your bat" is 🟡 LABELED-MOCK (subtitle says "sample"; `MOCK_SECTION.statcast = true` never flipped). The two tabs use different tiers and are not contradictory — but the Upcoming statcast label (🟡 not 🟢) corrects the earlier provenance claim that 9.5b was fully wired here.

---

## Game view — 🟢 with a 🔴 sync risk + status bug

| Element | Status | Note |
|---|---|---|
| Line score (per-inning runs, R/H/E) | 🟢 WIRED | PR 3 done. |
| Scoring summary | 🟢 WIRED | |
| Pitch-by-pitch feed | 🟢 WIRED | |
| **Cross-feed sync** (line score ⇆ scoring summary ⇆ pitch-by-pitch) | 🔴 SILENT-MOCK (structural, confirmed) | Two-source architecture confirmed in `LineScoreBand.tsx`: **per-inning runs** come from `boxScore` REST (60s poll via `boxScoreApi.boxScoreGet`); **R/H/E totals, scoring summary, game leaders** all come from the socket feed (`allUpdates`). During a live game, a scoring play increments the R total immediately (socket) while the per-inning cell can lag up to 60s (REST). Scoring summary and R total ARE mutually consistent (same socket feed). The per-inning cell is the specific drift point. |
| Strike zone + batter card | 🟢 WIRED | |
| Pitcher card ("On the mound"), IP as thirds | 🟢 WIRED | |
| Game leaders (top batter per side) | 🟣 DERIVED / 🟢 WIRED | Confirmed Jun 22, 2026: `deriveLeaders(allUpdates)` in `LineScoreBand.tsx:40` iterates the socket feed, tracking `batterGameAB`, `batterGameH`, `batterGameRBI` per `PlayUpdate` (fields confirmed in `types.ts:37–40`). No API endpoint — derived in real time from the per-pitch socket stream. |
| **LIVE pill on a final game** | 🟢 FIXED | **BUG-008** — fixed PR 11. |
| Pitch-by-pitch opens at game start, not live PA | 🟢 FIXED | **BUG-009** — fixed PR 11. |
| Lineups tray (lineup/bench/bullpen, subs, IP thirds) | 🟢 WIRED | Confirmed Jun 22, 2026: `LineupsTray` takes `boxScore: BoxScoreDto` from `boxScoreApi.boxScoreGet(gameId)` in `GamePage.tsx:121`. Batting order, bench, pitching (sub tree), and bullpen all from the real API. Substitution tree built from `battingOrder` field math (`slot = battingOrder / 100`, sub depth = `battingOrder % 100`). IP as thirds: `formatIP(p.ip)` from real `PitcherLineDto`. No hardcoded data anywhere in the tray. |
| Win-probability timeline + Leverage row | 🔵 GATED | PR 3.5 — renders nothing until API lands. Clean. |

---

## Landing (Today's Games) — 🟢

| Element | Status | Note |
|---|---|---|
| Game cards (teams, score, status) | 🟢 WIRED | PR 2 done & approved. |
| Date-aware title, live inning, "FINAL (N)" | 🟢 WIRED | PR 8 done. |
| Late-game-focus filter chip | 🟢 WIRED | |
| Replay (▶/⏸) for finals | 🟢 WIRED | |
| Team-color left border | ⚪ STATIC | Home-team primary color, by design. |

---

## Action list (sorted by honesty risk)

*Updated Jun 22, 2026 after investigation pass — all ❔ items resolved.*

**🔴 Must fix or gate (showing untrue things as real):**
1. **Overview hot-zones heat map** — hardcoded 9-cell literal; no zone-hit-rate data exists in the API. Gate or label. → **BUG-013** (new, highest priority)
2. **Splits tab** — entire tab (all 6 tables, all 3 timeframes) is hardcoded `SPLIT_TABLES` constant; zero API calls. Wire to real splits API or gate + label until data is ready. → **BUG-014** (new)
3. **Stats HR-row note** — `PlayerPage.tsx:771` maps the doubles/triples breakdown to the HR row instead of just the XBH row. → BUG-012
4. **Game view cross-feed sync** — per-inning runs (REST, 60s poll) can lag R total (socket, live) by up to 60s after a scoring play. Consider sourcing per-inning runs from the socket `linescore` field instead of polling boxScore separately.
5. **Overview "Today" widget** — player ↔ active game not joined. → BUG-001

**🟡 Disclosed but still mock — wire when data is available:**
6. **Upcoming Arsenal×bat + Location heat map** — `MOCK_SECTION.statcast = true` never flipped to `false`; subtitle "sample" makes it disclosed. Wire when Statcast pitch-type data lands (PR 9.5b finalization). Also: `MatchupSplits` has a silent fallback to mock when the splits API fails — add a disclosed fallback label.

**🟢 / 🔵 — no action needed (honest):** game leaders (DERIVED/WIRED), lineups tray (WIRED), Stats context notes (DERIVED/WIRED), Upcoming lean/read (DERIVED/WIRED), History game log (WIRED), Pitching tab lean version (WIRED, PR 6.6), cross-feed scoring summary + leaders (single socket source — consistent).

**✅ Resolved since last audit:** Pitching tab (BUG-011 → redesign down, DONE), History AVG (BUG-006 → fixed PR 27), LIVE pill (BUG-008 → fixed PR 11).

---

## How to maintain this doc

- When a dev confirms a ❔ item, change its code and delete the question from the action list.
- When a new screen/field ships, add it to the relevant table with a provenance code — don't wait for a bug report.
- A field graduating from 🟡/🔵 to 🟢 (data wired) should be flipped here at sign-off, same as the PR trackers.
- This doc and `bug-list.md` are complementary: bug-list is *reactive* (problems spotted in review); this is the *proactive* inventory. A 🔴 here that isn't in bug-list should become a bug-list entry.
