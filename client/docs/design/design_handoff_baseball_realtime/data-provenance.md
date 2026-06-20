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

- **One screen is fully 🔴 SILENT-MOCK:** the **Player · Pitching tab** — every player shows the *same fabricated* numbers (and a hardcoded name + pitch count). Confirmed by BUG-011; the backing data doesn't exist in the current API at all.
- **Two 🔴 SILENT-MOCK pockets elsewhere:** the **History game-log "AVG" column** (noise, not a running average — BUG-006) and a **cross-feed-sync risk** on the game view (line score ⇆ scoring summary ⇆ pitch-by-pitch can drift — MIGRATION warning, not yet observed).
- **The rest is healthy:** landing, most of the game view, Overview, Stats (rates), Splits (2026), History (logs), and Upcoming are 🟢 WIRED or properly 🔵 GATED / 🟡 LABELED.
- **The honest gaps in *this audit*:** a handful of ❔ items I can't confirm from docs — chiefly the Splits **Career / Last-30d timeframe** refetch and whether several "context note" strings are wired or canned.

**Bottom line:** gate or fix the **3 red items**, confirm the **❔ items** with the dev, and the app is in an honest state where everything shown is either real or labeled.

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
| **Home Runs row note ("4D, OT")** | 🔴 SILENT-MOCK | **BUG-010** — wrong note string echoed from the XBH row; the HR note should describe HRs or be blank. Also confirm "0T" uses digit `0` not letter `O`. Small but it *is* a wrong value shown as real. |
| Per-row "context note" strings (per-game rates, etc.) | ❔ UNVERIFIED | Confirm these are derived from wired values vs canned strings. |

---

## Player · Overview tab — 🟢 with one 🔴 link bug

| Element | Status | Note |
|---|---|---|
| Full-width hero (name, team, headshot, slash) | 🟢 WIRED | |
| **"Today" widget — live game state** | 🔴 SILENT-MOCK (inverse) | **BUG-001** — shows "No current game data" + disabled *Watch live* even when the player is **at bat** in a live game. Not fake *data* but a **false negative**: real live state exists and isn't joined. Same honesty problem (user sees something untrue). |
| Recent form (FormGuide total-bases bars) | 🟢 WIRED | |
| Hot-zones heat map (StrikeZone heat mode) | ❔ UNVERIFIED | Confirm sourced from real zone data vs mock — *if* it shares the (nonexistent) pitch-location source as the Pitching heat map, it may be 🔴. **Flag for dev.** |
| "Now" context pills | 🟢 WIRED | Reads season slash (shared source). |
| Last 5 games / Notable milestones | 🟢 WIRED | |

> ⚠️ **Hot-zones heat map is the sleeper risk.** Pitch-location data doesn't exist in the API (per BUG-011's investigation). If the Overview hot-zones map draws from that same nonexistent source, it's silently mock too. **Highest-priority ❔ to confirm with the dev.**

---

## Player · Splits tab — 🟢 / ❔

| Element | Status | Note |
|---|---|---|
| Six split tables (handedness/venue/day-night/baserunners/count/pitch-type), 2026 | 🟢 WIRED | Per PR 4 acceptance. |
| **Career / Last-30d timeframe options** | ❔ UNVERIFIED | bug-list flags this explicitly — confirm they actually **refetch** vs. silently re-showing 2026. If they don't refetch, it's 🔴. |
| ±delta vs League | 🟢 WIRED | |

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
| Batter × pitch-type (AVG/SLG/whiff) | 🟢 WIRED | PR 9.5b done. **Note:** this is the SAME shape the Pitching tab needs — confirm it's truly wired here, since BUG-011 says it doesn't exist for the Pitching tab. **Possible inconsistency — flag.** |
| "Sample data · live feed pending" pill | ⚪ removed | Removed after 9.5b sign-off. |
| `lean` / `read` verdict prose | 🟣 DERIVED | Templated copy; confirm derived from wired inputs vs authored mock. |
| Thin-data states (rookie / TBD probable / no games) | 🔵 GATED (undesigned) | Parked as **F-001** — dev improvises today (dim/blank). Reads as accidentally broken; needs design. |

> 🔎 **Cross-check flag — RESOLVED (Jun 20, 2026):** the apparent contradiction (Upcoming wires batter×pitch-type AVG/SLG/whiff in 9.5b, while BUG-011 said pitch-type "doesn't exist") splits cleanly by metric. **AVG/SLG/OPS by pitch type ARE available** — derivable from `pitchLog` aggregation (the `statSplits` sit-code path is what returns zero for batters). **Whiff% by pitch type is the part that needs Statcast.** So the Pitching tab's slash cards can be wired now (PR 6.6); only the whiff-bearing rich cards stay gated (PR 6.5). No contradiction — different data tiers.

---

## Game view — 🟢 with a 🔴 sync risk + status bug

| Element | Status | Note |
|---|---|---|
| Line score (per-inning runs, R/H/E) | 🟢 WIRED | PR 3 done. |
| Scoring summary | 🟢 WIRED | |
| Pitch-by-pitch feed | 🟢 WIRED | |
| **Cross-feed sync** (line score ⇆ scoring summary ⇆ pitch-by-pitch) | 🔴 SILENT-MOCK (risk) | MIGRATION explicitly warns these can **drift** if not all sourced from one feed. Not yet observed on screen, but a structural silent-mock hazard. **Confirm single source of truth.** |
| Strike zone + batter card | 🟢 WIRED | |
| Pitcher card ("On the mound"), IP as thirds | 🟢 WIRED | |
| Game leaders (top batter per side) | ❔ UNVERIFIED | MIGRATION flagged this as "new data — may need API work." Confirm wired. |
| **LIVE pill on a final game** | 🔴 SILENT-MOCK | **BUG-008** — pill not gated on game status; shows LIVE on finished games. Wrong status shown as real. |
| Pitch-by-pitch opens at game start, not live PA | 🟡 (UX bug) | **BUG-009** — not a data-truth issue but a live-UX defect. |
| Lineups tray (lineup/bench/bullpen, subs, IP thirds) | ❔ UNVERIFIED | Confirm roster/sub data wired vs mock. |
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

**🔴 Must fix or gate (showing untrue things as real):**
1. **Pitching tab** — **redesign down** to a lean, player-specific tab (handedness + pitch-type slash splits); wire the pitch-type card from `pitchLog` aggregation. *Decision evolved from "gate" to "redesign down" Jun 20.* → BUG-011 / PR 6.6 (slash data, ungated); rich tab parked → PR 6.5 (Statcast)
2. **History AVG column** — compute a real running season-to-date AVG from the shared source. → BUG-006
3. **Game view LIVE pill** — gate on actual game status (LIVE / Replay / Final). → BUG-008
4. **Stats HR-row note** — map the correct per-row note; fix "0T" glyph. → BUG-010
5. **Overview "Today" widget** — join player ↔ active game so live state shows. → BUG-001

**❔ Must confirm with the dev (can't verify from docs — could be hiding silent-mock):**
6. **Overview hot-zones heat map** — does it draw from the nonexistent pitch-location source? (If yes → 🔴.) **Top priority.**
7. **Upcoming vs Pitching contradiction** — is batter×pitch-type really wired (9.5b) or still mock? Resolve the conflict with BUG-011.
8. **Splits Career / Last-30d** — do the timeframe options actually refetch?
9. **Game view** — game leaders, lineups-tray roster/subs: wired or mock?
10. **Cross-feed sync** on the game view — single source of truth confirmed?
11. Scattered **"context note" strings** (Stats per-game notes, Upcoming `lean`/`read` prose) — derived from wired values or canned?

**🟢 / 🔵 / 🟡 — leave as-is (honest):** everything not listed above is either wired, properly gated, or labeled.

---

## How to maintain this doc

- When a dev confirms a ❔ item, change its code and delete the question from the action list.
- When a new screen/field ships, add it to the relevant table with a provenance code — don't wait for a bug report.
- A field graduating from 🟡/🔵 to 🟢 (data wired) should be flipped here at sign-off, same as the PR trackers.
- This doc and `bug-list.md` are complementary: bug-list is *reactive* (problems spotted in review); this is the *proactive* inventory. A 🔴 here that isn't in bug-list should become a bug-list entry.
