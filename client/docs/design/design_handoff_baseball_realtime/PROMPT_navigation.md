# PROMPT — navigation: Teams page + search

29 August 2026. Two related changes from one problem: **there was no way to get to a team without
first finding something else.** Both are ungated — no new endpoint, no new fields. Search needs one
query the app does not have yet (see §2.5); everything else is existing data.

Design source: `holistic/teams.jsx`, `Teams.html`, `holistic/standings.jsx`, `holistic/shared.jsx`
(`SearchField`, `BrandHeader`, `NavDrawer`).

Read `PROMPT_header_pattern.md` first if it has not landed — this builds on that header structure.

---

## 1 · Teams page (`/teams`)

### Why

A team is a top-level entity: 30 of them, stable, and the thing most people organise around. Before
this page the only doors to a team page were a game card, a matchup title, or a Standings row — so
"show me the Astros' schedule" meant finding an Astros game first, or going to Standings and
clicking through. Neither is a path anyone would design on purpose.

### Structure

Standard header pattern. Page header: h1 `Teams`, eyebrow `30 teams · 6 divisions`, and
`Order · Division / A–Z` in the eyebrow's control slot.

**Division view (default)** — three columns × two rows of six division groups, five teams each.
Each group has an eyebrow label (`AL EAST`) over a strong rule, then its teams in record order.
Row: logo · team name · W–L · PCT. Whole row is the link to that team's page.

**A–Z view** — two columns, all 30 teams alphabetical by full name, with the division added as a
column. Alphabetical order destroys division context, so the row has to carry it back.

Row hover is a `surfaceAlt` wash; that hover state is the affordance, so do not add a "every team
links to its page" note.

### 1.5 · Take A–Z off Standings

Standings' order control becomes `Standing / Wild Card` — the third A–Z option is **removed**.

Rationale: Standings answers "who is winning"; a directory answers "take me to a club". They only
ever shared a page because both render a list of 30 teams. Picking a sort order should not silently
change what a page is for.

In the design, `AZRow`/`AZView` are kept in `standings.jsx` but unmounted, and the league data plus
its two helpers are exported so the Teams page shares one definition rather than copying the league.
Do the equivalent in the app: one source for the team list, consumed by both routes.

### 1.6 · Nav drawer gains Teams

Drawer items become: **Games · Teams · Standings · Leaders · Settings.** Five destinations, each
answering a different question. `Teams` sits second, right after Games.

---

## 2 · Search

### Why

A menu answers "what is there". Search answers "take me to X", which is the real question when you
already know the team or player you want. It also fixes the player problem — player pages are
currently reachable only from a game or a roster.

### Placement and interaction

- **Search icon** in the global header, immediately **left of the hamburger**
- Clicking it slides a **400px field out right-to-left**, **overlaying the contextual return link**
  (the return stays in the DOM, it is simply covered)
- Field is a pill: magnifier, input, ✕. Placeholder `Team, player or date`
- Dismiss on ✕, Esc, or a click outside. Dismissing clears the query
- The field autofocuses when it opens

### Results

A **dropdown under the field**, live as you type, **grouped** with small uppercase group labels:

| Group | Matches on | Row shows | Goes to |
|---|---|---|---|
| **Teams** | full name, nickname, or exact abbreviation | logo · name · abbr | team page |
| **Players** | **last name first**, then first name | logo · first **last** · pos · team | player page |
| **Games** | a parsed date | `Games · Sat May 23` · N games | landing for that date |

Caps in the design: 5 teams, 6 players, 1 date row. Last-name-first matching is deliberate — it is
how people search for a player, and first-name matching alone buries the obvious hit.

**Date parsing** is forgiving: `may 23`, `5/23`, `2026-05-23`. A **bare month with no day does not
match** — it collides with team names and would produce a result the user did not ask for.

A date is a **result row you click**, not an automatic jump. The user may have meant a team.

**Resting state is the placeholder only** — no recent searches, no suggestions. A no-match query
gets an explicit line: `No teams, players or dates match "…"`.

Scope for v1 is exactly teams, players and dates. Not venues, divisions or managers.

### 2.5 · Data

Teams and dates come from data the app already has. **Players need a name-search query** —
last-name prefix across active rosters, returning name, position, team and `mlbId`. That is the one
net-new piece of backend work in this prompt.

In the design, the roster (`window.SEARCH_PLAYERS`) and the per-date game count are mocks, marked as
such in comments. Do not port the constants.

### 2.6 · Not designed yet

- Keyboard arrow navigation through results (Esc works; arrows do not)
- Whether Enter on an exact team name jumps straight there instead of opening the dropdown
- Mobile behaviour — the field is sized for desktop

---

## 3 · Global header alignment (bug in the shipped app)

The shipped brand row does not match the design on two counts. Both are visible side by side in a
screenshot of the current Standings page.

**3a · The hairline must be full-bleed.** In the app it stops at the content column's edge. In the
design the border sits on the header's OUTER element, so the rule spans the full viewport while its
content stays in the column — that is what makes it read as a global bar rather than a card edge.

**3b · The wordmark and hamburger must align with the h1.** In the app the brand row's content is
inset further than the page title below it — a double gutter: the content column's own padding plus
another inset inside the brand row. The wordmark's left edge and the h1's left edge must be the same
x. Measured in the design source, both are at 28px.

One rule for the whole header block: **content aligns to the content column; only the border goes
full-bleed.**

---

## 4 · Naming fix

The drawer item and every contextual return read **"Today's games"**, but the landing page is
date-aware — its h1 is already "Yesterday's games" / "Thursday's games" when you page the date. The
label was lying whenever the user was not on today.

Renamed to **"Games"** — the name of the place, not of what it happens to be showing. Applies to the
drawer item and every `back` label. Landing's h1 is unchanged and stays date-aware.

## Done means

- `/teams` exists, is in the drawer, and both orders render
- Standings has no A–Z option, and both routes read one team list
- Every screen's header has a search icon left of the hamburger
- The header hairline runs full width, and the wordmark's left edge matches the h1's
- Searching a team, a last name, and `5/23` each return a grouped, clickable result
- No destination label or back link says "Today's games"
