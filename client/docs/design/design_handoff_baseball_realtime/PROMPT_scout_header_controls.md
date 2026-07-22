# Fix — Scout header: add inning/speed selects + separator, outline-style buttons

You are in the `baseball-realtime` client. **Do only this. Touch nothing else.**

> Reference: `holistic/game-scout.jsx` `ScoutFeed` header — port verbatim.

## What changed
The Scout-mode pitch-feed header (left: batter/inning context label · right: transport) gets two additions plus a button-style fix:

1. **Inning jump select** — dropdown of half-inning options (▲/▼ + number), jumps the play head to that inning's first moment on change.
2. **Playback speed select** — `0.5× / 1× / 2× / 4×` options, sets the auto-advance interval.
3. **Vertical separator** (1px, border color, 20px tall) between the selects and the Play control.
4. **All buttons are outline style, no default fill** — transparent background, 1.5px border (`accent` border + text when active/playing, `borderStrong` otherwise), not solid ink/accent fill.
5. **Play control is a pill with a visible label** ("Play" / "Review"), not an icon-only circle — icon + text, height 28px, pill radius.

## Order (right-aligned group)
`[inning select] [speed select] [ | separator ] [▶ Play pill] [⏮] [⏭] [head/total counter]`

## Must-not-break
- Play↔Review toggle and ⏮/⏭ step behavior unchanged — visual/control-set change only.
- Numerals stay mono in the counter.
- Live-game header (non-scout) is unaffected.

## Acceptance
- Both selects present and functional (inning jump seeks head; speed changes auto-advance rate).
- Separator sits between the selects and Play.
- Play renders as an outlined pill with text; step buttons are outlined, not filled.
