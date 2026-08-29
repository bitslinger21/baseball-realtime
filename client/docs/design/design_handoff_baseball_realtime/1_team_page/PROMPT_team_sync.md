# PROMPT — Team page sync (`/team/:teamAbbr` + `/schedule`)

Reconciles the team page design against the shipped app. Read against
`client/src/pages/TeamPage.tsx`, `TeamPage.css`, `SchedulePage.tsx`, `AppRoutes.tsx`,
`utils/teamNicknames.ts`, `api/src/standings/*`.

Design of record: `PROMPT_team_page.md` + `Team Page - Overview.html`,
`Team Page - Today card states.html`, `Team Page - Schedule.html`.

**What shipped:** hero, Today/Last/Next card, Recent form chips, division standings, Next up, and a
full season Schedule page. Routes `/team/:teamAbbr` and `/team/:teamAbbr/schedule` are both live and
wired, and `backLabel.ts` handles returns from both.

**What did not:** two of the eight specified cards, plus the items below. This is mostly *app owes
design*, not design drifting from the app.

---

## BUG 1 (critical) — Recent form chips show a sequence that never happened

`buildFormChips()` does not read a game log. It reconstructs the chip row from two **season summary
strings** — `standing.lastTen` (`"8-2"`) and `standing.streak` (`"W4"`) — by:

1. putting the streak at the right end (most recent),
2. then filling leftward with **all remaining wins, followed by all remaining losses**.

So a team at 8–2 with a 4-game win streak renders `W W W W L L W W W W` — grouped, tidy, and
fictional. The real order is unknowable from this data, and the code says so:

```ts
// Order is approximate — the actual per-game sequence isn't available from standings.
```

Design §5 specifies "Oldest left", i.e. real chronological order. A user reading the card sees a
narrative — a slump then a surge — that is an artefact of the sort.

**This is the same class of defect as Rank History's `buildWinsSeries`** (see
`handoff_standings_sync/PROMPT_standings_sync.md` BUG 1): a plausible-looking series derived from
totals, stable across reloads, reconciling against the real summary beside it, and therefore invisible
in review. Two of these have now shipped from the same root cause — a card designed around a per-game
series that the API only exposes in aggregate.

**Fix.** The team's game log is already reachable: `SchedulePage.tsx` calls
`fetchSeasonSchedule(teamId, season)` and derives per-game `status` and scores for the whole season.
Reuse it — take the last ten completed games in date order and map win/loss per game. No new endpoint.

Until that lands, the chips must not imply order: either render the row as a **count** (8 W chips,
2 L chips, explicitly summarised and labelled "last 10 · order not shown") or drop the row and keep
the splits. Do not ship the reconstructed sequence.

---

## BUG 2 — both scores dim during a live game

```ts
const awayWon = status === 'final' && (away ?? 0) > (home ?? 0);
const homeWon = status === 'final' && (home ?? 0) > (away ?? 0);
...
<div className={`tp__gscore num${awayWon ? '' : ' tp__gscore--dim'}`}>
```

Both flags are `false` unless the game is final, and the dim class is applied whenever the flag is
false. So in a **live** game both scores render `tp__gscore--dim`, and in a **tie** final both dim
too. Design §4 dims the loser's score *only* on a final.

**Fix:** apply the dim class only when `status === 'final'` and this side did not win —
`status === 'final' && !awayWon`. Live and tied games keep both scores ink.

---

## BUG 3 — the card footer is empty for live and final games

```tsx
{(status === 'live' || status === 'final') && <span />}
<button className="tp__enter-btn" onClick={onEnter}>Enter game →</button>
```

An empty `<span/>` holds the grid slot, so live and final cards show only the button. Design §4
specifies content for both:

- **Live** — both pitchers' live lines
- **Final** — `W Pressly (4–2) · L Romano (3–5) · Alvarez 2 HR, 4 RBI`, with the `W`/`L` letters in
  `positive` / `textMuted`

The Upcoming state's footer (`Probables: …`) is correctly implemented, so the pattern is already
there. Decisions and game-leader lines exist on the game view's dark band, so the data path is known.

---

## BUG 4 — the design of record fails AA on the Recent form L chip

A contrast audit of `Team Page - Overview.html` found one failure, and the spec **tells you to build
it**. `PROMPT_team_page.md` §5 said "`positive` fill for W, `borderStrong` for L, `surface` text":

| Chip | Foreground | Background | Ratio |
|---|---|---|---|
| W | `#fcfaf6` surface | `#3f6b34` positive | 5.98:1 — passes |
| **L** | `#fcfaf6` surface | `#b4ae9b` borderStrong | **2.13:1 — fails** |

The asymmetry is what marks it as an oversight rather than deliberate de-emphasis: W is comfortably
legible and L reads as a near-blank tan tile. 12px/700 does not qualify for the 3:1 large-text
exemption, which starts at 18.66px bold.

Two things make this worse than a nitpick. It is **2.13:1** against the Jul 4 contrast pass whose
headline fix was `textFaint` at **2.4:1** — so this is worse than the problem that pass existed to
solve, and it shipped after it. And the root cause is the precise misuse that pass guarded against:
`borderStrong` is a **border** token being used as a **fill behind text**, the same confusion the pass
addressed by splitting `highlight` (shapes/fills) from `highlightText` (text).

**Fixed design-side:** `.fchip.l` keeps the light `borderStrong` fill — which correctly encodes "loss
is recessive" next to the green W — and the glyph moves to `ink` `#15161a`, about 8.2:1. Intended
asymmetry preserved, legibility restored. Applied to `Team Page - Overview.html` and §5 of
`PROMPT_team_page.md`; the app's `.tp__fchip--l` needs the same one-line change.

**Sequencing note:** if BUG 1's interim treatment renders the row as an explicit count, the L chips get
*more* prominent, not less. Fix this contrast before or alongside that change.

---

## Two cards to build — BUILD BOTH (decision, Aug 28)

Neither of these needs design work. Both are drawn, specced and sitting in
`Team Page - Overview.html`; the app has simply never built them. Port them at parity with the
design file — read the markup there rather than working from the prose.

### Roster (§6) — build the table

Currently renders `Roster data coming soon`. It is a **table**, not cards.

- Grouped by position with `surfaceAlt` full-width group rows: `Infield` / `Outfield` / `Catcher`.
- Columns `# · Name · Pos · AVG · HR · RBI · OPS`. Header 11.5px/700/uppercase/`.07em`/`textFaint`,
  left-aligned, `1px border` bottom.
- Number column `textFaint` 12px mono. Name 600, links to `/player/:mlbId`. Pos `textMuted`.
- **All four stat columns mono, right-aligned, tabular-nums.** Row hover `surfaceAlt`.
- Header carries the `Batters / Pitchers` Segmented, already present and correctly inert — keep it
  inert. The Pitchers view is a separate, undesigned table.

**Data:** existing endpoints — roster plus per-player season batting stats, the same source the
player view's hero slash line reads. No new API.

### Team leaders (§8) — build the card, but the query is the work

Not stubbed, not rendered, no placeholder: the card is simply not in `TeamPage.tsx`.

- Two stacked top-3 lists — **Home runs**, then **Batting average** — separated by a `borderLight`
  divider with 14px padding above the second eyebrow.
- Each row: rank (mono, `textFaint`) · name (links to `/player/:mlbId`, abbreviated `Y. Alvarez`) ·
  value (mono 14px, right-aligned).
- Header: `Team leaders` + `Bat / Pitch` Segmented, Bat only for now.

**Data: this needs a team-scoped query, not a filter.** The leaders service already fetches full
leaderboards, so filtering that payload by team is the obvious shortcut — and it is wrong, for the
same reason as the **`limit=10` scoping bug** in `handoff_leaders_sync/PROMPT_leaders_sync.md` BUG 2.
The existing payload is the MLB **top 10**. Most teams' HR leader is not in the MLB top 10, so a
client-side filter yields an **empty card for most of the league** — and an empty card here reads as
"this team has no leaders," not as "the query was scoped wrong."

Add a team-scoped leaderboard request (`teamId` + `limit=3`, per category) and cache it the same way
the league leaders are cached. This is the same fix shape as the Leaders league filter — per-league
requests rather than a client-side slice of a broader payload.

---

## Empty data in shipped cards — DECISION: WIRE ALL THREE (Aug 28)

| Field | Shipped | Design | Source |
|---|---|---|---|
| Recent form splits — Home / Away / 1-Run | all three render `—` | real records | `records.splitRecords` |
| Hero founded year | `Est. —` | `Est. 1962` | `firstYearOfPlay` |
| Hero venue + city | absent | `Daikin Park · Houston, TX` | `venue.name` + `venue.city` |

Same question as the player view's Contact quality rows, and the same answer. The data exists in
payloads the app is already parsing; a card that renders `—` forever is a card that was never
finished.

**Splits.** `StandingTeamDto` has no home/away/one-run breakdown, but MLB's standings endpoint
returns `records.splitRecords` — `{ type, wins, losses }` with `home`, `away`, `oneRun` among the
types. Three steps, the same shape as the PR 3.5 win-prob work: add three explicit fields to the
DTO (not the raw array — the card wants exactly three and MLB's type list is longer and unstable),
pick them out in `standings.service.ts`, format `W–L`. No new endpoint.

**Venue and founded year** are on the MLB teams endpoint, which `api/src/teams/teams-meta.service.ts`
already exists to serve. Check first whether this is simply an unwired route rather than missing data.

Full detail in §12 of `PROMPT_team_page.md`. The **em-dash fallback stays** for values the API
genuinely lacks — what is withdrawn is the plan to leave these three em-dashed permanently, and the
earlier instruction to feature-check the splits and leaders cards.

---

## Smaller items

- **Live center is missing the runners.** Design §4: `2 out · 1B, 3B`. App renders `{outs} out` only.
  Base state is on the game feed already.
- **Hero eyebrow** is built by string-replacing an abbreviation back into a full league name
  (`divisionAbbr.replace('AL ', 'American League ')`) after having derived the abbreviation from the
  full name two lines earlier. Read `leagueName` / `divisionName` directly.
- **Dead code:** `const tagLabel = weekday ? ... : time;` in `TodayCard` is assigned and never used.
- **`getBackLabel`** already returns `"Schedule"` for `/team/:abbr/schedule` — correct, no change.

---

## Column normalised to 1240/28

The design was `max-width: 1180px; padding: 0 32px`; the project standard is **1240 / 28** (the game
view being the one declared 1600 exception). Updated in `Team Page - Overview.html` and §10 of
`PROMPT_team_page.md`, including the sticky app bar's inner wrap (`14px 32px` → `14px 28px`) so the
bar stays aligned with the content beneath it.

The app's `.tp__wrap` needs the same change. Standings (`.st-wrap`, 1180/32) and Leaders (1200) are
the other two off-standard columns — all three should move together so the set is consistent.

---

## Schedule page changes (Aug 28)

These are design changes made this session, not app drift. `Team Page - Schedule.html` and §11 of
`PROMPT_team_page.md` carry the detail; the app owes all four.

### 1. Season picker replaces the static eyebrow

The page head's eyebrow was static text (`Houston Astros · 2026`). It is now a **season picker**:

```
HOUSTON ASTROS   2025   2026   2027
```

- Range is `season-1 … season+1`, **derived, never hardcoded**. Default is the current season.
- Selected: **13px, `ink`**. Unselected: **11px, `textFaint`**, hover to `ink`. One size up and darker
  is the entire selected treatment — no pill, no underline, no rule.
- Real `<button>`s, `display: flex`, `gap: 9px`, `align-items: baseline` so the larger selected year
  shares a baseline with its neighbours. Selection is marked with `aria-current="true"`, and that
  attribute — not a class — drives the styling.
- Changing year loads that season's schedule and resets the month accordions to the default (current
  month for the live season, otherwise the first month with games). A future season with no published
  schedule shows the empty state, not a blank grid.

### 1b. Team switcher (new)

The team name in the page head is now a dropdown trigger — 280px menu, all 30 teams grouped by
division, logo + nickname rows, current team marked with a rust bullet and scrolled into view on
open. Closes on selection, outside click or `Esc`. Selecting a team loads that team's schedule for
the currently selected season (the season picker does not reset).

Full spec in §11 of `PROMPT_team_page.md`. One implementation gotcha noted there: scope the logo
rule as `.tmmenu .tmrow img` or the page head's existing `.phead-id img` wins and logos render 42px.

### 2. Month rail and season picker share one style

The month chips were boxed (border, background, padding, radius, 11.5px/500). They are now identical
to the year buttons: bare mono text, 11px `textFaint`, **13px `ink` when selected**, `gap: 9px`,
baseline-aligned, hover to `ink`. The two rails now read as one system rather than two unrelated
controls stacked in the same bar.

### 3. Filter rail removed

The `All / Results / Upcoming / Home / Away` Segmented is gone — markup and all five `.seg` CSS rules
deleted. The month rail is the only control in the bar, left-aligned and filling the width; the bar's
`justify-content: space-between` was dropped. Those chips were inert in the app anyway.

### 4. Column normalised to 1240/28

`Team Page - Schedule.html` was `max-width: 1180px; padding: 0 32px`, including the app bar's inner
wrap. Now 1240/28 like Overview. **This one was user-visible:** the two views link to each other, so
navigating between them shifted the SC◆REBOOK mark and the whole content column by 4px and changed
the content width by 60px — the header jumped on every transition. The app's `.sch-wrap` (or
equivalent) needs the same change.

---

## Not a delta

The `Est. —` / `—` splits render as honest em-dashes rather than fabricated values, which is the right
posture and the opposite of BUG 1. Keep that instinct; BUG 1 is where it lapsed.
