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

## BUG-002 · Hero slash line ≠ Stats-tab slash line 🟢 FIXED — signed off
- **Screen:** Player view → hero vs. Stats tab (`/player/:mlbId`)
- **Severity:** Medium (data inconsistency)
- **Resolution:** Hero and Stats tab now read the season slash + OPS from one shared stat source; numbers match everywhere. Verified & signed off Jun 6, 2026.
- **Observed (orig):** Same player, same **2026** season, two different numbers:
  - Hero (and Overview "Now" pill): **.244 / .340 / .398**, **.738 OPS**
  - Stats tab "Rate" card: **.243 / .339 / .396**, **.735 OPS**
- **Expected:** Season slash + OPS are identical wherever they appear. They should come from one source.
- **Likely cause:** hero and Stats table pull from different stat objects / rounding paths.

## BUG-003 · Stats tab — League / Δ / Percentile columns 🟢 RESOLVED — signed off (Jun 6, 2026)
- **Screen:** Player view → Stats tab (`/player/:mlbId`)
- **Severity:** Medium (data wiring / missing feature surface)
- **Resolution:** Closed after a screenshot review against the design source. Splits into three findings, all now accounted for:
  1. **Rate & rate-quality stats — FIXED.** AVG/OBP/SLG/OPS (Rate) and Walk%/Strikeout% (Plate discipline) now render full **League + Δ + colored percentile bar** with rank (28th/13th/18th/15th, 34th/57th, etc.). This was the heart of the bug.
  2. **"Not available" rows — expected, and confirmable on-screen.** wOBA, wRC+, the Statcast plate-discipline rows (Chase/Whiff/Contact/Swing %), all Contact-quality rows, and BsR carry an explicit `(?) … not available` / `Statcast` label. Intended graceful-unavailable state (advanced/Statcast data not wired in the port).
  3. **Counting stats — em-dash is now the SPEC, not a gap.** Production (Runs/RBI/HR/XBH/Total bases) and the counting rows of Volume + speed (Games/AB/PA/Stolen Bases) intentionally show **only the 2026 value + a per-game context note**, em-dashing League/Δ/Percentile. The design previously stamped orphaned percentiles on Production (pct with no League/Δ baseline) — removed in `holistic/player.jsx`, because percentiling a counting total conflates playing time with skill (Savant reserves percentile sliders for rate/quality stats). README §3 Tab 1 + the design source now say so explicitly, so the port's blank cells are correct as rendered.
- **Original observed:** Every row's LEAGUE/Δ/PERCENTILE rendered as em-dash across the Rate and Production cards; the percentile bar never appeared.

## BUG-004 · Pitching — "62% outside zone" contradicts ZONE% 🟢 RESOLVED — signed off (Jun 7, 2026)
- **Screen:** Player view → Pitching tab → "Damage by location" caption vs "By pitcher handedness" table
- **Severity:** Low–Med (internal inconsistency / needs-confirm)
- **Fix (Jun 7, 2026 — awaiting sign-off):** Caption number is no longer hardcoded. `PitchingTab` now derives it from a single `zonePct = { LHP: 52, RHP: 47 }` source, blended by PA volume (`zonePA = { LHP: 14, RHP: 53 }`) into `inZone` (≈48%), with `outsideZone = 100 − inZone`. The same `zonePct` feeds the handedness table's Zone% cells, so caption and table read from one source and can't drift. Caption now resolves to **52% outside**, reconciling with ~48% in-zone. README §3 Tab 3 updated.
- **Observed (orig):** Caption read **"Pitchers throw 62% outside the strike zone,"** but the handedness table's **ZONE%** was **52% (vs LHP)** and **47% (vs RHP)** → ~48–50% in-zone, i.e. only ~50–52% outside, not 62%.
- **Likely cause:** hardcoded caption number not derived from the same data as the table.

## BUG-005 · Pitching — coldest-zone direction ("down & in") vs caption ("low/away") 🟢 RESOLVED — signed off (Jun 7, 2026)
- **Screen:** Player view → Pitching tab → "Damage by location"
- **Severity:** Low (copy / handedness)
- **Sign-off note:** scope is the caption↔callout copy-consistency fix only; the heat-map in/away orientation question is tracked separately and folds into BUG-011's data-wiring work.
- **Fix (Jun 7, 2026):** Two findings:
  1. **Port-only contradiction.** The "low/away" wording in the original report is a **port artifact** — the design source never said it. The design caption read "weak contact in the lower third," which is vertically consistent with the computed coldest cell "down & in." The port rewrote the caption and introduced the in/away conflict.
  2. **Latent fragility removed.** The caption used to hand-assert a direction in prose while the coldest-zone label was data-derived — they could silently diverge (which is how the port broke). The zone computation (`zoneData`, `zoneNames`, `hotIdx`, `coldIdx`) is now hoisted to the `PitchingTab` body, and the caption names `zoneNames[coldIdx]` + its SLG directly, so the caption and the "Coldest" callout always agree. Caption now reads: "…exploiting his coldest zone **down & in** (**.040** SLG)."
- **Observed (orig, port):** Coldest cell labeled **"down & in"** (.040), but caption said pitchers exploit **"low/away weakness"** — in/away are opposite horizontal directions for the batter.
- **Dev note:** when porting, derive the caption's zone name from the same coldest-cell index as the heat map; do NOT hand-write a direction. Confirm the heat-map grid's in/away column orientation matches the intended batter's-view vs catcher's-view convention.

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

## BUG-009 · Game view — pitch-by-pitch opens at start of game, not current position 🔴 (design done → PR 11)
- **Screen:** Game view → pitch-by-pitch (`/game/:providerGameId`, live game)
- **Severity:** Medium (live UX)
- **Observed:** Opening a **live** game, the pitch-by-pitch feed is scrolled to the **beginning** of the game (first PA). The user has to scroll all the way down/up to reach the current at-bat.
- **Expected (spec):** For a live game, the feed opens at the **current position** — newest/live PA in view (the live PA is the expanded one at the top per the design) — not the start of the game.
- **Likely cause:** initial scroll position not set to the live PA on mount; defaults to the top/first PA.
- **Resolution path (Jun 12, 2026):** This is **no longer a one-line scroll fix** — it's the entry point to the full live-feed position behavior. Designed + prototyped in **`Game Position — Live & Replay.html`** (`holistic/game-position.jsx`, Live mode) and written up as **handoff MIGRATION PR 11** (open-at-live-PA on mount + auto-follow while pinned + break-on-scroll with scroll-height compensation + a "Jump to live · N new" pill to return + the pill pins to the *visible* feed region so it survives **page** scroll, not just the feed's internal scroll). No new API — runs on the already-wired socket feed. Fix per PR 11, not a bare `scrollTop` tweak. *(The broader replay transport / scrubber this points at is Part 2 — `future.md` F-002.)*

## BUG-010 · Game view — position resets on return (doesn't resume where you left off) 🔴 (design done → PR 12)
- **Screen:** Game view → pitch-by-pitch (`/game/:providerGameId`)
- **Severity:** Medium (navigation UX)
- **Observed:** Open a past (final) game, scroll several batters into the pitch-by-pitch, tap a player name to view their stats, then hit Back — the game view resets to the top. The reading position is lost; the game "starts over."
- **Expected:** Returning to a game you were just on resumes where you left off. A game has a *position* and the view should remember it across in-app navigation.
- **Resolution path (Jun 13, 2026):** Designed as **handoff MIGRATION PR 12** (game-view position persistence). Final/replay games restore the exact feed scroll + expanded PA; live games return to the live edge (re-arm following). Session-scoped (in-memory / `sessionStorage`, NOT `localStorage`); a hard refresh falls back to the PR 11 default. No new API — pure client persistence across React Router unmount/remount. Sibling to PR 11.

## BUG-007 · History Game log — "IL stint started" note placement 🟢-minor
- **Screen:** Player view → History tab → Game log
- **Severity:** Low (copy / sequence)
- **Observed:** **"IL stint started"** is noted on **04-10**, but a game is logged on **04-11** (one day later, before the ~5-week gap to 05-18). If the IL stint began 04-10 he wouldn't play 04-11; the note more likely belongs on **04-11** (the last game before the gap).
- **Expected:** IL-stint note sits on the last game played before the absence.

## BUG-010 · Stats tab — Home Runs note shows a doubles/triples breakdown 🟡
- **Screen:** Player view → Stats tab → Production card
- **Severity:** Low (data wiring / wrong note string)
- **Observed:** The **Home Runs** row (value **2**) carries the note **"4D, OT"** — a doubles/triples breakdown that belongs on the **Extra-base hits** row (which correctly reads "4D · OT · 2 HR"). The HR row should describe its own value, not echo the XBH breakdown.
- **Secondary:** **"OT" reads as letter-O + T but means "0 triples" (0T).** Confirm the note builds with the digit `0`, not the letter `O` — it appears on both the HR and XBH rows.
- **Expected:** Home Runs note describes home runs (or is blank); the triples token uses `0`, not `O`.
- **Likely cause:** wrong note string mapped to the HR row in the port; possible char/glyph mix-up for zero-triples.

## BUG-011 · Pitching tab renders identical sample data for every player 🔴
- **Screen:** Player view → Pitching tab (`/player/:mlbId`) — all batters
- **Severity:** High (data integrity — fabricated data shown in production for every player)
- **Observed:** Every batter's Pitching tab shows the **same numbers** — pitch mix, AVG/SLG/Whiff by pitch type, zone-by-zone SLG heat map, by-handedness table, counts-attacked — plus the hardcoded heading "How pitchers attack **Peña**" and "314 pitches seen." The body is not keyed to the player.
- **Root cause (confirmed in design source):** `PitchingTab()` in `holistic/player.jsx` takes **no player argument**; every value is a hardcoded literal (the design file is a single-player Peña mock — there was never a per-`:mlbId` data path). The port carried that static sample data into the per-player route.
- **Expected:** Each player's Pitching tab reflects that player's own data, OR — if the source data isn't available — a proper empty / "data pending" state, never another player's fabricated numbers.
- **Disposition (RESOLVED to a gated-feature task — API investigated Jun 7, 2026):** Classification **(b) — per-player data does not exist; gate the tab.** The API exposes five `/players/{mlbId}/…` endpoints but the pitch-attack shapes are almost entirely absent. Per card:

  | Card | Backing data? | What exists |
  |---|---|---|
  | Pitch mix faced (donut) | ✗ none | pitch-type splits carry AB counts, not true pitch-count share |
  | Performance vs pitch type | ◐ partial | AVG/SLG/OPS via `splits` group=`pitchType`; **Whiff% missing** |
  | Zone SLG heat map | ✗ none | zero pitch-location data anywhere (no plateX/Z, no zone grid) |
  | By pitcher handedness | ◐ partial | LHP/RHP slash-line only; **Zone%/FPS%/put-away%/pitch-mix all missing** |
  | Counts attacked | ✗ none | no count-state data in any endpoint |

  No REST endpoint returns per-pitch events (type/location/handedness/count). The realtime `PlayUpdate` socket carries `pitchType` + `pitchSpeedMph` live only — no history, no location. No Statcast fields exist outside the `PlayerDrilldownDto` stub (already marked "not available"). **Wiring the tab as designed requires a NEW Statcast/Savant pitch-level data source (new MLB Stats API integration or a different per-pitch provider) — it is not a port wiring gap.**
- **DECISION NEEDED from design (open):** the tab can't ship as designed on current data. Pick one — (1) **gate the whole tab** behind a "data not yet available" state until a pitch-level source is integrated; (2) **redesign down to what's available now** (pitch-type slash splits + handedness slash splits = ~1.5 of 5 cards), add the rich cards when data lands; (3) **remove the tab** for now. Until decided, the tab must STOP showing fabricated universal sample data.
- **Blocks on:** the "data not yet available" / empty state is itself undesigned (empty/loading/error states are on the open list).
- **Note:** the heading "Peña" and "314 pitches seen" are part of the same hardcoding — they must also become player-derived (or hidden in the gated state).
- **Source-availability investigation (Statcast / Baseball Savant — Jun 7, 2026):** the missing pitch-level data **does exist publicly and is technically free**, but it is **not a flip-a-switch source** for this app. Findings:
  - **Data exists.** The Statcast Search CSV (Baseball Savant) carries every field the five cards need: `pitch_type`, `zone` + `plate_x`/`plate_z` (location → heat map), `balls`/`strikes` (count-state → Counts-attacked), `stand`/`p_throws` (handedness), and pitch `description` (swinging-strike → Whiff%). So all five shapes ARE derivable from Savant data.
  - **Caveat 1 — unofficial + rate-limited.** It's a scrape endpoint (what `pybaseball` / `sabRmetrics` wrap), not a supported API with an SLA. Savant caps queries at **25,000 rows** and queries are slow (~30s for a single day's first query). Fine for batch; not a production REST API.
  - **Caveat 2 — batch/historical, not live.** Savant won't provide live per-pitch location mid-game; the realtime socket has type+speed only. **This is OK for the Pitching tab** because it's a season-aggregate view, not the live feed — a periodic ingest/aggregation job fits. (Would NOT work for a live pitch-location feature.)
  - **Caveat 3 — 2026 ABS coordinate change.** `plate_z` reference moved from front-of-plate (≤2025) to **middle-of-plate (2026+)** to align with ABS. The StrikeZone geometry math must account for this.
  - **Caveat 4 — ToS / licensing.** "Free" holds for personal analysis; scraping MLBAM data for a **public-facing product** is a licensing question to vet before building on it. Not resolved here.
  - **Revised classification:** still a **gated feature**, but the gate is "**stand up a new Savant ingest + per-player aggregation pipeline (backend lift) + ToS due diligence**," NOT "the data is unavailable." Do not downgrade to "just wire it" — the current app API has none of this and the source is unofficial.

---

## Reviewed & passing (for reference)
- **Overview tab** — full-width hero, both hero buttons, FormGuide bars, Hot-zones heat map (StrikeZone heat mode), Now pills, mono numerals. ✅
- **Stats tab** — sectioned cards each wrapping a table (not card grids); OPS accented; mono numerals. ✅ (aside from BUG-002 / BUG-003)
- **Splits tab** — six tables under wired Category + Timeframe rails; caption "Showing all 6 split groups · 2026 season"; columns Split | G AB H HR RBI BB K AVG OBP SLG OPS | vs Lg; VBar + green/rust ±delta semantically correct; AVG+OPS accented; zero-HR dimmed; mono. ✅
  - ⚠️ **To verify (not yet a bug):** the timeframe rail's **Career / Last 30d** options — confirm they actually refetch (mock only carried 2026). Can't tell from a 2026-only screenshot.
- **Pitching tab** — renders real body (not "Coming soon"); top filter rail (All / vs LHP / vs RHP / In strike zone / Outside zone); Pitch-mix donut (bright per-pitch palette, shares sum to 100%); Performance-vs-pitch-type table with SLG value+bar in one cell; Damage-by-location heat map + Hottest/Coldest + SLG scale; By-pitcher-handedness with **BRK%** rename + `?` header tooltips; Counts-attacked (solid put-away + dashed go-to). ✅ (aside from BUG-004 / BUG-005)
- **History tab** — renders real body; four working sub-tabs (Game log / Career / vs Team / Postseason); wired season picker (2026…2022); Game-log columns Date | Result (W/L pill) | Opp | H/AB | HR | RBI | BB | K | AVG | Notes; W/L pills green/red; mono numerals. ✅ (aside from BUG-006 / BUG-007)
