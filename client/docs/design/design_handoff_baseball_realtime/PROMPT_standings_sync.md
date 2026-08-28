# PROMPT — Standings sync

Reconciles the Standings design against the shipped app. Read against
`client/src/pages/StandingsPage.tsx`, `StandingsPage.css`,
`api/src/standings/standings.service.ts`, `api/src/standings/dtos/standing-team.dto.ts`.
Design source: `holistic/standings.jsx`.

The per-division card flip, the division card structure, the rust lead-row tint and the chart's
hover/replay behaviour all match. Three bugs below, then the deltas.

---

## BUG 1 (critical) — Rank History still shows invented data

**The project record is wrong.** `CLAUDE.md` states:

> Jul 18, 2026 — Rank History data LIVE. Backend wired the real day-by-day cumulative-win series
> into the ported Standings page — the design source's fabricated `buildWinsSeries` was the
> placeholder for this and is now superseded.

That never happened. Confirmed by direct read:

- `StandingTeamDto` carries **season totals only** — `wins`, `losses`, `pct`, `gamesBack`,
  `lastTen`, `streak`. There is no per-day or per-game series field.
- `standings.service.ts` maps exactly those fields off the MLB standings endpoint. It never
  fetches or builds a time series.
- `StandingsPage.tsx` **still contains `seedFromStr`, `mulberry32` and `buildWinsSeries`** — the
  design's placeholder, ported verbatim and still live.

What `buildWinsSeries` does: takes the team's real win/loss totals, builds an array of 1s and 0s,
**shuffles it with a seeded PRNG**, accumulates it, and interpolates the result onto calendar days.

So every line's **endpoint is real** and **every interior point is fabricated**. The animated
replay walks the viewer through a season narrative — streaks, collapses, a late surge — that never
happened. Two properties made this survive review:

1. The seed is `abbr + "_wins"`, so the fake history is **stable across reloads**. It never
   flickers or looks random.
2. Each line lands exactly on the team's true win total, so it reconciles against the standings
   table beside it.

**This is the highest-priority item on the page.** Options, in order of preference:

1. **Wire a real series.** Add `winsByDay: number[]` (or `{ date, wins }[]`) to
   `StandingTeamDto` and build it server-side from the team's game log — the MLB schedule endpoint
   returns per-game results for a season, which is the cheapest real source. Then delete
   `seedFromStr`, `mulberry32` and `buildWinsSeries` from the client. The chart component needs no
   other change; it already consumes a `Record<abbr, number[]>` indexed by day.
2. **Disclose it.** If the series can't be wired now, the chart must say so. The design now carries
   a caption under the plot — `Shape is sample data · final total is real`, 11px `textFaint`,
   centered — matching the disclosure pattern already used on the Upcoming tab's sample sections.
   **Ship this immediately even if option 1 is queued**, so nothing undisclosed stays in front of
   users.
3. Remove the flip until the data exists.

Do not leave it as it is. And update `PROMPT_rank_history.md` / `PROMPT_rank_history_v2.md`, which
were revised against work that never landed.

---

## BUG 2 — the page renders two "Standings" headings

`StandingsPage.tsx` renders `<PageTitle … title="Standings" />`, and then inside `st-head`:

```tsx
<h1 className="st-title">Standings</h1>
```

`.st-title` is `font-size: 34px` and is not hidden anywhere in `StandingsPage.css`, so both
headings are visible — the `PageTitle` one, then a second 34px one below it.

The `st-head` block also duplicates the subtitle: its `st-eyebrow` reads
`2026 season · through {THROUGH_DATE}`, which is what `PageTitle`'s `subtitle` slot is for on every
other page.

**Fix:** drop the `st-head` block's own `h1` and eyebrow, and pass them to `PageTitle`
(`title="Standings"`, `subtitle={"2026 season · through " + THROUGH_DATE}`) like Leaders and the
player view do. Keep `st-psub` — see the deltas below.

---

## BUG 3 — three CSS rules hardcode the pre-contrast-pass border

The Jul 4 contrast pass moved `border` from `#e0dccd` to `#cfc8b4` at the token source. Three rules
in `StandingsPage.css` hardcode the **old** value and so missed the fix:

- `.st-card-hd { border-bottom: 1px solid #e0dccd; }`
- `.st-row { border-bottom: 1px solid #e0dccd; }`
- `.st-azrow { border-bottom: 1px solid #e0dccd; }`

These are the division card's header rule and every team row separator — i.e. most of the visible
rules on the page are still the weak pre-pass colour. Replace all three with
`var(--color-border)`.

While there: `.st-n--gb`, `.st-n--dim` and `.st-az-pct` hardcode `#5c574f`. The value is correct
(it is `textMuted`) but it should be `var(--color-text-muted)` so the next token pass reaches it.

---

## Synced into the design (app was right)

**A–Z view — adopted.** App-only until now. Three-column alphabetical list of all 30 teams,
`24px 1fr 62px 48px` rows: logo · nickname + city · W–L · PCT, `surfaceAlt` on hover, whole row
links to the team page. Now in `holistic/standings.jsx` as `AZView` / `AZRow`.

**Order control — adopted.** The app's `Order` eyebrow + `Segmented`, and its `Standing` label in
place of the design's `Divisional`.

**Standalone Rank History view — dropped from the design.** The design had it as a third view with
a nine-option scope selector (all MLB / league / division / wild-card race). The app covers rank
history entirely through the per-division card flip, which is the better model — it puts the chart
next to the teams it describes and needs no scope picker. `RankHistoryCard`, `RANK_SCOPES`,
`teamsForScope` and `ALL_TEAMS` are left in the file **unmounted**, same convention as the retired
`PitcherCard`.

**Subtitle line — adopted.** `Every team links to its page — record, schedule and roster` now sits
opposite the Order control (the app's `st-psub`).

---

## Fixed in the design (design was wrong)

**Team rows pointed at the wrong screen.** `TeamRow` called
`window.openGameView()` — clicking a team in the standings opened a *game*. The app correctly links
to `/team/${abbr}`. Design now calls `window.openTeamPage(abbr)`, newly defined in
`holistic/shared.jsx` alongside `openGameView` / `openPlayerOverview`.

Because the team page **is not designed yet**, that global deliberately does not no-op: it focuses a
team artboard if `window.__teamArtboard` is ever set, and otherwise shows a brief dark toast —
`Team page (NYY) isn't designed yet`. A silent no-op behind a `window.openTeamPage && …` guard is
indistinguishable from a working link, and this page renders 90 rows (30 division · 30 Wild Card ·
30 A–Z) that all promise navigation via `cursor: pointer` and hover states, under a subtitle that
claims "Every team links to its page". In the app these are real `<Link to={/team/${abbr}}>` and the
toast is irrelevant — it exists so the design harness cannot quietly lie.

**Every division card rendered blank.** The flip's back-face wrapper was mounted unconditionally
with an opaque `surface` fill, and it painted over the front card — backface culling is not reliable
for an absolutely-positioned child inside a `preserve-3d` parent. Only the wrapper's *children* were
gated on `flipped`, not the wrapper itself. Now the whole back face mounts only while flipped.

**Worth checking in the app:** the game view's pitch-by-pitch scorecard flip (`pbpv2-flipper`) uses
the same front/back construction. `.st-card-flip-face--back` in `StandingsPage.css` is likewise
`position: absolute; inset: 0` with `backface-visibility: hidden` and no conditional mount — if the
app's division cards render correctly today it is because `DivisionMiniChart` returns nothing until
`isActive`, leaving the face empty rather than opaque. That is luck, not design; gate the face.

**Division card header was navy; the app's is light — and the flip button is the scorebook mark.**
The design had a navy `HeaderBand` with a line-chart glyph for the flip trigger. The app's
`.st-card-hd` sits on `--color-surface` with a muted 12px uppercase label and a bottom rule, and its
flip button (`pbpv2__flip-btn`) is the **rust scorebook diamond** — `<polygon points="7,1 13,7 7,13
1,7">`, `stroke #b8421e` — the same glyph as the rebrand mark and the game view's scorecard flip.
The design now matches: `HeaderBand` takes a `light` variant (used by the division card; the Wild
Card card keeps navy), and the trigger is a bare 24px rust diamond with a soft rust hover wash. It
needed the light ground to read — rust on navy fails contrast.

**Design is ahead here:** the app's flip button has no hover state and no `aria-label`. Add both.

**Root `Standings.html` regenerated.** It was a stale self-contained snapshot that did not load the
design source, so design changes were invisible in it. It is now a thin harness over
`holistic/shared.jsx` + `holistic/standings.jsx`. The superseded `_standings_handoff/` folder (a
second stale copy, with its own stale `holistic/standings.jsx`) was deleted.

---

## Design is ahead (app to add)

**Wild Card view is missing from the app.** The design has three orders — Standing · **Wild Card** ·
A–Z; the app ships two. The Wild Card view was designed and signed off: division leaders as seeds
1–3, next three by record as wild cards 4–6, a heavy `ink` cutoff divider, then everyone below.
It is the most useful view of the three from August onward, which is now. `buildWildCard()` +
`WildCardCard` + `WCDivider` in `holistic/standings.jsx` are the reference; all derive from the
`StandingTeamDto` fields the app already has, so **this is ungated**.

**Content column.** Three values are in play: the app's `.st-wrap` is `max-width: 1180px;
padding: 0 32px`, the design was `1200`, and the project standard is **1240 / 28** (game view being
the declared 1600 exception). Design is now 1240/28; the app should follow, which also aligns
Standings with Leaders (`1200` → also to be moved).

**Global header** (`BrandHeader` + `NavDrawer`) — standing exemption, as on landing, leaders and the
game view.

---

## Notes

- **View persistence:** the app persists the Order choice in `sessionStorage` under
  `standings-view`. Keep that, and extend the stored values to cover Wild Card when it lands
  (currently `"div" | "az"`).
- **Chart axis labels** are 9px (y) and 8.5px (x), below the Jul 4 11px floor. The floor was scoped
  to word labels, and dense axis ticks are a defensible exception — flagging it as a deliberate
  exception rather than an oversight. If the chart gains room, take them to 10–11px.
- **Arizona checked and fine:** the API returns `AZ`, `utils/teams.ts` keys `AZ`, and
  `TEAM_COLORS.AZ` matches — no fallback-grey bug. (Leaders' own table uses `ARI` for the same
  club; unrelated to this page but worth knowing if the two maps are ever merged.)
