# PROMPT — League Leaders sync

Reconciles the Leaders page design against the shipped app. The Jul 4 handoff
(`PROMPT_leaders.md`, `PROMPT_leaders_era_sort.md`) was ported faithfully — layout, grid,
navy header band, ranking logic, lead-row rust tint and the dotted-underline player link all
match. This pass covers the drift since, plus **two real bugs** the read turned up.

Read against `client/src/pages/LeadersPage.tsx`, `LeadersPage.css`, `api/src/leaders/*`.
Design source: `holistic/leaders.jsx`.

---

## BUG 1 — `throughDate` is read but never sent

`LeadersPage.tsx` builds its subtitle from `data.throughDate`:

```ts
const throughLabel = data?.throughDate
  ? `2026 Season · through ${data.throughDate}`
  : data != null ? `${data.season} Season` : "2026 Season";
```

But `LeagueLeadersDto` has **no `throughDate` field**, and `leaders.service.ts` never sets one —
it returns `{ season, batting, pitching }`. So the first branch is dead and the subtitle always
falls back to `"2026 Season"`. The design's `through Jul 4` has never rendered in the app.

**Fix — pick one:**
- **Ship the field.** Add `throughDate?: string` to `LeagueLeadersDto` and set it in the service.
  The MLB leaders endpoint doesn't return an as-of date, so the honest value is the date the
  cache entry was built (`new Date()` at fetch time, formatted `MMM D`). Note the 5-minute TTL
  means it is "as of now" in practice.
- **Or drop the branch** and let the subtitle be the season alone.

The design now reflects the **fallback** (`2026 Season`) rather than assuming the field exists —
`window.LEADERS_THROUGH_DATE` opts into the longer form for review. Whichever way this goes,
design and app agree today.

---

## BUG 2 — the AL / NL filter does not show AL / NL top tens

`leaders.service.ts` requests the MLB leaderboard with `limit=10` and no league scope:

```ts
url.searchParams.set('leaderCategories', ALL_CATEGORY_KEYS.join(','));
url.searchParams.set('season', season);
url.searchParams.set('sportId', '1');
url.searchParams.set('limit', '10');
```

`ranked()` then filters that 10-row set by league on the client. The result is **the AL players
who happen to be in the MLB top 10** — re-ranked 1..N — not the AL top 10. On Home Runs, filtering
to NL might show four names ranked 1-4; the actual NL #5 through #10 were never in the payload.
The card looks authoritative and is wrong.

The design has the same flaw (it filters one mock list), so this is a shared miss, not app drift.

**Fix — request per league.** The MLB endpoint takes `leagueId` (103 AL, 104 NL). Either:
- fetch three times per category set (MLB / AL / NL) and key the cache on
  `${season}:${league}`, serving the league the client asks for; or
- fetch once with a much higher `limit` (say 60) and keep the client-side filter, accepting that
  a deep category could still truncate.

Per-league requests are the correct answer; the raised limit is the cheap one. Either way the
client's `ranked()` stays as-is.

**If neither ships:** the filter must stop claiming to be a leaderboard — relabel the segmented
control so it reads as a *filter of the MLB top 10*, not a league ranking. Do not leave it as is.

---

## Synced into the design (app was right)

**Scroll affordance.** The design had a passive bottom-only fade with a `⌄` glyph. The app has
**clickable chevron buttons at both edges** — 60px tall, gradient to transparent at 55%, shown only
when there is content to reach that way, `ResizeObserver` + scroll driven, 120px smooth step.
Adopted verbatim; it matches the `‹ ›` pattern already used on the at-bats scorebook row and the
dark band's inning scroller.

**Unit tag** 10.5px → **11px** (the Jul 4 small-label floor).

**Page fetch states.** Loading / error / no-data were app-only. Now in the design at
`32px 28px`, 14px sans, `textMuted` (error in `accent`) — reachable via `window.LEADERS_STATE`.

**Unknown-team fallback.** `tm()` returned `undefined` for an unmapped `teamId` and would have
crashed the row. Now mirrors the app: abbr sliced from the team name, `textFaint` chip.

**Pitching category order** → the app's `PITCHING_CATEGORIES`: ERA · Strikeouts · Wins · Saves ·
WHIP. Batting order already matched exactly (7 categories, same sequence).

---

## Design is ahead (app to add)

**Innings (IP) is missing from the app.** The design has six pitching categories; the app's
`PITCHING_CATEGORIES` has five. Adding it is one line — `{ key: 'inningsPitched', label: 'Innings' }`
— since `ALL_CATEGORY_KEYS` drives the MLB request and the client renders whatever arrives.
`UNIT_MAP` already has `inningsPitched: "IP"`, so the unit tag is waiting for it.

**Global header.** The design uses `BrandHeader` + `NavDrawer`; the app uses `PageTitle` +
`PageMenu` with `getBackLabel`. Same standing exemption as landing and the game view — not part
of this sync.

---

## Contract notes (no change needed)

- **The API sends pre-formatted value strings** (`"30"`, `".337"`, `"1.056"`, `"2.14"`, `".88"`)
  and the client displays them raw. The design's `fInt`/`fRate`/`fEra`/`fWhip` helpers are
  therefore **the spec for what the API must send**, not client logic to port. Leading zeros are
  stripped on rates below 1.00; keep it that way.
- **Ascending categories** are keyed on the exact API category strings
  (`earnedRunAverage`, `walksAndHitsPerInningPitched`) via `ASC_CATEGORIES`, with an optional
  payload `asc` taking precedence. Equivalent to the design's inline `asc: true`. If a category
  key is ever renamed server-side, that Set is the thing that breaks.
