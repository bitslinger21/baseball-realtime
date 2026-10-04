# Games page: TV broadcasts on live + upcoming games

**Rev 1 · Oct 3, 2026.** Not gated. It uses the MLB schedule feed's `broadcasts` hydrate (`hydrate=broadcasts(all)`), which the app can add to its existing schedule call.

Design reference: `holistic/shared.jsx` (`pickTV`, `BroadcastLine`), `holistic/scoring-widget.jsx` (live widget footer), `holistic/landing.jsx` (`GameCardUpcoming`), preview `Games - Broadcasts.html`. Port the values verbatim.

## Where it shows
- **Live games:** in the row under each live widget, on the LEFT. "Enter game →" stays on the right (`marginLeft:auto`, no shrink). The two are baseline-aligned with a 14px gap.
- **Upcoming games:** in the card's top bar, directly UNDER the start time and right-aligned.
  - The top bar is `alignItems:flex-start`, `minHeight:79px`, `box-sizing:border-box`, so every card in a row has the same header height and the hairlines line up.
  - The right column is a flex column: `alignItems:flex-end`, `gap:3`, `textAlign:right`, `minWidth:0`.
  - The broadcast text is **clamped to 2 lines** (`-webkit-line-clamp:2`, `lineHeight:16px`), with the full list in `title`.
- **Final games: none.** Don't render the line, and don't reserve space for it.

## Look
- One line: a `TV` label (DM Sans 11 / 700, `letter-spacing:.06em`, textMuted), 7px gap, then the names (DM Sans 12.5 / 600, ink), joined by ` · `.
- No icons, no network logos, no links.

## Which broadcasts (`pickTV`)
1. Keep `type === 'TV'` only. Drop radio (`AM` / `FM`).
2. Keep `language === 'en'` only (missing language counts as `en`). This drops FOX Deportes, ESPN Deportes and similar.
3. Drop `MLB.TV`, because it carries nearly every game.
4. Order: nationals (`isNational`) first, then `homeAway: 'away'`, then `'home'`.
5. De-duplicate by `name`, since the same network is often listed for both sides.
6. Use the feed's `name` (e.g. `Marquee Sports Network`), not `callSign`.
7. **If nothing is left, render nothing:** no `TV` label, no "TBD", no placeholder. The upcoming header keeps its 79px minimum regardless.

## Acceptance
1. Live widget: `TV SportsNet PIT · Sportsnet` sits left of "Enter game →". MLB.TV and radio don't appear.
2. Upcoming national game: just `TV TBS` under the time.
3. Upcoming game with a national network plus two locals: `MLB Network · NBCS Philadelphia · CLEGuardians.TV`, at most 2 lines, with the full list on hover.
4. In a row of four upcoming cards, the header hairlines and the bottom strips line up.
5. Final cards show no TV line.
6. A game with no English TV entries shows no TV line, and its layout doesn't shift.
