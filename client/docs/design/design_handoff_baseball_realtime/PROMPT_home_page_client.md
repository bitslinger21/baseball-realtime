# Home page — What's Hot Right Now

**Design signed off Sep 19, 2026.** Rev 1.
**Gated on new API** for section 1 (a significance/event generator) and section 2
(a follow model). Sections 2 and 3 are **placeholders in this pass** — see §6.

Design source: `home.jsx` (+ `shared.jsx` for the changed shared atom).
Standalone preview: `Home.html`.

---

## 1. What Home is, and what it must not become

Home is the app's front door. It is **not** a summary of Games, Standings or Leaders —
those pages already answer "show me everything". Home answers a different question:

> What deserves my attention?

Three sections, in this order, and no others:

| | Section | The question | Who chooses |
|---|---|---|---|
| 1 | **What's hot right now** | What should I pay attention to? | Scorebook |
| 2 | **Following** | What's happening with the baseball I care about? | The user |
| 3 | **Races** | What competitions are developing? | The season |

Do not let Home drift into a duplicate Games page, a mini Standings, a mini Leaders,
or a traditional sports-news homepage.

**Nav:** `NAV_ITEMS` gains **Home** as the first destination. The wordmark stays
**non-clickable** — that earlier decision is unchanged; Home has its own nav item instead.

**Page header:** the standard two-block pattern, unchanged. `BrandHeader active="home"` +
`PageTitle title="Home"` with the date as subtitle. No `right` or `subtitleRight` slot content.

---

## 2. What's Hot — the load-bearing decisions

### 2.1 It is a list of EVENTS with optional game context

Not a scoreboard with text attached. **"Right now" does not mean a game is in progress** —
a trade with zero games being played is legitimately the hottest thing in baseball. So:

- The **event sentence is the item.** 17px DM Sans, weight 500, `line-height 1.45`,
  `max-width 600`, `text-wrap: pretty`.
- **Game context is secondary**, and only present when the event has a game: a quiet
  bordered block on the right (no card fill at rest), two team rows (logo · abbr · runs,
  trailer dimmed to `textMuted`) plus the inning indicator vertically centred.
  The whole block links to the Game page; hover firms the border and lifts the ground
  to `surface`. **No chevron** — the block is already a link and a chevron read as
  list-row furniture.
- **Non-game events get no scoreboard chrome.** A club move renders as marks:
  `● HOU → ● LAD`, under the sentence. An event with no second club (an IL placement)
  shows the one club.

### 2.2 The red diamond bullet means one specific thing

Two bullet kinds, and the difference is **semantic, not decorative**:

- **Plain bullet** (6px `textFaint` dot) — informational item.
- **Red diamond** (`window.IQDiamond`) — **Baseball IQ has contextual content for this event.**

Rules, all of them load-bearing:

- The diamond **must not appear on every item.** If the IQ service reports no context,
  use the plain bullet.
- **Never render a disabled/greyed diamond.** Absence is the signal.
- **Never manufacture questions so an item can earn a diamond.**
- `iq` is a **real availability flag from the IQ service**, resolved server-side. Do not
  infer it in the client from the event type.
- Do **not** add a separate Baseball IQ icon or button to Hot items. The bullet is the
  affordance — that is the whole point, and it continues the app-wide convention that the
  diamond signals something interesting behind the current view.

### 2.3 Clicking the diamond opens the EXISTING IQ experience

Not a new feature — the same object as the dark-band panel, translated to the light surface:
suggested questions generated from that item's context, a free-text field, one answer
(mono headline · rust unit label · prose), and the same `1400ms` thinking phase with the
pulsing diamond. Panel opens inline beneath the item, `surface` ground, `2px accent` top
border, closes on ✕ / Esc / re-click of the bullet.

Home does **not** duplicate the app-wide Ask Me Anything input.

### 2.4 No timestamps

Deliberate and worth defending: a relative time on every row ("14 min ago") is the single
strongest tell of a news feed, and the brief asks for curated. Recency is already implied
by the section's name. Do not add them back.

### 2.5 Sized by content — 0 is a real state

Typical 1–3 items, **max 5**, and **0 must look intentional**. Never pad the section to a
fixed height and never lower the bar to fill it.

Empty state is the sentence alone — **"Nothing cooking yet."** No diamond, greyed or
otherwise: a greyed one reads as a disabled affordance, and the rule below says absence is
the signal. Deliberately NOT "no games are being played". The two are independent: there can
be ten live games and no hot items, or no games at all and three.

### 2.6 Lifecycle is text-only

> through six → through seven → three outs from a no-hitter → has thrown a no-hitter → expires

The **sentence** changes; the row's shape never does. Completed events may linger briefly —
"right now" covers both developing events and significant ones that just happened. There is
no separate "completed" card design and none should be added.

---

## 3. Layout and the one-hairline rule

- Content column `maxWidth 1240`, `28px` gutters — the standard column (the game view's
  1600 is the documented exception).
- **Exactly one horizontal rule on the page: the hairline under a section label.** One
  hairline means "a section starts here" and nothing else.
- An earlier build had rules between hot items, between Following rows, and under each race
  title; every line looked alike and no boundary was legible. **Do not reintroduce them.**
  Items are separated by space and their bullets.
- Section labels are the app's all-caps `Eyebrow` (12.5px), and **section content hangs
  20px inside** them (`SECTION_INDENT`). The label acts as a margin marker. This indent is
  only legible while the one-hairline rule holds.
- `64px` between sections.

---

## 4. Shared-atom change: `IQDiamond`, and the diamond rule

### 4.1 The rule (new, app-wide)

The diamond is the brand's one shape, so its uses must be enumerable. There are **two**,
and no third:

| Use | Colour | Interactive | Where |
|---|---|---|---|
| **Baseball IQ is available here** | rust `accent` | **always** | Home's hot-item bullet, the dark band's ask |
| **Brand lockup** | `ink` | **never** | beside the SCOREBOOK wordmark |

- **A rust diamond means Baseball IQ.** If it is rust, clicking it must open IQ.
- **The diamond is never a generic icon.** It does not mark scorecards, sections, empty
  states or anything else that merely wants a bit of brand. **No exceptions** — What's Hot's
  empty state is the sentence alone.
- **Fixed in this pass:** the game view's scorecard panel title carried a hand-rolled RUST
  diamond (with a filled plate) beside "SCOREBOOK". It is not IQ — it is the brand lockup —
  so it now uses the shared atom in **ink**. Port this along with the rest.

### 4.2 The atom

`IQDiamond` moved out of `game-v2.jsx` into **`shared.jsx` as `window.IQDiamond`** — the mark
now carries meaning on two screens, so it gets one definition. `game-v2.jsx` keeps a
`const IQDiamond = window.IQDiamond;` alias, so its call sites are untouched. **Every diamond
in the app should render through this atom**; the scorecard's hand-rolled copy is exactly the
drift that happens otherwise.

**Home plate is now OUTLINED, not filled** (a solid block read as a weight/bug at bullet size).
This applies **everywhere**, including the dark-band diamond — one glyph, one definition.
Geometry: plain outlined diamond, `strokeWidth 2`; home-plate square at the **bottom point
only**, `strokeWidth 1.7`, `fill: none`. No squares at the other three corners.

This is **not** the wordmark. `assets/logo-wordmark-light.png` is unaffected.

---

## 5. Data

All content in the design file is **MOCK** and marked as such. Nothing in `HOT`,
`FOLLOWING` or `RACES` is for port.

Assumed Hot item shape:

```
{ id, text, iq: boolean, iqSuggested?: string[], iqAnswer?, 
  game?: { away, home, ra, rh, half, inn },
  move?: { from, to|null } }
```

Backend work:

1. **A significance generator** producing ranked candidate events with `text` already
   composed server-side (the client must never assemble the sentence — lifecycle wording is
   editorial). Sources span live feed, transactions, awards and records, so this is not one
   endpoint over the game feed.
2. **`iq` availability** resolved by the IQ service per event.
3. A **follow model** for section 2 — see §6.1. This is the largest dependency on the page
   and is **not** just an API: it needs user identity and per-user persistence.

**Not for port:** the fixed `Mock · hot items 0/1/3/5` control bottom-right. It exists to
prove the section holds at every size.

---

## 6. Sections 2 and 3 are PLACEHOLDERS

### 6.1 Following depends on things the app does not have yet

Flagged explicitly because it is bigger than a feed: **Following requires user identity in
some form, and durable persistence of that user's favourites.** Today Scorebook has neither
— every screen renders the same content for everybody. Before any Following design can be
built, someone has to decide:

- **Identity:** accounts (sign-in, recovery, sessions) versus a device-local identity
  (no sign-in, no sync, favourites lost when the browser storage is cleared or the user
  switches devices). For a personal/private deployment, device-local may be entirely
  sufficient — that is a product call, not a design one.
- **Persistence:** where the follow set lives (server record keyed to an account vs
  `localStorage`), and whether it syncs across devices.
- **The follow gesture itself:** where a user *becomes* a follower — a control on the team
  page, the player header, or both — and what the unfollow path is. None of that exists on
  any screen today.
- **The empty state:** Home for a user who follows nothing is the DEFAULT first-run state,
  not an edge case, and it is the section's most important screen.

Until that is settled, Following stays a placeholder. **If identity is not on the roadmap,
say so early** — the section should then be cut from Home rather than shipped as a stub, and
What's Hot plus Races stand on their own.

### 6.2 What is and isn't decided

Both sections are labelled "Placeholder · behaviour designed separately" in the design file, and that
label is honest — **nothing about their internals is specified.** What IS decided:

- **Their order and their relationship to What's Hot.** Following sits immediately below;
  Races below that.
- **Following is quieter and denser than What's Hot** — one line per entity, two columns.
  The user already knows why those entities are there, so each needs a line, not a paragraph.
  A `Manage` affordance sits in the section head.
- **Races is a 4-up of compressed rankings**, no logos (a ranking read down a column; mono
  abbreviations align, logos would not).
- **Races is season-sensitive** — a two-game lead in April is not a two-game lead with nine
  games left. The section must be able to grow quieter early and more prominent late. Nothing
  in this pass implements that weighting.

Do not treat the current rows as a spec. Build section 1 first.

---

## 7. Acceptance

1. Home is reachable from the nav as the first item; the wordmark is still not a link.
2. A hot item with no game shows no scoreboard block, and its move renders as team marks.
3. Items with IQ context show the diamond; items without show a plain dot. **No greyed
   diamonds appear anywhere.**
4. Clicking a diamond opens the IQ panel inline with questions specific to that event;
   Esc, ✕ and a second click all close it.
5. With 0 items the section reads "Nothing cooking yet." with **no diamond**, and the page
   below it does not move.
6. With 5 items nothing scrolls internally and no item is truncated.
7. The only horizontal rules on the page are the three section hairlines.
8. No timestamps appear on any item.
9. Every diamond on every screen renders through `window.IQDiamond` with an **unfilled**
   home plate; every **rust** diamond opens Baseball IQ, and the scorecard panel title's
   diamond is **ink**.

---

## 8. Not designed

The significance threshold (what "worthy" means, ranking, cadence, repetition memory);
how long a completed event lingers; Following's real behaviour and the follow model's UI;
Races' seasonal weighting; IQ error/latency states on this page beyond the shared pattern;
and **mobile** — the two-column Following grid and the side-by-side event/game-context row
both need a narrow-width pass.
