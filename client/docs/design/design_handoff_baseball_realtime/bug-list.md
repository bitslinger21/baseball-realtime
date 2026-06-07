# Baseball Realtime — Port QA Bug List

Running list of bugs / inconsistencies found while reviewing the ported app against the
design (`holistic/`) and handoff spec. To be triaged and fixed in a batch.

| Status legend |
|---|
| 🔴 open · 🟡 needs-confirm · 🟢 fixed |

---

## BUG-001 · Player live-game link not wired 🔴
- **Screen:** Player view → hero / Today widget (`/player/:mlbId`)
- **Severity:** Medium (data wiring)
- **Observed:** Today widget reads **"No current game data"** and **Watch live ▸ is disabled**, even though the player (Kyle Tucker) is *currently at bat* in the live game (Dodgers @ Diamondbacks, top 9).
- **Expected (spec):** Today widget shows the player's live state (ON DECK / at-bat pill + today's at-bats line); **Watch live ▸** is enabled and routes to that player's `/game/:providerGameId`.
- **Likely cause:** player↔active-game link not joined in the port.

## BUG-002 · Hero slash line ≠ Stats-tab slash line 🔴
- **Screen:** Player view → hero vs. Stats tab (`/player/:mlbId`)
- **Severity:** Medium (data inconsistency)
- **Observed:** Same player, same **2026** season, two different numbers:
  - Hero (and Overview "Now" pill): **.244 / .340 / .398**, **.738 OPS**
  - Stats tab "Rate" card: **.243 / .339 / .396**, **.735 OPS**
- **Expected:** Season slash + OPS are identical wherever they appear. They should come from one source.
- **Likely cause:** hero and Stats table pull from different stat objects / rounding paths.

## BUG-003 · Stats tab — League / Δ / Percentile columns are empty 🔴
- **Screen:** Player view → Stats tab (`/player/:mlbId`)
- **Severity:** Medium (data wiring / missing feature surface)
- **Observed:** Every row's **LEAGUE**, **Δ**, and **PERCENTILE** cells render as em-dash (—) across both the Rate and Production cards. The colored percentile bar (green ≥60th / amber ≥40th / red <40th) never appears.
- **Expected (spec, README §3 Tab 1):** Statistic | 2026 | **League | Δ | Percentile bar** — the comparative half of the table is the point of the design.
- **Note:** `wOBA` / `wRC+` showing "not available" with the `?` tooltip is **intentional** (graceful unavailable state) — not a bug. The empty League/Δ/Percentile on the *available* stats (AVG/OBP/SLG/OPS/Runs/RBI/HR/XBH) is the issue.

## BUG-004 · Pitching — "62% outside zone" contradicts ZONE% 🟡
- **Screen:** Player view → Pitching tab → "Damage by location" caption vs "By pitcher handedness" table
- **Severity:** Low–Med (internal inconsistency / needs-confirm)
- **Observed:** Caption reads **"Pitchers throw 62% outside the strike zone."** But the handedness table's **ZONE%** is **52% (vs LHP)** and **47% (vs RHP)** → ~48–50% in-zone, i.e. only ~50–52% *outside*, not 62%.
- **Expected:** The headline "outside zone" figure should reconcile with ZONE% (or be sourced from the same number). 62% vs ~50% can't both be right.
- **Likely cause:** hardcoded caption number not derived from the same data as the table.

## BUG-005 · Pitching — coldest-zone direction ("down & in") vs caption ("low/away") 🟡
- **Screen:** Player view → Pitching tab → "Damage by location"
- **Severity:** Low (copy / handedness)
- **Observed:** Coldest cell labeled **"down & in"** (.040), but the caption says pitchers exploit **"low/away weakness."** In/away are opposite horizontal directions for a LH batter — the panel contradicts itself.
- **Expected:** Coldest-zone label and the narrative caption should agree on in vs. away (check batter's-view vs catcher's-view handedness flip).

## BUG-006 · History Game log — "AVG" column incoherent + cross-screen mismatch 🟡
- **Screen:** Player view → History tab → Game log
- **Severity:** Medium (data integrity)
- **Observed:** The **AVG** column (read as season-to-date) swings impossibly game-to-game — e.g. **.239 (05-18) → .260 (05-19)**, a 21-point jump in one game, which is impossible for a running average ~200 AB into a season. And the latest value **.239 (05-24)** doesn't match the **Stats tab (.243)** or the **hero (.244)** for the same 2026 season.
- **Expected:** If the column is season-to-date AVG, it should move smoothly and its final value should equal the season AVG shown elsewhere. (Ties into BUG-002 — one season-AVG source.)
- **Likely cause:** mock game-log AVG values are noise, not a real running average.

## BUG-008 · Game view shows "LIVE" pill on a final game 🔴
- **Screen:** Game view (`/game/:providerGameId`)
- **Severity:** Medium (status mislabel)
- **Observed:** When the selected game is **final**, the PageTitle still shows the **LIVE** pill.
- **Expected:** A finished game should not read "LIVE" — show **"Replay"** (or "Final") instead. The pill should reflect the game's actual state.
- **Likely cause:** the LIVE pill is hardcoded / not gated on game status; needs a state-aware label (LIVE while in progress, Replay/Final when over).

## BUG-009 · Game view — pitch-by-pitch opens at start of game, not current position 🔴
- **Screen:** Game view → pitch-by-pitch (`/game/:providerGameId`, live game)
- **Severity:** Medium (live UX)
- **Observed:** Opening a **live** game, the pitch-by-pitch feed is scrolled to the **beginning** of the game (first PA). The user has to scroll all the way down/up to reach the current at-bat.
- **Expected:** For a live game, the feed should open at the **current position** — newest/live PA in view (the live PA is the expanded one at the top per the design) — not the start of the game.
- **Likely cause:** initial scroll position not set to the live PA on mount; defaults to the top/first PA.

## BUG-007 · History Game log — "IL stint started" note placement 🟢-minor
- **Screen:** Player view → History tab → Game log
- **Severity:** Low (copy / sequence)
- **Observed:** **"IL stint started"** is noted on **04-10**, but a game is logged on **04-11** (one day later, before the ~5-week gap to 05-18). If the IL stint began 04-10 he wouldn't play 04-11; the note more likely belongs on **04-11** (the last game before the gap).
- **Expected:** IL-stint note sits on the last game played before the absence.

---

## Reviewed & passing (for reference)
- **Overview tab** — full-width hero, both hero buttons, FormGuide bars, Hot-zones heat map (StrikeZone heat mode), Now pills, mono numerals. ✅
- **Stats tab** — sectioned cards each wrapping a table (not card grids); OPS accented; mono numerals. ✅ (aside from BUG-002 / BUG-003)
- **Splits tab** — six tables under wired Category + Timeframe rails; caption "Showing all 6 split groups · 2026 season"; columns Split | G AB H HR RBI BB K AVG OBP SLG OPS | vs Lg; VBar + green/rust ±delta semantically correct; AVG+OPS accented; zero-HR dimmed; mono. ✅
  - ⚠️ **To verify (not yet a bug):** the timeframe rail's **Career / Last 30d** options — confirm they actually refetch (mock only carried 2026). Can't tell from a 2026-only screenshot.
- **Pitching tab** — renders real body (not "Coming soon"); top filter rail (All / vs LHP / vs RHP / In strike zone / Outside zone); Pitch-mix donut (bright per-pitch palette, shares sum to 100%); Performance-vs-pitch-type table with SLG value+bar in one cell; Damage-by-location heat map + Hottest/Coldest + SLG scale; By-pitcher-handedness with **BRK%** rename + `?` header tooltips; Counts-attacked (solid put-away + dashed go-to). ✅ (aside from BUG-004 / BUG-005)
- **History tab** — renders real body; four working sub-tabs (Game log / Career / vs Team / Postseason); wired season picker (2026…2022); Game-log columns Date | Result (W/L pill) | Opp | H/AB | HR | RBI | BB | K | AVG | Notes; W/L pills green/red; mono numerals. ✅ (aside from BUG-006 / BUG-007)
