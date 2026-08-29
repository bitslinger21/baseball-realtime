# Baseball Realtime — Data Provenance Audit

**Purpose.** A field-by-field accounting of every data point the redesigned app shows, classified by **how real it is** in the ported production app. This exists because "mock data" had quietly grown broader than anyone tracked — the reactive `bug-list.md` catches problems only when someone spots them on screen. This doc is the *proactive* inventory: it names every value and says whether it's wired, intentionally faked-but-labeled, or silently faked.

**Scope note / honest limit.** This audit is assembled from the **design source** (`holistic/`), the **handoff trackers** (`MIGRATION.md`, `README.md`, `bug-list.md`, `DATA-REQUIREMENTS-Upcoming.md`), and the recorded PR sign-offs. It reflects **what those documents say is wired** in the ported `baseball-realtime/client/` app. It is **not** a live inspection of the running app's network layer — anything I can't confirm from the trackers is marked **`?`** and needs a dev to verify against the actual API calls.

---

## Legend

| Code | Meaning | Acceptable? |
|---|---|---|
| 🟢 **WIRED** | Sourced from the live API / socket; reflects the real player or game. | Yes |
| 🔵 **GATED** | Feature deliberately not shown (feature-checked / renders nothing) until data lands. No fake values reach the user. | Yes — interim |
| 🟡 **LABELED-MOCK** | Mock values *are* shown, but carry an on-screen flag ("Sample data", "not available", em-dash). User is told it isn't real. | **Transitional only** — every 🟡 now has a target and a PR (see below) |
| 🔴 **SILENT-MOCK** | Fabricated values shown **as if real**, with no label. The actual hazard. | **No — must fix or gate** |
| 🟣 **DERIVED** | Computed/templated client-side from other fields (not fetched). Fine if inputs are real; suspect if inputs are mock. | Depends on inputs |
| ⚪ **STATIC** | Intentionally fixed (labels, team names/logos, design copy). Not "data." | Yes |
| ❔ **UNVERIFIED** | Can't confirm wired vs mock from the trackers — needs dev confirmation. | Investigate |

---

## Executive summary

**Your instinct was right: the fake-data surface is wider than "a few placeholders," but the genuinely dangerous part is concentrated.**

- **Remaining silent-mock surface:** the **Player · Pitching tab** (BUG-011 — rich cards gated on Statcast; lean tab is the live design). **Resolved since:** Overview hot-zones (**BUG-013** — gated, Jun 23), the entire Splits tab (**BUG-014** — wired, Jun 23), the Today widget (**BUG-001** — wired, Jun 23), History game-log AVG (BUG-006, Jun 22), and the cross-feed-sync drift (PROMPT-1 §A, Jun 23).
- **Upcoming Statcast tier:** batter×pitch-type AVG/SLG now wired (Jun 23); pitcher arsenal + whiff% remain **labeled "sample"** (Statcast-gated).
- **The rest is healthy:** landing, most of the game view (incl. game leaders + lineups, confirmed wired), Overview hero/form/now-pills, Stats (rates + context notes), History logs, and the Upcoming MLB-data tier are 🟢 WIRED or properly 🔵 GATED / 🟡 LABELED.
- **Investigation closed:** all eleven original ❔ items are now resolved to a definitive code (Jun 22 pass).

**Derived-sequence sweep (Aug 28, 2026):** swept every multi-point surface for the `buildWinsSeries` /
`buildFormChips` defect — a series reconstructed from aggregates. **No third instance.** The two known
ones are the only ones; everything else that plots more than one point reads a real log. Two latent
traps (`Sparkline`, `Stat`'s `trend`) exist as atoms but appear only on the review-only foundations
page. Full table below.

**Bottom line (Jun 23, 2026):** the data-truth cleanup is essentially done — BUG-001/006/008/010/013/014 and the cross-feed drift are all closed; the **Upcoming Statcast tier** is wired for AVG/SLG and the rest kept labeled. The only remaining 🔴 is the **rich Pitching tab** (BUG-011), which is Statcast-gated (PR 6.5) with a lean tab live in its place. Everything else shown is real or labeled.

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
| Game-log **AVG column** | 🟢 WIRED | **BUG-006 FIXED (Jun 22, 2026)** — real running season-to-date AVG from cumulative H/AB, reconciled to the single season-AVG source. |
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
| Advanced/Statcast rows (wOBA, wRC+, Chase/Whiff/Contact) | 🟡 LABELED-MOCK | Explicit "(?) not available" / "Statcast" labels. Intended graceful-unavailable. **BsR removed Aug 28** — baserunning advancement isn't in the API, and a BsR computed from steals alone is a different stat wearing the name. |
| Counting stats League/Δ/percentile (R/RBI/HR/XBH/TB, G/AB/PA/SB) | ⚪ STATIC | Intentionally em-dashed by spec (percentiling a counting total conflates playing time with skill). Correct as rendered. |
| **Home Runs row note** | 🟢 WIRED | **BUG-010 FIXED & SIGNED OFF Jun 23, 2026** (PROMPT-2) — the HR row describes its own value (or is blank), no longer echoing the XBH breakdown; the triples token uses the digit `0` (`0T`). |
| Per-row "context note" strings (per-game rates, etc.) | 🟣 DERIVED (wired inputs) | **Confirmed Jun 22, 2026:** template strings built from the real overview DTO. |

---

## Player · Overview tab — 🟢 with one 🔴 link bug

| Element | Status | Note |
|---|---|---|
| Full-width hero (name, team, headshot, slash) | 🟢 WIRED | |
| **"Today" widget — live game state** | 🟢 WIRED | **BUG-001 FIXED & SIGNED OFF Jun 23, 2026** (PROMPT-1 §B join + PROMPT-4 §2 bind) — widget reads `todayGame`: live state pill + today's line + enabled *Watch live* routing to the right `/game/:providerGameId`; honest empty state when no game. |
| Recent form (FormGuide total-bases bars) | 🟢 WIRED | |
| Hot-zones heat map (StrikeZone heat mode) | 🔵 GATED | **BUG-013 GATED/LABELED & SIGNED OFF Jun 23, 2026** (PROMPT-4 §1) — the hardcoded 9-cell stub + `.720`/`.083` insight prose are gone; the card shows an honest "coming with pitch-level data" placeholder. Real zone data still rides the PR 6.5 Statcast ingest. |
| "Now" context pills | 🟢 WIRED | Reads season slash (shared source). |
| Last 5 games / Notable milestones | 🟢 WIRED | |

> ✅ **RESOLVED (Jun 23, 2026):** BUG-013 closed — hot-zones map is now gated with an honest placeholder (PROMPT-4 §1); BUG-001 closed — Today widget wired to the real join (PROMPT-4 §2). Both signed off.

---

## Player · Splits tab — 🟢 WIRED (BUG-014 closed & signed off Jun 23, 2026)

| Element | Status | Note |
|---|---|---|
| Six split tables (handedness/venue/day-night/baserunners/count/pitch-type), 2026 | 🟢 WIRED | **BUG-014 FIXED** (PROMPT-1 §D backend + PROMPT-4 §4 bind) — `SplitsTab` fetches real per-player splits by `:mlbId`; the `SPLIT_TABLES` mock is removed. Different players show different splits. |
| **Career / Last-30d timeframe options** | 🟢 WIRED | Timeframe toggle now **refetches** (keyed `:mlbId` + timeframe) — numbers change per timeframe, not just the caption. |
| ±delta vs League | 🟢 WIRED | Real `vsLeague` ±delta where present. |
| Groups/timeframes the API can't return | 🟡 LABELED | Backend flags `available:false`; rendered as an explicit "not available" state, never the old mock. |

---

## Player · Upcoming tab — 🟢 MLB-tier wired; 🟡 Statcast-tier still labeled-mock (corrected Jun 22, 2026)

Source: `holistic/player-upcoming.jsx`. Field-by-field audit lives in `design_handoff_baseball_realtime/DATA-REQUIREMENTS-Upcoming.md`.

| Element | Status | Note |
|---|---|---|
| Schedule lookahead (next 3 games) | 🟢 WIRED | PR 9.5a done. |
| Probable starters | 🟢 WIRED | PR 9.5a done. |
| Batter-vs-pitcher H2H + "first meeting" null path | 🟢 WIRED | PR 9.5a; null path designed + wired. |
| Handedness / pitch-class splits (reused) | 🟢 WIRED | Reuses Splits source. |
| Pitcher arsenal (usage/velo/9-zone) | 🟡 LABELED-MOCK | **Corrected Jun 22, 2026:** same `MOCK_SECTION.statcast = true` (never flipped) — renders mock with a "sample" subtitle. PR 9.5b wasn't actually wired. |
| Batter × pitch-type (AVG/SLG) | 🟢 WIRED | **Flipped Jun 23, 2026** (PROMPT-1 §C backend + PROMPT-4 §3 bind) — `MOCK_SECTION.statcast` off for this card; real AVG/SLG/OPS (+ AB) per pitch type from `pitchLog` aggregation. Different batters show different tables. **Whiff% stays labeled "sample"** (needs Statcast / PR 6.5). |
| "Sample data · live feed pending" pill | 🟡 still present on Statcast cards | **Corrected Jun 22, 2026:** the page-level pill was removed, but the **Statcast section subtitles still read "sample"** (`MOCK_SECTION.statcast` never flipped) — so those cards remain labeled-mock, not wired. |
| `lean` / `read` verdict prose | 🟣 DERIVED (wired inputs) | **Confirmed Jun 22, 2026:** `computeLean` + `buildRead` from real H2H + pitcher API. |
| Thin-data states (rookie / TBD probable / no games) | 🔵 GATED (undesigned) | Parked as **F-001** — dev improvises today (dim/blank). Reads as accidentally broken; needs design. |

> 🔎 **Cross-check flag — RESOLVED (Jun 20, 2026):** the apparent contradiction (Upcoming wires batter×pitch-type AVG/SLG/whiff in 9.5b, while BUG-011 said pitch-type "doesn't exist") splits cleanly by metric. **AVG/SLG/OPS by pitch type ARE available** — derivable from `pitchLog` aggregation (the `statSplits` sit-code path is what returns zero for batters). **Whiff% by pitch type is the part that needs Statcast.** So the Pitching tab's slash cards can be wired now (PR 6.6); only the whiff-bearing rich cards stay gated (PR 6.5). No contradiction — different data tiers.

---

## Game view — 🟢 with a 🔴 sync risk + status bug

| Element | Status | Note |
|---|---|---|
| Line score (per-inning runs, R/H/E) | 🟢 WIRED | PR 3 done. |
| Scoring summary | 🟢 WIRED | |
| Pitch-by-pitch feed | 🟢 WIRED | |
| **Cross-feed sync** (line score ⇆ scoring summary ⇆ pitch-by-pitch) | 🟢 WIRED | **FIXED & SIGNED OFF Jun 23, 2026** (PROMPT-1 §A) — per-inning runs + R total now derive from one live source; inning cell and total update together, no ~60s drift. |
| Strike zone + batter card | 🟢 WIRED | |
| Pitcher card ("On the mound"), IP as thirds | 🟢 WIRED | |
| Game leaders (top batter per side) | 🟢 WIRED (derived) | **Confirmed Jun 22, 2026:** `deriveLeaders(allUpdates)` from socket fields `batterGameH`/`AB`/`RBI`. Real. |
| **LIVE pill on a final game** | 🟢 WIRED | **BUG-008 FIXED & SIGNED OFF Jun 14, 2026** — the LIVE-only machinery (pill, follow, Jump-to-live) is gated behind one `isLive` flag derived from game status (PR 11); a final game shows none of it. Verified in the PR 11 C8 acceptance check. |
| Pitch-by-pitch opens at game start, not live PA | 🟡 (UX bug) | **BUG-009** — not a data-truth issue but a live-UX defect. |
| Lineups tray (lineup/bench/bullpen, subs, IP thirds) | 🟢 WIRED | **Confirmed Jun 22, 2026:** `boxScoreApi.boxScoreGet` → real `BoxScoreDto` (batting order, bench, pitching sub-tree, bullpen, IP-as-thirds). |
| Win-probability timeline + Leverage row | 🟢 WIRED | **PR 3.5 DONE & SIGNED OFF Jun 23, 2026.** Backend fields (`winProbability` + `leverageIndex`) mapped Jun 22; frontend cards (`WinProbTimeline` + `LeverageCard`) wired to real per-play data — split-fill line, play-head X-domain, real team/inning/threshold bindings, derived leverage line. |

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

**🔴 Must fix or gate (showing untrue things as real):**
1. **Pitching tab** — **redesign down** to a lean, player-specific tab (handedness + pitch-type slash splits); wire the pitch-type card from `pitchLog` aggregation. *Decision evolved from "gate" to "redesign down" Jun 20.* → BUG-011 / PR 6.6 (slash data, ungated); rich tab parked → PR 6.5 (Statcast)
2. ~~**History AVG column**~~ → **DONE** (BUG-006, Jun 22).
3. ~~**Game view LIVE pill**~~ → **DONE & SIGNED OFF Jun 14** (BUG-008) — gated on actual game status via the PR 11 `isLive` flag.
4. ~~**Stats HR-row note**~~ → **DONE & SIGNED OFF Jun 23** (BUG-010, PROMPT-2) — correct per-row note; `0T` glyph fixed.
5. ~~**Overview "Today" widget**~~ → **DONE & SIGNED OFF Jun 23** (BUG-001, PROMPT-4 §2) — joined to the active game; live state shows.
6. ~~**Overview hot-zones heat map**~~ → **DONE & SIGNED OFF Jun 23** (BUG-013, PROMPT-4 §1) — gated with an honest placeholder; rides PR 6.5 for real data.
7. ~~**Splits tab (entire content)**~~ → **DONE & SIGNED OFF Jun 23** (BUG-014, PROMPT-1 §D + PROMPT-4 §4) — real per-player splits; timeframe refetches; unavailable groups labeled.
8. **Upcoming Statcast tier** — batter×pitch-type AVG/SLG now **wired** (Jun 23, PROMPT-4 §3, via `pitchLog`); **pitcher arsenal + whiff% stay labeled "sample"** (Statcast / PR 6.5 / 6.6).

**✓ RESOLVED by the Jun 22, 2026 investigation (`PROMPT_data_investigation.md`):**
- **Overview hot-zones** → confirmed 🔴 SILENT-MOCK → **BUG-013** (now in the fix list, #6).
- **Splits Career/Last-30d** → confirmed 🔴 — whole tab is mock, toggle is caption-only → **BUG-014** (#7).
- **Upcoming × Pitching pitch-type** → resolved: Upcoming's Statcast cards were **never wired** (labeled-mock), so there was no real contradiction — neither tab shows real whiff%-by-pitch-type.
- **Game leaders** → 🟢 WIRED (`deriveLeaders` from socket). **Lineups tray** → 🟢 WIRED (`boxScoreApi`).
- **Cross-feed sync** → 🟢 WIRED (PROMPT-1 §A, signed off Jun 23) — one live source; ~60s drift gone.
- **Context-note / lean-read strings** → 🟣 DERIVED from real DTOs (clean).

**❔ still open:** none from the original list — all eleven items above are now resolved to a definitive code.

**🟢 / 🔵 / 🟡 — leave as-is (honest):** everything not listed above is either wired, properly gated, or labeled.

---

---

---

## Target state — "no more mocked data" (decision, Aug 28, 2026)

**Every field is either real or explicitly absent.** No third option. The 🟡 LABELED-MOCK code was an
interim posture for cards whose data hadn't landed; it is now a **transitional** code with an
expiry, not an acceptable end state. A card that cannot be wired gets an honest empty state or gets
removed — it does not get a "sample" subtitle indefinitely.

Program and PR sequence: `handoff_no_mocks/PROMPT_no_mocks.md`.

**Definition of done for this doc:** no 🔴 and no 🟡 rows remain. Every field reads 🟢 WIRED,
🔵 GATED (with an honest empty state), ⚪ STATIC, or 🟣 DERIVED from wired inputs.

### Two tracker corrections this program depends on

- **Rank History was never wired.** CLAUDE.md's Jul 18 "Rank History data LIVE" entry is wrong. No
  per-day series exists on `StandingTeamDto`, `standings.service.ts` builds none, and
  `StandingsPage.tsx` still contains `seedFromStr` / `mulberry32` / `buildWinsSeries`.
- **PR 9.5b was never wired.** Recorded as signed off, but `MOCK_SECTION.statcast` was never
  flipped — the Upcoming pitcher arsenal has always rendered mock behind its "sample" subtitle.

Both were believed done for weeks. Sign-off on a data PR should require seeing the value change for
two different players or teams, not seeing the card render.

### Open ledger

| # | Surface | Now | Target | PR |
|---|---|---|---|---|
| 1.1 | Standings · Rank History | 🔴 seeded PRNG | 🟢 `winsByDay` from game log | N1 |
| 1.2 | Team page · Recent form chips | 🔴 rebuilt from `lastTen`+`streak` | 🟢 last ten completed, date order | N2 |
| 1.3 | Landing · widget `SAMPLE_*` slides | 🔴 fabricated behind a badge | 🔵 per-slide empty states; win prob 🟢 (PR 3.5 feed) | N3 |
| 2.1 | Player Stats · Contact quality (8 rows) | 🟡 "not available" | 🟢 `BatterStatcast` rollup | N4/N5 |
| 2.2 | Player Overview · Hot zones | 🔵 placeholder | 🟢 9-cell zone rollup | N4/N5 |
| 2.3 | Upcoming · Pitcher arsenal | 🟡 mock, "sample" | 🟢 arsenal rollup | N4/N5 |
| 2.4 | Pitching + Upcoming · whiff % | 🟡 mock | 🟢 swing/miss by pitch type | N4/N5 |
| 3.1 | Player Stats · wOBA, wRC+ | 🟡 "not available" | 🟢 computed, league constants derived not hardcoded | N6 |
| 3.2 | Player Stats · BsR | ✅ **row removed** (Aug 28) | — | done |
| 3.3 | Team page · Home/Away/1-Run splits | 🟡 `—` | 🟢 `records.splitRecords` | N7 |
| 3.4 | Team page · venue, city, founded | 🟡 `—` / absent | 🟢 teams endpoint | N7 |
| 3.5 | Game view · pitcher WHIP, handedness | 🟡 gap / raw `P` | 🟢 added to `pitcherLine` | N9 |
| 4.1 | Leaders · AL/NL filter | ⚠️ filters the MLB top 10 | 🟢 per-league requests | N8 |
| 4.2 | Team leaders card | absent | 🟢 team-scoped query | N8 |
| 4.3 | Leaders · `throughDate` | ⚠️ dead branch | field added or branch deleted | N9 |
| 4.4 | Player History · IL stint note | 🟡 wrong date | 🟢 correct game | N9 |
| 5 | `Sparkline`, `Stat` `trend` | latent | comment in `shared.jsx`; source named at first real use | N9 |

Sample-size discipline applies to every Statcast rollup: a row or zone below its floor
(`pitchesSeen >= 100`, `battedBalls >= 25`) stays blank rather than showing a noisy extreme. On a 3×3
heat map a small-sample extreme reads as a real hot spot, which is a fabricated value by another
route.

## Derived-sequence sweep (Aug 28, 2026)

**Why.** Two cards have now shipped showing a per-game sequence that was reconstructed from season
totals: Standings' **Rank History** (`buildWinsSeries`) and the team page's **Recent form chips**
(`buildFormChips`). One root cause, twice: *a card designed around a per-game series that the API
only exposes in aggregate.* This sweep asks whether there is a third.

**Why this class hides.** These defects survive review because every property a reviewer checks is
true. The endpoints are real. The totals reconcile — 8–2 really is 8–2, and Rank History's final
point really is the team's W–L. The output is stable across reloads, so it never flickers or
contradicts itself. Only the *interior* of the series is invented, and nothing on screen is there to
falsify it. What makes it a lie rather than a rounding error is that the chrome asserts order: the
form row is captioned "10 games ago → Most recent," and Rank History animates a replay. The label
promises a chronology the data cannot supply.

**The test.** For every element that renders more than one point: *does the API return the points, or
only their sum?* If only the sum, the element must either be fed a real log or stop claiming order.

### Result: no third instance. Every other multi-point surface reads a real log.

| Surface | Points from | Verdict |
|---|---|---|
| Standings · **Rank History** line chart | `buildWinsSeries` — seeded shuffle of season W/L | 🔴 **KNOWN** — wire `winsByDay` from the game log (decision Aug 27); `seedFromStr`/`mulberry32`/`buildWinsSeries` deleted from the client |
| Team page · **Recent form chips** | `lastTen` + `streak` strings | 🔴 **KNOWN** — BUG 1, `handoff_team_sync/`. Fix: `fetchSeasonSchedule`, last ten completed in date order |
| Player Overview · **FormGuide** total-bases bars (15 games) | Per-game log | 🟢 Real per-game series |
| Player Overview · **Last 5 games** strip | Per-game at-bat outcomes | 🟢 Real |
| Player History · **game log** + running season-to-date AVG | Per-game log; AVG from cumulative H/AB | 🟢 Real (BUG-006 closed Jun 22) |
| Game view · **win-probability timeline** | Per-play `winProbability` | 🟢 Real (PR 3.5, Jun 23) |
| Game view · **leverage** line | Per-play `leverageIndex` | 🟢 Real (PR 3.5) |
| Game view · **at-bats scorebook row** | Play-by-play feed, one cell per PA | 🟢 Real |
| Game view · **line score** per-inning runs | One live source (cross-feed sync fixed Jun 23) | 🟢 Real |
| Team page · **Schedule** (162-game grid) | `fetchSeasonSchedule(teamId, season)` | 🟢 Real. The design mock's 162 fabricated games are spec-for-structure only, and the prompt says so |
| Player History · season-by-season, vs Team | Aggregates | ⚪ N/A — aggregates presented *as* aggregates, no order claimed |

### Two latent traps — not shipped, but load-bearing if reached for

Both live in `shared.jsx` and appear **only** in `foundations.jsx`, the review-only swatch page.
Neither is on a product screen today. Both are shaped exactly like the defect:

- **`Sparkline`** takes a `values` array and draws a trend line. In foundations it is fed a literal
  `[3,2,4,1,3,2,5,4,3,5]` under the label "Last 10 games · BA." Anyone reaching for this atom needs a
  real per-game log; the atom itself cannot tell.
- **`Stat`'s `trend` prop** renders a ▲/▼ delta. A delta is a two-point series — it needs a real
  prior value, not a plausible one. Foundations shows `trend={-12}` and `trend={48}` as literals.

**Recommendation:** when either is next used on a real screen, name its data source in the same
commit. Consider a one-line comment on both atoms in `shared.jsx` pointing at this section.

### Standing rule

Add to the maintenance list at the foot of this doc: **a new element that plots or sequences more
than one point gets a provenance row before it ships, and the row must name the per-point source.**
"Derived from the season total" is not a source.

## How to maintain this doc

- When a dev confirms a ❔ item, change its code and delete the question from the action list.
- When a new screen/field ships, add it to the relevant table with a provenance code — don't wait for a bug report.
- A field graduating from 🟡/🔵 to 🟢 (data wired) should be flipped here at sign-off, same as the PR trackers.
- This doc and `bug-list.md` are complementary: bug-list is *reactive* (problems spotted in review); this is the *proactive* inventory. A 🔴 here that isn't in bug-list should become a bug-list entry.
- **Any new element that plots or sequences more than one point gets a provenance row before it ships, and the row must name the per-point source.** "Derived from the season total" is not a source. See the derived-sequence sweep above for why this rule exists.
