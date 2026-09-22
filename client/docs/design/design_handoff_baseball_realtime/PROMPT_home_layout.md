# Handoff — Home page: layout pass, three new sections, one shipped-app bug

**Written Sep 21, 2026.** Supersedes `handoff_home/` (Sep 19), which described the
first Home build. Re-sync from the files in this folder, not from that one.

Three PRs, deliberately separable. **PR B is the urgent one** — it is a bug that is
almost certainly live in the shipped app today, on screens that have nothing to do
with Home.

| PR | What | Gated? |
|---|---|---|
| **A** | Home layout pass + Races/Chases split + In-the-news host | No |
| **B** | `scrollBy({behavior:'smooth'})` is a silent no-op — fix app-wide | No |
| **C** | In the news — populate from a news API | **Yes** — new API |

---

## Files in this folder

| File | Role |
|---|---|
| `PROMPT_home_layout.md` | This document — the work |
| `holistic/home.jsx` | The Home screen. Rewritten this pass. |
| `holistic/home-data.jsx` | Home's mock data + IQ panel + `FollowMark`. New file. |
| `holistic/home-real.jsx` | Real Sep 21 league state, for the verification page. Not for port. |
| `holistic/shared.jsx` | **Reference only — unchanged this pass.** Shipped so the pages run. |
| `assets/logo-wordmark-light.png` | The wordmark `BrandHeader` loads. Unchanged. |
| `holistic/leaders.jsx` | **PR B only** — the table scroller fix |
| `holistic/game-v2.jsx` | **PR B only** — innings + at-bats scroller fix |
| `Home.html` | Mounts Home with mock data + the states control |
| `Home - Six States.html` | Six edge states, each with the reasoning under it |
| `Home - Today Real.html` | The page driven by today's actual league state |
| `Home Layout A - Broadsheet.html` | The rejected exploration, kept as the record |

`shared.jsx` is **unchanged this pass** — no atom edits, and it is in the folder only
so the pages run. `EdgeButton`, `TeamDot`, `Headshot`, `IQDiamond` and `window.TEAMS`
are all as shipped; nothing in it needs porting.

---

## PR A — Home layout

### A1 · The page grid

Two rows, not two columns:

```
row 1:  [ What's hot            ] [ Following 320px ]
row 2:  [ Races                          full width ]
row 3:  [ Chases                         full width ]
row 4:  [ In the news                    full width ]
```

`minmax(0,1fr) 320px`, `columnGap 40`, `rowGap 40`. Races/Chases/News each
`gridColumn: 1 / -1`. Following is `gridColumn 2 / gridRow 1`.

**Below 1000px the grid collapses to one column** and Following moves out of row 1,
under What's hot (`useNarrow(1000)`, a `matchMedia` hook — the design file is all
inline styles, so the breakpoint has to be JS; in the app use a media query or your
existing breakpoint hook). In the collapsed state Following stops being sticky, caps
at `70vh`, and the day-ahead fill rule (A2) is skipped.

*Why it matters:* the rail is a fixed 320px. Unconditional, it took 43% of an 850px
frame and squeezed the hot sentence — the most important text on the page — to a
214px measure, six lines with three words orphaned. **The page's least important
column had the only guaranteed width.**

### A2 · The two columns size each other

Both directions, both measured:

- **The rail is capped by the hot column:** `min(hot-section height, viewport)`.
- **The hot column grows toward the rail:** when ≤2 items are hot it appends
  `4 − n` day-ahead rows (A4) so the column reaches the rail's content height.

**Measure both; do not declare them.** A percentage `max-height` is ignored while the
grid sizes its row, so a 20-row rail would set the row height and strand the column
anyway. `HomeScreen` uses two `ResizeObserver`s (`hotRef` = whole section,
`coreRef` = the hot list *without* the tail, so growing the tail cannot change the
input that sized it) plus the rail reporting its `scrollHeight` up via `onContent`.

Capping the rail to the viewport instead measured a 911px rail beside a 364px column
— ~546px of dead left column. Don't.

### A3 · What's hot

- One sentence per item, 18px/500, max 560px measure. **Text first** — the sentence
  is the item and may change under the user (through six → through seven → thrown)
  without the row changing shape.
- **Ceiling of five**, `HOT_SHOWN`. A sixth folds behind one `N more` line. It is an
  expander, not a "view all" — there is no page of hot items and there should not be.
  Never drop the extras silently.
- **Bullet = IQ availability.** A rust diamond means *Baseball IQ has context for
  this event*; no context → a plain 5px dot. **Never a greyed-out diamond** (it reads
  as a disabled affordance).
- **Three context types in the right-hand slot, and only one per item:**
  1. `game` → `GameContext`, two team rows + inning. **`half === 'final'` renders a
     neutral `Final` label, not an inning.** `Inning` only knows top/bottom, so a
     final drew a rust ▼9 — which in this language means "live, bottom of the ninth"
     — for a finished game.
  2. `move` → `MoveContext`, club marks + arrow. Never force scoreboard chrome onto
     an event with no game.
  3. `race` → `RaceContext`, a 2–3 row mini standings block (logo · abbr · GB).
     **Net-new this pass** — see "What the real-data check found" below.
- Rows separated by a hairline. Space alone let them drift into the rail's rows.

### A4 · The day ahead

Two jobs, one component (`DayAhead`):

- **Nothing hot** → it is the section's whole body, under "Nothing cooking yet — here
  is the day ahead." Before first pitch that is the *normal* state, not an error.
- **≤2 items hot** → it is the section's tail, under a quiet "Coming up today"
  eyebrow, sized by A2. At 3+ items it disappears.

**It is a SHORTLIST, capped at four, not the slate.** `HOME_TODAY_COUNT` carries the
real number and the section ends in `All N games today →` linking to Games. Fifteen
rows here would make Home the Games page, which is the one thing Home is defined
against. Rows, not cards — five card-shaped things read as a scoreboard.

**Dev:** picking the four is the significance generator's job at a lower bar (aces,
division/wild-card stakes, rivalry). **Not "the first four by start time"** — on a
15-game Sunday that is four one-o'clock games.

Row layout: time + stake share the left column. The stake as a right-hand chip ate
~100px and ellipsised both pitcher lines.

### A5 · Following

- A **dashboard**, not a feed. Each row's line is true *right now* and rewrites in
  place; it never narrates ("Judge homered in the 4th") — that is What's hot's job.
- **Face order: recency first, then season.** Today's live line → today's final line
  → tonight's game → season state once today is over. Extra faces cycle in place via
  a right-side `EdgeButton`, shown only when there is more than one face.
- **Live = a 2px rust left edge.** Not team colour: a quarter of the league (BAL,
  SFG, CIN, STL, TEX, LAA, ARI) is close enough to rust to read as live.
- **Live rows sort to the top.** Only matters at length — a live row below the fold
  of a scrolling rail is a row you will not see.
- **Cap is 20** (`HOME_FOLLOW_CAP`), was 8. A dashboard of eight is a design; twenty
  is a list, and a user with twenty interests is not misusing the feature. The panel
  counter reads `n/20`; at the cap the search field still accepts typing (disabling
  it leaves the user guessing) and the results area explains instead.
- **The rail scrolls internally** with `EdgeButton` top *and* bottom (`FollowRail`).
  Native scrollbar suppressed so there is one affordance, not two. 3 rows (174px) per
  press. **Declare `FollowRail` at module level** — minted inside `HomeScreen` it
  would be a new component type every render, remounting and resetting `scrollTop`
  (the same latent bug the shipped line-score band carries).
- **One Manage panel, two entrances:** the "Manage" link when you follow things, the
  empty state's button when you don't. Same object, arriving empty from the second.
  First run is the default state for every new user, not an edge case.

### A6 · Races and Chases are SEPARATE sections

Earlier passes had Chases as a group inside Races. Reversed: *"a batting title is a
race"* is true of the word and false of the object. A team race has a cut line, a
deadline and an elimination rule, and every device on a race row (rust tick,
"3 spots", games left) belongs to that. A chase has none of them. One shared band
forced a single set of column rules onto two different things, and in a four-column
band the reader scanned past the wild card to reach Judge.

- **Races** — two columns: `Divisions` · `Wild card`. `minmax(340px,1fr)`, divided by
  a vertical rule. **No panels:** the column is the container; eight bordered panels
  in one band read as a grid of cards.
- **Chases** — two columns: `Hitting` (AL/NL average, HR, RBI) · `Pitching`
  (K, ERA, SV). Note: "Individual leaders · top three".
- **Cy Young is deliberately absent.** An award *vote*, not a countable lead. Every
  chase row is a number you can check — which is also why saves are in, despite being
  a poor measure of a season.

Race rows: `tick · logo · FULL CLUB NAME · record · GB`, 25px.
Chase rows: `logo · player · MONO ABBR · value`, 25px.

**Full names in Races, abbreviations in Chases** — a race row's subject *is* the club,
so it earns the full name; a chase row's subject is the person, and a full club name
after every surname competes with the name it qualifies.

- **Cut line = a rust tick in a left gutter** on clubs currently holding a wild-card
  spot. Never a horizontal rule.
- **Eliminated clubs are simply absent** — a listed club is by definition still alive.
  That is what keeps a fixed board of eight races short.
- **A decided race is ONE LINE:** race name + green `CLINCHED` left, logo + full club
  name right-justified. A card header with a single row beneath read as a table that
  had lost its rows.
- **Win–loss is an OPTIONAL column** (`row.wl` absent → column dropped). Real
  games-back with no records beats a plausible-looking fake record.
- A clinched berth's `gb: 'x'` renders as a green sans `IN`, not a bare `x` in a
  tabular-nums mono column, where it reads as a data glitch. In `RaceContext` (the
  hot-item block) the column goes **empty** instead — its eyebrow already says
  CLINCHED, so a per-row marker is redundant.

### A7 · Three season states, not two

`SEASONS` in `home.jsx`. The first build had April (quiet) and the run-in (full
board), which left **June — most of the season — with nowhere to sit.**

| State | Label | Board |
|---|---|---|
| April | `Races` | Quiet: six division one-liners, no wild cards, no chases |
| June | `Races` | Full board, mid-season membership |
| Run-in | `Races` | Full board |

- **The section is called `Races` in every state.** It was "September", named for the
  destination, which read as a mistake in two thirds of the season. The changing fact
  lives in the note beside the label ("9 games left in the regular season").
- **The membership rule changes with the state.** "Mathematically alive" filters
  nothing in June — every club qualifies. The rule that holds all season is **within
  striking distance**: a games-back threshold that tightens as games remaining falls,
  converging on "alive" by late September. One knob. Yields 3–4 clubs per division in
  June.
- **April quiet mode is divisions only** — in April nobody is chasing a cut line, a
  wild-card race has no single leader for anything to be "by", and both devices that
  explain its signed numbers belong to the full board. Chases are out too: a .400
  April average is noise. Its line reads `logo · full club name · record · leads by
  N` (or "tied at the top") — `by 2.0` alone was an unlabelled number beside a record
  and read as another record.
- **The switch is a CONDITION (games remaining), never a calendar date.** One
  threshold, tuned, shared with the membership rule.
- **The dateline is part of the state.** A June board under "Friday, September 19"
  reads as a bug.

### A8 · In the news — the host only (content is PR C)

Build the section, wire it to an empty list. It renders nothing when empty, so it is
safe to ship ahead of the feed. Rules are in PR C.

### Not for port

The states control at the foot of the page (`showControls`), `HOME_*` mock arrays,
and everything in `home-real.jsx`. **The control is in normal flow, not
viewport-fixed, on purpose:** as a fixed panel it covered whatever sat bottom-right,
and in the collapsed layout that was Following's head — the Manage link became
unclickable, clicks landing on the Season toggle. Collapsing it to a chip only shrank
the blocked area. A review control must never sit on top of the thing being reviewed.

### Acceptance — PR A

1. At ≥1000px: two columns; rail sticky; rail height ≤ hot-section height; **no dead
   left column** with 20 follows next to 3 hot items.
2. At <1000px: one column; Following under What's hot, not sticky; hot sentence gets
   the full measure; **nothing overlays the Manage link**.
3. 6 hot items → 5 shown + `1 more`; clicking reveals the sixth.
4. 0 hot items → day-ahead list of 4 + `All N games today →`.
5. 1 hot item → day-ahead tail appears under "Coming up today"; at 3 it is gone.
6. 20 follows → rail scrolls, both `EdgeButton`s work, live rows first.
7. 0 follows → rail keeps its width and head, shows the first-run button.
8. Season = June → label `Races`, mid-season board, June dateline, 3–4 clubs per
   division. Season = April → six one-liners, no wild cards, no chases.
9. A clinched division renders as one right-justified line.
10. A final game in a hot item shows `Final`, never a rust inning.

---

## PR B — `scrollBy({behavior:'smooth'})` is a silent no-op ⚠️

**Found on Home's rail; it is not a Home bug.** The `EdgeButton`s rendered, hovered
and took clicks, and the list never moved. Wheel/trackpad scrolling still worked,
which is exactly why nobody noticed.

Two failures, always together:

1. `el.scrollBy({top: N, behavior: 'smooth'})` → `scrollTop` unchanged.
   `el.scrollBy({top: N})` → works. Not a `prefers-reduced-motion` opt-out.
2. **A programmatic scroll fires no `scroll` event**, so any `measure()` wired to
   `onScroll` never re-runs and the edge state goes stale — top chevron missing after
   paging down, bottom chevron still showing at the end.

⚠️ **And CSS `scroll-behavior: smooth` on the container is the trap.** Our first fix
assigned `scrollTop` directly *and* added `scrollBehavior: 'smooth'` for smoothness —
a smooth container routes the *assignment* through the same broken animation path, so
the assignment became a no-op too.

**The pattern:**

```js
el.scrollTop = el.scrollTop + delta;   // assign; no scrollBy, no scrollTo
measure();                             // immediately — no scroll event is coming
// and the container must NOT carry CSS scroll-behavior: smooth
```

Paging is therefore instant. A button that moves the list beats one that glides and
sometimes does not.

**Fixed in the design source in three files — port all three:**

| File | Site |
|---|---|
| `home.jsx` | `FollowRail.page` |
| `leaders.jsx` | the table `step` + its `maxHeight: 358` scroller |
| `game-v2.jsx` | `scrollInn` (innings) and `AbChevron` (at-bats) |

**Check the shipped app for the same pattern.** The Leaders chevrons and the
line-score innings scroller were ported from these files, so if the app's webview
behaves like ours, those controls are dead on device — visible, pressable, inert.
Grep for `behavior: 'smooth'` and `scroll-behavior` and verify each on a real device,
not just in a desktop browser.

### Acceptance — PR B

Per scroller: a chevron/edge-button click moves the content; the opposite edge button
appears; the pressed one disappears at the limit. Verify on device.

---

## PR C — In the news (gated on a news API)

A second **provenance**, therefore a second section. Never merge it into What's hot.

- **What's hot** = what our own feeds *prove* is happening: generated, carries
  structured context, speaks in the app's voice, IQ can answer about it.
- **In the news** = what someone *else* claims: fetched, carries a source and a link,
  no structured context.

Merging them puts an IQ insight and an outside claim at equal weight in one list, and
the reader can no longer tell which is the app's own judgment — the most valuable
thing the page has.

Four rules:

1. **Headlines verbatim and attributed**, never paraphrased into our voice — a
   rewritten headline is a claim we did not verify. Every row links **out**; this is a
   doorway, not a reader.
2. **Timestamps are legitimate here and nowhere else on Home.** The page drops them
   by rule (a relative time on every row is the tell of a feed), but a headline's
   trustworthiness *is* its source plus its age.
3. **No thumbnails.** One 80px image per row would out-weigh every generated insight
   above it and turn Home into a portal.
4. **Dedupe against the hot list** on `subject`: the hot item wins, the headline is
   dropped. Otherwise the page states one fact twice with two provenances, which reads
   as a bug and quietly devalues the generated version.

Item shape: `{ id, title, source, ago, subject? }`. Sits last, full width, two
columns — least authoritative content, least prominent position.

### Acceptance — PR C

An empty list renders nothing (no empty section, no placeholder). A headline whose
`subject` matches a visible hot item does not render. Every row opens its source.

---

## What the real-data check found — read this before tuning the generator

`Home - Today Real.html` drives the page from the actual league state of Sep 21, 2026
(six games left). Three findings, all of them about the generator rather than the
layout:

1. **Today's real significance is almost entirely RACE STATE** — one-game division
   leads, a tie decided only by head-to-head, three clubs alive for one berth. The
   mock hot list was five in-game moments (no-hitter, cycle, three homers, a trade, an
   IL move) and contained no such item. Hence `RaceContext` (A3) and:
   **the generator needs a race-state category**, and it is seasonal — silent in June,
   dominant in the last week. Triggers: lead changes, a lead reaching or leaving one
   game, a tie, a club entering or leaving a berth, elimination.

2. **Two of the five mock hot items are not generatable today.** The trade and the IL
   placement both assume the club-transactions feed, which is still API-gated (the
   same gate as the Transactions tab). The mock has been promising a capability the
   app lacks.

3. **A news-only event proves the boundary.** Alex Bregman was hit in the face by a
   foul ball on deck and taken to hospital (Sep 20). The app could not have produced a
   hot item for it: no news ingest; hit *on deck*, so no plate appearance, no pitch,
   no event enum; the only structured trace is a mid-game substitution,
   indistinguishable from a double switch; and the IL route needs the gated
   transactions feed and would be hours late anyway. So it belongs **only** in In the
   news — which is where the verification page puts it. Lesson recorded: *an item
   found by searching is not evidence the generator could find it.*

**Design-ahead, not built — a "left the game" hot category.** A starter removed
mid-inning who was not due up *is* detectable from the existing feed, and the item can
be truthful without a cause: "Bregman left the game in the fourth." News gets you the
story in an hour; this gets you the fact in a pitch. Cheap and ungated. Worth a
decision before PR C ships.

---

## Still not designed

Mobile below the single-column stack. Loading/error states for either feed. Whether a
completed hot event lingers or leaves. Accounts — Following is device-local
(`localStorage` now, an account record later).
