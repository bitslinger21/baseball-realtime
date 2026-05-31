# Win Probability & Leverage Index — Implementation Research

**Status**: STUBBED — both features display placeholder values in the v2 game view.  
**Decision date**: 2026-05-31  
**Relevant design file**: `client/docs/design/design_handoff_baseball_realtime/holistic/game-v2.jsx`  
**Components**: `WinProbTimeline`, `LeverageCard`

---

## Current State (Stub)

Both components are present in the `game-v2.jsx` design as half-width cards below the `MatchupLeft` / `PitchByPitchV2` two-column layout. They are stubbed in the v2 implementation with:

- `WinProbTimeline` — flat 50/50 line, labeled "Win Prob (coming soon)"
- `LeverageCard` — static "—" placeholder

Neither requires any API changes while stubbed.

---

## Why These Are Missing from the API

**Win probability** is a sabermetric calculation, not a raw stat. The MLB Stats API public live feed (`/api/v1.1/game/{gamePk}/feed/live`) does not include a win probability field. Confirmed by:
- Grepping the entire API source (`api/src/**/*.ts`) — zero hits for `winProb`
- Inspecting `mlb.types.ts` — no `winProbability` field in any typed struct
- Inspecting `toPlayWire()` in `realtime.gateway.ts` — field not emitted on socket

**Leverage index** is also absent and is not available in any MLB feed at all (it's a FanGraphs/Baseball Reference derived concept, not an MLB native stat).

**ESPN** does expose win probability via an undocumented JSON endpoint (`site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event={espnEventId}`), but requires maintaining a separate ESPN ↔ MLB game ID mapping and is fragile (undocumented, can break without notice).

---

## Recommended Implementation Approach

### Data Source

**Use `gregstoll/baseballstats` `probs.txt`** rather than Tango's `we.html`.

Reasons:
- Derived from Retrosheet play-by-play, covers 1903–2025 (vs Tango's 2010–2015)
- Also ships `probswithballsstrikes.txt` — includes ball/strike count in the state key, which is directly available on every pitch event in this app's socket stream
- Text format, easy one-time conversion to JSON

Repo: https://github.com/gregstoll/baseballstats  
Files of interest: `probs.txt`, `probswithballsstrikes.txt`

Tango's table is also authoritative and worth cross-referencing: https://tangotiger.net/we.html

### Win Expectancy Table Format

**`tangotiger.net/we.html`** (visual reference):

| Dimension | Values |
|-----------|--------|
| Inning | 1–9 (extras treated as repeat of 9) |
| Half | top / bottom |
| Outs | 0, 1, 2 |
| Runners | 8 states (bitmask 0–7: bit0=1B, bit1=2B, bit2=3B) |
| Score differential | -5 to +5 (home team perspective; beyond ±5 clamp to floor/ceiling) |
| Value | Home team win probability, 0.0–1.0 |

Total entries: 9 × 2 × 3 × 8 × 11 ≈ **4,750 rows** — ~150KB as JSON, negligible.

**`gregstoll/baseballstats` key format** (from `probs.txt`):

```
BBB_O_HI_RD
```

Where:
- `BBB` = base bitmask (e.g. `100` = runner on 1B only, `111` = bases loaded)
- `O` = outs (0, 1, 2)
- `HI` = half+inning (e.g. `T1` = top of 1st, `B9` = bottom of 9th)
- `RD` = run differential (home team perspective, clamped)

### Recommended JSON Key (after conversion)

```
`${inning}:${half}:${outs}:${runnersBitmask}:${clamp(scoreDiff, -5, 5)}`
```

Example: `"7:top:1:3:-1"` → `0.321`

Runners bitmask derivation from socket `bases` field (which is already a bitmask on the wire):
```ts
// bases comes from the socket as a number: bit0=1B, bit1=2B, bit2=3B
const runnersBitmask = latest.bases; // 0–7
```

### Leverage Index

LI is derived from the WE table — it is **not** a separate raw lookup, it is computed:

```
LI(state) = E[|ΔWE|] at this state / E[|ΔWE|] averaged across all states
```

Practical approach:
1. For each game state, enumerate all possible outcomes (out, walk, single, double, triple, HR) with their historical frequency
2. For each outcome, look up the resulting WE from the table
3. Compute weighted average of `|WE_after - WE_before|`
4. Normalize by the grand mean across all states

This is a **one-time offline calculation** producing a second static `leverage.json` with the same key structure.

Alternatively: Tango's blog has pre-computed LI values for all 288 base-out-inning states (without score differential), which could serve as a reasonable approximation.

### Server-Side Implementation (When Ready)

1. **Data prep** (one-time, offline):
   - Fetch `probs.txt` from `gregstoll/baseballstats`
   - Write a conversion script (Node or Python) → `win-expectancy.json`
   - Compute leverage offline → `leverage.json`
   - Commit both as static data files in `api/src/win-expectancy/data/`

2. **`WinExpectancyService`** (NestJS):
   ```ts
   // Loads JSON at startup
   getWinProb(inning, half, outs, runners, scoreDiff): number
   getLeverageIndex(inning, half, outs, runners, scoreDiff): number
   ```

3. **Wire integration** — add two fields to `toPlayWire()` in `realtime.gateway.ts`:
   ```ts
   homeWinPct: winExpService.getWinProb(...),
   leverageIndex: winExpService.getLeverageIndex(...),
   ```

4. **SDK regeneration** — after adding fields to the gateway/DTOs, run the full SDK pipeline:
   ```
   spec:check → spec:gen → client:build → client:publish → client install
   ```
   (See `aidlc-docs/research/` memory for SDK workflow.)

5. **Client** — `WinProbTimeline` reads `PlayUpdate.homeWinPct` across `completedAtBats` to draw a sparkline. `LeverageCard` reads `latest.leverageIndex`.

### Scope Estimate

| Task | Effort |
|------|--------|
| Data wrangling (fetch, convert, commit JSON) | ~2–3h |
| `WinExpectancyService` + unit tests | ~3–4h |
| Wire `toPlayWire()` + SDK regen | ~1h |
| `WinProbTimeline` sparkline component | ~3–4h |
| `LeverageCard` display component | ~1–2h |
| **Total** | **~1 day** |

---

## Sample Values (Reference)

From Tango's `we.html` — home team win probability:

| State | -2 | -1 | Tie | +1 | +2 |
|-------|----|----|-----|----|----|
| Inn 1, top, 0 out, empty | .306 | .399 | .500 | ~.601 | ~.694 |
| Inn 7, bot, 0 out, empty | — | .353 | .586 | — | — |
| Inn 9, bot, 0 out, empty | — | .194 | .634 | — | — |
| Inn 9, bot, 2 out, empty | — | — | — | — | .966 |

---

## Related Links

- Tango WE table (visual): https://tangotiger.net/we.html
- Tango WE list (innings 7–9 subset): https://tangotiger.net/welist.html
- Greg Stoll WE Finder (source on GitHub): https://gregstoll.com/~gregstoll/baseball/stats.html
- gregstoll/baseballstats repo: https://github.com/gregstoll/baseballstats
- FanGraphs WE explainer: https://library.fangraphs.com/misc/we/
- Run Expectancy Matrix (Tango, 1950–2015): https://www.tangotiger.net/re24.html
