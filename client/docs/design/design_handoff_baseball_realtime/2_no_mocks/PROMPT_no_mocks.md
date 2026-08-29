# PROMPT — Wire everything: retiring the last mocked data

28 August 2026. **Goal: no value reaches a user unless it is real, or is explicitly absent.**

Two acceptable end states for every field on every screen:

- **Real** — sourced from the API or derived from real inputs.
- **Absent** — an em-dash, an empty state, or a hidden card. Honest, and clearly nothing.

Everything currently in between — fabricated values shown as real, or mock values shown behind a
"sample" label — comes out. Labels were an interim posture while data was missing. The data now
mostly exists.

Inventory and per-field status: `data-provenance.md`.

---

## Why this is one program and not nine tickets

The remaining mocks are not nine unrelated placeholders. They cluster into three causes, and fixing
them by cause is cheaper than fixing them by screen:

1. **A per-game series reconstructed from season totals** (Rank History, Recent form chips). Two
   shipped instances, one root cause. Both fixed by reading a game log that the app already fetches.
2. **The Jul 19 Statcast ingest landed but was only partly consumed.** It rolled pitch-level rows up
   *by pitch type* for the Pitching tab and stopped. Four surfaces still render mock or a placeholder
   off data that is now sitting in the table.
3. **Fallback constants that fire on empty** (the landing widget's `SAMPLE_*`). Not a data gap — a
   design choice to show something rather than nothing, which was already reversed by decision.

Sequenced by cause, this is four PRs of backend rollup and about six of binding.

---

## Tier 1 — 🔴 Fabricated, shown as real. Fix first.

These are the only three places a user is currently shown an invented value with no indication.

### 1.1 Standings · Rank History (`buildWinsSeries`)

`StandingsPage.tsx` still contains `seedFromStr`, `mulberry32` and `buildWinsSeries` — the design's
placeholder, ported verbatim and still live. It shuffles a W/L array with a seeded PRNG. **Every
line's endpoint is real and every interior point is invented**, and the replay animates through a
season that never happened. It survives review because the seed (`abbr + "_wins"`) makes the fake
history stable across reloads, and each line lands on the team's true win total.

Note the project record said this was fixed on Jul 18. It was not — no per-day series was ever wired.

**Fix.** Add `winsByDay: number[]` to `StandingTeamDto`, built server-side from each team's game log
(MLB's schedule endpoint is the cheap real source). Delete all three client helpers. The chart
already consumes `Record<abbr, number[]>`, so the component needs no change.

**Interim, only if 1.1 slips a release:** ship the provenance caption already in the design — "Shape
is sample data · final total is real". Do not leave it uncaptioned.

### 1.2 Team page · Recent form chips (`buildFormChips`)

Same defect, second instance. Rebuilds the ten chips from `standing.lastTen` (`"8-2"`) and
`standing.streak` (`"W4"`) by putting the streak at the right end and filling leftward with all
remaining wins then all remaining losses. 8–2 with a W4 renders `W W W W L L W W W W`. The row is
captioned `10 games ago` → `Most recent`, so the caption asserts a chronology the data cannot supply.

**Fix.** `SchedulePage.tsx` already calls `fetchSeasonSchedule(teamId, season)`. Take the last ten
completed games in date order. No new endpoint. Full detail in `handoff_team_build/`.

### 1.3 Landing · ScoringWidget `SAMPLE_*` fallbacks

The live widget's win-prob, pitch-mix, field and weather slides fall back to fabricated `SAMPLE_*`
constants behind a `SAMPLE` badge when real data is absent. Already agreed: **replace each with a
per-slide empty state.** The redesigned `holistic/scoring-widget.jsx` does not carry the fallbacks —
port that behaviour.

Note win probability is no longer a gap: it was wired in PR 3.5 (Jun 23). That slide should read the
real feed rather than either a sample or an empty state.

---

## Tier 2 — the Statcast ingest is landed but half-consumed

The Jul 19 ingest wrote pitch-level rows. The Pitching tab consumes them rolled up by pitch type.
**Four surfaces still show mock or a placeholder off data already in that table.** Each needs a
rollup, not an ingest.

| # | Surface | Currently | Needs |
|---|---|---|---|
| 2.1 | Player Stats · **Contact quality / Statcast** (8 rows) | labeled "not available" | `BatterStatcast` player-season rollup |
| 2.2 | Player Overview · **Hot zones** (SLG by location) | gated placeholder | 9-cell zone rollup per batter |
| 2.3 | Upcoming · **Pitcher arsenal** (usage / velo / 9-zone) | mock, subtitle says "sample" | per-pitcher arsenal rollup |
| 2.4 | Upcoming + Pitching · **whiff %** | mock / column absent | swing + miss counts by pitch type |

### 2.1 Contact quality — decided Aug 27, spec written

Resolved to **wire**. Spec: `handoff_player_statcast/PROMPT_player_statcast_states.md` Part A. A
`BatterStatcast` rollup off the same pitch-level table, with **league averages computed from the same
set — no hardcoded constants** — and sample-size floors that keep a row `—` rather than noisy:
`pitchesSeen >= 100` for the four discipline rows, `battedBalls >= 25` for contact quality.

Whiff % is derivable from data already shipped, so **the discipline four are the cheap half** if this
needs to split across two PRs.

### 2.2 Hot zones

BUG-013 gated this with an honest placeholder in June because there was no pitch-location data. There
is now. The design is `SLG by location` over a 9-cell zone map, with the hottest and coldest zone
derived and named (coldest in `info` blue). Same sample-size discipline as 2.1 — a zone with too few
batted balls stays blank rather than showing a small-sample extreme, which on a 3×3 heat map reads as
a real hot spot.

### 2.3 Pitcher arsenal (Upcoming tab)

**Correct the record first:** PR 9.5b was logged as signed off, but `MOCK_SECTION.statcast` was never
flipped. This card has always rendered mock. The "sample" subtitle is still on it, so it is disclosed
rather than silent — but it is not wired, and the tracker said it was.

Wire usage %, average velocity and the 9-zone location map per pitcher from the ingest. Then remove
the section's "sample" subtitle — and do not remove it before the data lands.

### 2.4 Whiff %

The one metric that genuinely needed Statcast, on both the Pitching tab's pitch-type table and
Upcoming's arsenal table. Swings and misses per pitch type are in the pitch-level rows. This closes
the last item held under PR 6.5.

**After 2.1–2.4 land, `MOCK_SECTION` should have no true values left. Delete the flag.**

---

## Tier 3 — computable from data already present

### 3.1 Player Stats · wOBA and wRC+

Currently labeled "not available". Both are formulas over counting stats the app already has, plus
season league constants (linear weights, league wOBA, wOBA scale, park factor). Compute server-side
alongside the other rate stats; do not hardcode the constants — derive league wOBA and scale from the
same season's aggregate, the same rule as 2.1's league averages.

### 3.2 Player Stats · BsR — DECIDED: row removed (Aug 28)

Baserunning runs needs stolen bases, caught stealing, and extra-base advancement. The first two exist;
advancement does not, and a BsR computed from steals alone is a different stat wearing the name.
**The row is deleted from the design** (`holistic/player.jsx`, Advanced section) — delete it from the
app's Stats tab too. A row that will never populate is clutter, not disclosure.

If baserunning advancement later proves derivable from the play-by-play — the Runner Trace feature is
built on exactly that derivation — the row can come back. It is not gated on new data so much as on
someone confirming the play feed's runner movements are complete enough to sum.

### 3.3 Team page · Home / Away / 1-Run splits

`records.splitRecords` is already in the standings payload being parsed. Three explicit DTO fields →
mapper → wire. Detail in `handoff_team_build/` §2a.

### 3.4 Team page · hero venue, city, founded year

On the MLB teams endpoint; `api/src/teams/teams-meta.service.ts` already exists to serve it. Check
whether this is simply an unwired route.

### 3.5 Game view · pitcher season WHIP and handedness

Two data asks from the section-4 sync. WHIP is not on `pitcherLine`; handedness returns raw `P`
instead of `RHP`/`LHP`. Both are small additions and both are currently rendering as gaps in the
condensed mound strip.

---

## Tier 4 — not mock, but showing something untrue

These are not fabricated values, but a user reading them draws a false conclusion. Same category of
harm.

### 4.1 Leaders · the AL/NL filter is not an AL/NL leaderboard

`leaders.service.ts` requests `limit=10` with no `leagueId`; `ranked()` filters that 10-row set
client-side. "AL" therefore shows *the AL players who happened to make the MLB top 10*, re-ranked
1..N. The real AL #5–#10 were never in the payload. Decided Aug 27: **per-league requests**
(`leagueId` 103/104, cache keyed `season:league`) — not the raised-limit shortcut.

This is the same bug as the team-leaders card: a scoped ranking built by filtering a broader
leaderboard. Fix both with scoped queries.

### 4.2 Team leaders card — build it scoped

The card does not exist yet, so this is a chance to not ship the bug a third time. Team-scoped
request (`teamId` + `limit=3` per category), not a filter of the MLB top 10 — which would give an
empty card for most of the league. `handoff_team_build/` §4.

### 4.3 Leaders · `throughDate` dead branch

`LeadersPage.tsx` builds its subtitle from `data.throughDate`, but `LeagueLeadersDto` has no such
field and the service never sets one, so the branch is dead and the subtitle always falls back. Either
add the field (value = cache build time; MLB's endpoint has no as-of date) or delete the branch. Do
not leave a subtitle that claims an as-of date it cannot know.

### 4.4 Player History · IL stint note sits on the wrong game

BUG-007 — the note renders against 04-10 instead of 04-11. Cosmetic, but it is a true fact attached to
a false date.

---

## Tier 5 — latent traps

Neither is on a product screen. Both are shaped exactly like the Tier 1 defect, and both are one
convenient import away from becoming a third instance.

- **`Sparkline`** (`shared.jsx`) takes a `values` array and draws a trend line. `foundations.jsx`
  feeds it the literal `[3,2,4,1,3,2,5,4,3,5]` labelled "Last 10 games · BA."
- **`Stat`'s `trend` prop** renders a ▲/▼ delta. A delta is a two-point series and needs a real prior
  value. Foundations passes `trend={-12}` and `trend={48}` as literals.

**Do not delete them** — both are legitimate atoms. Add a one-line comment on each in `shared.jsx`
pointing at the derived-sequence sweep, and name the data source in the same commit whenever either is
first used on a real screen.

---

## The rule this program should leave behind

Every one of these shipped because a design was drawn against data that did not exist yet, and the
gap was filled with something plausible so the screen could be reviewed. That is the correct thing to
do in a mock. The failure is at the boundary: the placeholder ported into the app along with the
layout.

Two practices close it:

1. **A design file's fabricated values are spec-for-structure, never spec-for-content.** State it in
   the prompt for any card whose data is not yet wired — as `handoff_schedule_page/` already does:
   "the mock's data is fabricated. Structure and formatting are the spec; the numbers are not."
2. **Any element that plots or sequences more than one point gets a provenance row in
   `data-provenance.md` before it ships, and that row must name the per-point source.** "Derived from
   the season total" is not a source.

---

## Suggested sequence

| PR | Contents | Depends on |
|---|---|---|
| **N1** | Rank History `winsByDay`; delete the three PRNG helpers | — |
| **N2** | Recent form chips from the game log; L-chip contrast | — |
| **N3** | Landing widget: drop `SAMPLE_*`, per-slide empty states, win-prob reads the real feed | — |
| **N4** | Statcast rollups — `BatterStatcast`, zone map, pitcher arsenal, whiff | ingest (landed) |
| **N5** | Bind 2.1–2.4; delete `MOCK_SECTION` | N4 |
| **N6** | wOBA / wRC+; decide BsR | — |
| **N7** | Team page: splits, venue, founded year | — |
| **N8** | Scoped leaderboards — Leaders per-league + Team leaders card | — |
| **N9** | Cleanup: `throughDate`, IL-stint date, pitcher WHIP + handedness, atom comments | — |

N1–N3 are the honesty fixes and should go first regardless of what else is in flight. N4 is the only
one with real backend weight; everything after it is binding.

---

## Definition of done

`data-provenance.md` contains **no 🔴 and no 🟡 rows**. Every field is 🟢 wired, 🔵 deliberately
absent with an honest empty state, ⚪ static, or 🟣 derived from wired inputs. `MOCK_SECTION` is
deleted. `seedFromStr`, `mulberry32`, `buildWinsSeries`, `buildFormChips` and the `SAMPLE_*` constants
are gone from the client.
