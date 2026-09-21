# Handoff — Home page (What's Hot Right Now)

Written Sep 19, 2026. **Gated on new API.** Design signed off.

## Contents

- `PROMPT_home_page.md` — the spec. Read first.
- `home.jsx` — the Home screen (`window.HomeScreen`). File of record.
- `scoring-widget.jsx`, `leaders.jsx` — the other two adopters of the shared `EdgeButton`.
- `player.jsx`, `Team Page - Overview v2.html`, `Team Page - Schedule.html`,
  `Team Page - Transactions.html` — the four screens that gained the follow control.
- `shared.jsx` — carries the two shared changes: `NAV_ITEMS` gains **Home**, and
  `IQDiamond` is promoted to `window.IQDiamond` with an **unfilled** home plate.
- `game-v2.jsx` — included only because its local `IQDiamond` became an alias to the
  shared one. No other change.
- `Home.html` — standalone preview (open it; the mock control bottom-right switches
  the hot-item count between 0 / 1 / 3 / 5).

Design files are copies of the live `holistic/` as of Sep 19, 2026.

## One-line summary

A front door that answers "what deserves my attention" — a curated list of noteworthy
events (not a scoreboard, not a news feed), with the brand's red diamond as the bullet
that means "Baseball IQ has context for this".

## Build order

1. **What's Hot** — the whole of this pass's design work.
2. **Following** — model settled and designed (PROMPT §6): a dashboard of current state as
   **tile stacks** (chevron cycles the faces), teams + players, cap 8, device-local storage,
   one Manage panel with two entrances, and a new `FollowButton` atom on the player header
   and all three team pages.
3. **September** (was "Races") — settled and designed (PROMPT §6.5): the fixed eight-race
   board plus individual chases, with an early-season quiet mode.

## Flags for the dev

1. **The diamond bullet is semantic.** Present = IQ context exists. No greyed diamonds,
   no diamond on every row, no manufactured questions to earn one, and no second IQ
   button bolted on. `iq` is resolved server-side.
2. **Event first, game second.** "Right now" does not require a live game. Do not force
   scoreboard chrome onto trades, IL moves or awards.
3. **No timestamps.** The strongest news-feed tell; the brief asks for curated.
4. **0 items is a real state** ("Nothing cooking yet."), distinct from "no games today".
   Never pad the section, never lower the bar to fill it.
5. **One horizontal rule per section head and nowhere else** — the 20px content indent
   stops reading the moment other hairlines come back.
6. **The event sentence is composed server-side.** Lifecycle wording ("through six" →
   "three outs from a no-hitter" → "has thrown a no-hitter") is editorial, and the row
   must not change shape as it evolves.
7. **The diamond now has exactly two uses**: rust = Baseball IQ (always interactive),
   ink = brand lockup (never interactive). Nothing else. The unfilled home plate applies
   app-wide, and the game view's scorecard title diamond changes from a hand-rolled rust
   copy to the shared atom in ink. The wordmark PNG is unaffected.
8. **Following is a query, not a log.** No read state, no stored events — if you find
   yourself building "since you last looked", the model is wrong.
9. **Device-local storage is a real limitation**, not a shortcut to hide: no sync, and the
   follow set dies with browser storage. Accounts and a migration path are open.
10. **Don't build a separate onboarding picker** — the empty state's button opens the same
    Manage panel as the Manage link.
11. **September's fixed set only works because panels size to content** — a decided race
    must collapse to one line. A stretched one-row panel reads as broken data.
12. **"Mathematically alive" is a server-side determination**, not client math.
13. **No Cy Young/MVP chase** without an award-projection model — they are votes, not leads.
14. **`EdgeButton` is now one shared atom** (PROMPT §6.6) — solid strip, hidden at rest.
    The widget's offset must be measured from the `data-sw-band` tag, never positionally.
15. **Never mix the `border` shorthand with `borderLeft`** on a Following tile — React
    wipes the live stripe on hover.
16. **Mock control is not for port** (the fixed `Hot` / `Follows` / `Sept` pill, bottom right).
