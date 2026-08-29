# PROMPT — Team page: wire the gaps, build the two missing cards

28 August 2026. Three pieces of work, all decided, none blocked on design.

Read against `client/src/pages/TeamPage.tsx`, `TeamPage.css`, `api/src/standings/*`,
`api/src/teams/teams-meta.service.ts`, and the leaders service.

Design of record: `PROMPT_team_page.md` (§3, §5, §6, §8, §12) + `Team Page - Overview.html`. Port
from the HTML, not from the prose — the markup is the spec.

This prompt is the **build** half of the team-page work. The **bug** half is
`handoff_team_sync/PROMPT_team_sync.md` (BUG 1–4), and BUG 1 overlaps with §1 below — do them
together.

---

## 1. Recent form chips must read a real game log

**Do this first. It is the same fix as BUG 1 in the sync prompt.**

`buildFormChips()` reads no game log. It rebuilds the ten chips from two season summary strings —
`standing.lastTen` (`"8-2"`) and `standing.streak` (`"W4"`) — by putting the streak at the right end
and filling leftward with all remaining wins, then all remaining losses. A team at 8–2 with a W4
renders `W W W W L L W W W W`. Tidy, stable across reloads, reconciling against the L10 beside it,
and fictional. The code comment concedes the order is "approximate."

The row is captioned `10 games ago` → `Most recent`. The caption asserts a chronology the data cannot
supply, which is what makes this a defect rather than an approximation.

**Fix.** `SchedulePage.tsx` already calls `fetchSeasonSchedule(teamId, season)` and derives per-game
status and scores for the whole season. Reuse it: take the last ten **completed** games in date
order, map win/loss per game, render oldest-left. No new endpoint.

**Bind each chip to its game.** Every chip carries date + opponent + score (tooltip). A chip that
must name its game cannot be built from `lastTen` + `streak` — the fix becomes structural rather
than a rule someone has to remember. Legend shows real dates, not "10 games ago".

**Interim, if the log can't be reached this PR:** render the row as an explicit count — 8 W chips, 2
L chips, labelled `last 10 · order not shown` — and drop the `10 games ago` / `Most recent` legend.
Never ship the reconstructed sequence.

**Also fix the L chip's contrast in the same pass** (BUG 4): `.tp__fchip--l` is `surface` `#fcfaf6`
on `borderStrong` `#b4ae9b` — **2.13:1**, failing AA. The glyph moves to `ink` `#15161a` (~8.2:1).
The light fill stays: it correctly encodes "loss is recessive" next to the green W. Sequence this
before or with the count treatment — an explicit count makes the L chips *more* prominent, not less.

---

## 2. Wire the three em-dashed fields

Decision: **wire all three.** Same question as the player view's Contact quality rows, same answer.
The earlier instruction to feature-check these behind a data gate is withdrawn — the data exists.

| Field | Shipped | Target |
|---|---|---|
| Recent form splits — Home / Away / 1-Run | all three `—` | real `W–L` records |
| Hero founded year | `Est. —` | `Est. 1962` |
| Hero venue + city | absent | `Daikin Park · Houston, TX` |

### 2a. Home / Away / 1-Run splits

MLB's standings endpoint returns `records.splitRecords`, an array of `{ type, wins, losses }` with
`home`, `away` and `oneRun` among the types. `StandingTeamDto` has no breakdown today. Three steps,
the same shape as the PR 3.5 win-prob work:

1. **type** — add three explicit fields to `StandingTeamDto`: `homeRecord`, `awayRecord`,
   `oneRunRecord`. Prefer these over passing the array through — the card wants exactly three, and
   MLB's type list is longer and unstable.
2. **mapper** — pick the three types out of the raw payload in `standings.service.ts`. The data is
   already in the response being parsed.
3. **wire** — format `W–L`, render into the three split columns. Value 17px mono, label 11.5px
   uppercase.

### 2b. Venue, city, founded year

Both are on the MLB teams endpoint, and `api/src/teams/teams-meta.service.ts` already exists to serve
team metadata. **Check first whether this is simply an unwired route** before adding anything.

Fields: `venue.name`, `venue.city` (or `locationName`), `firstYearOfPlay`. Render into the hero meta
line as `Daikin Park · Houston, TX` · `Est. 1962`, separated by the existing dot.

### 2c. Keep the fallback

The em-dash stays for values the API genuinely lacks. What is withdrawn is leaving *these three*
em-dashed permanently. An honest `—` is the right posture and the opposite of §1's defect.

---

## 3. Build the Roster table

Currently renders `Roster data coming soon`. It is a **table**, not cards.

- Grouped by position with `surfaceAlt` full-width group rows: `Infield` / `Outfield` / `Catcher`.
- Columns `# · Name · Pos · AVG · HR · RBI · OPS`.
- Header cells 11.5px / 700 / uppercase / `.07em` / `textFaint`, left-aligned, `1px border` bottom.
- `#` column `textFaint` 12px mono. Name 600, links to `/player/:mlbId`. Pos `textMuted`.
- **All four stat columns mono, right-aligned, `tabular-nums`.**
- Row hover `surfaceAlt`.
- The `Batters / Pitchers` Segmented in the header is already present and inert — **keep it inert.**
  The Pitchers table is a separate, undesigned screen.

**Data:** existing endpoints — roster plus per-player season batting stats, the same source the
player view's hero slash line reads. No new API.

---

## 4. Build the Team leaders card — the query is the work

Not stubbed, not rendered, no placeholder: the card is simply absent from `TeamPage.tsx`.

**Layout.** Two stacked top-3 lists — **Home runs**, then **Batting average** — separated by a
`borderLight` divider with 14px padding above the second eyebrow. Each row is
`rank · name · value`: rank mono `textFaint`, name links to `/player/:mlbId` and abbreviates
(`Y. Alvarez`), value mono 14px right-aligned. Header carries a `Bat / Pitch` Segmented — Bat only
for now.

**Data — use a team-scoped query, not a client-side filter.**

The leaders service already fetches full leaderboards, so filtering that payload by team is the
obvious shortcut. It is wrong, for the same reason as the `limit=10` scoping bug in
`handoff_leaders_sync/PROMPT_leaders_sync.md` BUG 2: the existing payload is the MLB **top 10**. Most
teams' HR leader is not in the MLB top 10, so a client-side filter returns **an empty card for most
of the league** — and an empty card here reads as "this team has no leaders," not as a scoping
mistake.

Add a team-scoped leaderboard request (`teamId` + `limit=3`, per category) and cache it the way
league leaders are cached. Same fix shape as the Leaders league filter: a scoped request, not a slice
of a broader payload.

---

## 5. Standing rule from the derived-sequence sweep

§1 is the **second** shipped card built on a per-game series the API only exposes in aggregate. The
first was Standings' Rank History (`buildWinsSeries`). Every other multi-point surface in the app was
swept for a third and **none was found** — FormGuide, Last 5 games, the History game log and its
running AVG, win-probability, leverage, the at-bats scorebook row, line-score innings and the season
Schedule grid all read a real log. Full table in `data-provenance.md` → *Derived-sequence sweep*.

Two latent traps, both in `shared.jsx`, both appearing only on the review-only foundations page:

- **`Sparkline`** takes a `values` array and draws a trend line. Foundations feeds it the literal
  `[3,2,4,1,3,2,5,4,3,5]` under the label "Last 10 games · BA."
- **`Stat`'s `trend` prop** renders a ▲/▼ delta. A delta is a two-point series — it needs a real
  prior value, not a plausible one.

**Rule going forward:** any element that plots or sequences more than one point gets a provenance row
in `data-provenance.md` before it ships, and that row must name the **per-point** source. "Derived
from the season total" is not a source. When `Sparkline` or `trend` is next used on a real screen,
name its data source in the same commit.

---

## Suggested PR split

| PR | Contents | Gated? |
|---|---|---|
| A | §1 form chips from the game log + §2c L-chip contrast | No |
| B | §2a splits (type → mapper → wire) + §2b venue/founded | No |
| C | §3 Roster table | No |
| D | §4 Team leaders + the team-scoped leaderboard query | No — but the query is backend work |

None of the four is blocked on new data. A is the one with a correctness deadline; the rest are
completeness.
