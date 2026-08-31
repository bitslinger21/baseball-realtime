# PROMPT — one header pattern across every screen

29 August 2026. Ungated: no new API, no new endpoint, no new fields. This is structure and deletion.

Design source of record: `holistic/shared.jsx` (`BrandHeader`, `NavDrawer`, `PageTitle`),
`holistic/landing.jsx`, `holistic/game-v2.jsx`, `holistic/leaders.jsx`, `holistic/standings.jsx`,
`holistic/player.jsx`, `Team Page - Overview.html`, `Team Page - Schedule.html`.

## 1 · The pattern

Two blocks, in this order, on every screen.

**Global header** — full-bleed, ends in a hairline. Wordmark left, contextual return + hamburger
right. The wordmark is not clickable; there is no home button, by decision. The hamburger opens the
nav drawer.

**Page header** — owned by each page, two rows:

```
row 1   h1                              [ status        ]
row 2   eyebrow (context text)          [ controls      ]
```

**This is a change of row order.** The page header used to render the eyebrow first and the h1
second. It is now h1 first. In the app this is `PageTitle` — swap the two row elements; no style
changes.

**Slot rule: status right of the h1, controls right of the eyebrow.**

| Screen | h1 row (status) | eyebrow row (controls) |
|---|---|---|
| Landing | — | date Prev / date / Next / Today |
| Game view (live) | LIVE + elapsed | Live / Head-to-head |
| Game view (pregame) | countdown pill | Preview / Head-to-head |
| Leaders | — | League · MLB / AL / NL |
| Standings | — | Order · Standing / A–Z |
| Player | — | — |

Content-level switches stay BELOW the page header, left-anchored with the content they govern —
leaders' `Batting / Pitching` and the player tab strip do not move.

Two specific moves worth calling out, because both currently sit in the wrong slot:

- **Landing's date controls** move from the h1 row down to the eyebrow row.
- **Pregame's countdown pill** is currently inlined inside the subtitle string. Pull it out and give
  it the h1 row's status slot, so pregame mirrors live (`LIVE` + elapsed → countdown).

## 2 · Retire `PageMenu`

The inline nav menu is gone. Every screen uses the global header's return + hamburger instead.
In the design source no page mounts `PageMenu` any more; leaders, standings, player and the pregame
game view were the last four.

Check every screen actually passes an `onMenu` handler — `BrandHeader` hides the hamburger when the
handler is absent, which produces a screen with no nav access and no error. That was a real defect
found on the pregame artboard during this pass.

## 3 · Delete three pieces of redundant copy

Same root cause in all three: the UI telling the user something the UI already shows.

**3a · Landing filter strip** — `All / Live · N / Final · N / Upcoming · N`. Delete it.

Rationale: at a maximum of ~15 games a day, with labeled sections directly below, there is nothing
to filter; and the counts it carries already appear in the section labels ("Live now · 2").

⚠️ **This reverses part of migration decision #2** (which kept the Late Game Focus toggle restyled
as a filter chip) and the strip is SHIPPED, so this is a deletion in the app, not a no-op. Confirm
before merging that no other surface depends on the filter state.

Do not add a rule where the strip was. With the strip gone the fixed chrome ends at the page header,
and a hairline there sits a few dozen pixels under the global header's own hairline — two parallel
light rules read as an accident. Space alone.

**3b · Leaders' "Top 10 · each category"** — remove the slot; fold the words into the eyebrow text,
which now reads `2026 Season · Top 10 each category`.

**3c · Standings' "Every team links to its page — record, schedule and roster"** — delete. The row
hover state carries the affordance.

## 4 · Team pages

`Team Page - Overview.html` and `Team Page - Schedule.html` adopt the same pattern. In the design
these are hand-built static HTML rather than the shared atoms, so the global header and drawer are
reproduced in plain CSS plus a small script — in the app they should use the real `BrandHeader` /
`NavDrawer` components like every other route.

- Global header: shared wordmark asset (was an inline diamond + `SC◆REBOOK` text), return, hamburger
- Overview: h1 `Houston Astros` first, then one eyebrow line —
  `AMERICAN LEAGUE WEST · Daikin Park · Houston, TX · Est. 1962`
- Schedule: h1 `Schedule` first, then the team switcher + year buttons below it
- Both already had their stat blocks right of the h1, which is the correct status slot

## Done means

- Every route renders global header → page header, h1 row above eyebrow row
- Every route's hamburger opens the drawer
- `PageMenu` is deleted from the codebase
- The landing filter strip, the leaders hint slot and the standings note are gone
- No screen has status in the eyebrow slot or a page-level control on the h1 row
