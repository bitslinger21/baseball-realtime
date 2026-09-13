# PROMPT — Horizontal header nav + the contextual-return rule

**rev 1 · written Sep 13, 2026 · design SIGNED OFF Sep 12, 2026**
Ungated: no new API, no new endpoint, no new data field. Pure front-end.

Supersedes the header portions of `handoff_navigation/PROMPT_header_pattern.md`
(the hamburger-only bar). Everything else in that prompt — the two-block header
structure, the slot rule, `PageMenu` retirement — still stands and is already shipped.

---

## 1. What changes, in one line

The hamburger drawer stops being the desktop navigation. The four destinations
move into the header bar itself, Settings becomes a gear icon, and the contextual
return ("← Today's games") leaves the bar for the page block below it — where it
renders **only when there is an instance to return to**.

---

## 2. The bar (option C)

One row, `min-height: 62px`, full-bleed, ending in a 1px `border` hairline.
Inside it, a `28px`-gutter content column.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ SC◆REBOOK              Games  Teams  Standings  Leaders   [search] [⚙]   │
└──────────────────────────────────────────────────────────────────────────┘
                                          ▔▔▔▔▔▔  ← rust underline, on the hairline
```

Left to right:

1. **Wordmark** — `LogoLockup variant="allcaps"`, 27px tall. **Not clickable.**
   There is no home button, by standing decision.
2. **Spacer** — `margin-left: auto` on the whole right group.
3. **Nav: Games · Teams · Standings · Leaders.** Right-justified, *not* centered
   (centering read as decoration rather than navigation). `gap: 26px`.
   - items are **full-height** (`align-items: stretch`, `display:flex` +
     `align-items:center` inside) with `margin-bottom: -1px`, so the active
     `2px solid accent` bottom border lands **on the bar's hairline** — the same
     idiom as the player tab strip and the team tabs.
   - `14px / 600`. Resting `textMuted`, hover `text`, active `text` + rust underline.
   - active item is `cursor: default`, carries `aria-current="page"`.
4. **Utilities** — `gap: 10px`, vertically centered (NOT stretched): the existing
   `SearchField`, then a **Settings gear** (38×38 icon button, 18px stroked SVG).
5. **Hamburger** — still in the markup, `display:none` at desktop. See §5.

Reference implementation: `holistic/shared.jsx` → `window.BrandHeader`.
Hand-built CSS twin for the static team pages: `.gnav` in `Team Page - Overview v2.html`.

### `active` is the SECTION, not the screen

- Landing → `games`. **Game view → `games`** (a game belongs to Games).
- Teams page *and any single team page* → `teams`.
- Standings → `standings`. Leaders → `leaders`.
- **Player page passes nothing.** A player is reachable from games, teams and
  leaders alike; lighting any one of them would assert a hierarchy that does not
  exist. No underline is the correct state, not a bug.

### Settings is a gear, not a nav item

Settings is a utility — a thing you *do* — not a place in the league. It sits with
search. `NAV_ITEMS` is therefore **four** items; the drawer appends Settings as a
fifth because at a phone width a list is the only affordance available.

### Rejected, do not rebuild

A two-row version (destinations on row 1, utilities on a framed row 2) was built and
rejected — `Header Nav - Two Row.html`. It paid ~44px of chrome on **every** screen to
hold two icons, and it separated the nav from the hairline the active underline needs.
All five explored options are in `Header Nav - Horizontal Options.html`.

---

## 3. The contextual return — the rule

The return is **no longer in the header bar**. It moved into `PageTitle` as
`returnTo={{ label, onClick }}`, rendering as a line **above the h1**:
`15px / 600 / textMuted`, `← {label}`, left-anchored. When present the block's top
padding tightens `22 → 16px` so the h1 does not drift down the page.

**Render a return only when the screen you came from is an INSTANCE** — a specific
game, team, or player — i.e. something no nav item can name.

| You are on | You came from | Return |
|---|---|---|
| Player | a game | `← Astros @ Cubs` |
| Player | a team page | `← Houston Astros` |
| Player | Leaders / search | **none** — `Leaders` is in the bar |
| Game view | Games (landing) | **none** — `Games` is in the bar |
| Team page | Teams / Standings | **none** — both are in the bar |
| Team page | a player page | `← Jeremy Peña` |
| Games, Teams, Standings, Leaders | anywhere | **never** — they *are* nav |

The principle in one sentence: **if a nav item already names where you came from,
the return would say the same thing twice.** Four worked cases are drawn side by
side in `Header Nav - Return Rule.html`.

**No space is reserved when there is no return.** Presence is fixed for the life of
a visit — it is decided at navigation time and cannot change while the user is
looking at the page — so nothing ever shifts under them.

---

## 4. Screen-by-screen

| File | `active` | `returnTo` |
|---|---|---|
| `landing.jsx` | `games` | never |
| `game-v2.jsx` (live + pregame) | `games` | only when entered from a team/player |
| `player.jsx` | *(none)* | yes — whichever instance you came from |
| `teams.jsx` | `teams` | never |
| `standings.jsx` | `standings` | never |
| `leaders.jsx` | `leaders` | never |
| `Team Page - Overview v2.html` | `teams` | only when entered from a player |
| `Team Page - Schedule.html` | `teams` | only when entered from a player |

The two team pages are hand-built static HTML, not the shared React atoms — the bar
is reproduced in plain CSS (`.appbar` / `.gnav` / `.sbtn`). In the app they should of
course use the real shared header; the duplication exists only in the design mocks.

---

## 5. Narrow viewports

`NavDrawer` is **kept whole** — unchanged, five items (the four destinations +
Settings). It is now the narrow-width hatch only. Pass `onMenu` and the hamburger
renders; omit it and it is `display:none`. No screen passes it at desktop width, so
no screen ever shows both the horizontal nav and the hamburger.

The breakpoint itself is **not designed** — pick the width at which the four items +
search + gear stop fitting beside the wordmark and swap there. Mobile sizing of the
whole header is likewise not designed.

---

## 6. Carried-over divergences (settled Aug 31 — don't "fix")

1. **Wordmark:** the app's inline-SVG `LogoLockup variant="allcaps"` is correct and
   wins over the design mocks' `assets/logo-wordmark-light.png`. Same final mark; the
   PNG exists only because a static mock cannot mount a component.
2. **`onMenu` gating:** the app's unconditional hamburger + internal drawer state was
   the better call for the old bar. With the horizontal nav the hamburger must become
   **width-conditional** — that is a real change, not a re-litigation of that decision.

---

## 7. One thing for the dev to pick up

**The landing date belongs in the route.** Today the landing page holds its date in
component state. With returns now pointing at instances, a user can go
landing (paged back to May 23) → game → player → `← Astros @ Cubs` → `Games` and
land on *today*, silently losing the date they were browsing. Putting the date in the
URL fixes it. Out of scope for this prompt; flagged because this change makes the path
reachable in one or two more ways than before.

---

## 8. Acceptance

- [ ] Every route shows one 62px bar: wordmark left, four items right-justified, search + gear.
- [ ] The active item's rust underline sits **on** the bar hairline, not floating above it.
- [ ] Game view lights `Games`; a team page lights `Teams`; **a player page lights nothing.**
- [ ] No hamburger at desktop width, on any route.
- [ ] Landing / Teams / Standings / Leaders show **no** return line, and no gap where one would be.
- [ ] Player entered from a game shows `← Astros @ Cubs`; entered from Leaders shows nothing.
- [ ] Narrowing the viewport past the fit breakpoint swaps the nav for the hamburger; the drawer still lists five items.
