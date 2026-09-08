# Minimised widget chip — the inning must carry the top/bottom caret

**Date:** Sep 7, 2026 · **Ungated** — no new API, no new data, no design gate
**Design source:** `window.LiveWidgetMini` in `holistic/scoring-widget.jsx`; mounted by the dock
in `holistic/landing.jsx`. Preview: `review-live-widget.html` (chips are below the widget).
**App scope:** the minimised-chip markup where `DailyGamesPage` renders the dock (+ the
`ScoringWidget` minimise path that produces it). Nothing else.

## Problem

When a live widget is minimised the chip shows **score + inning only** — that scope is right.
But the inning rendered as a bare number ("9"), with no half indicator. At a glance that fails
to answer the one question the chip exists to answer: *does the home team still have a turn to
bat?* "9" describes two completely different games.

## Fix

The inning indicator is **inning number + half caret — always both**.

- `▲` = top of the inning · `▼` = bottom of the inning.
- Same convention and reading direction as the expanded widget's `FrontCard`
  (`g.half === 'top' ? '▲' : '▼'`), so minimising never changes vocabulary.
- Caret: 11px, `textMuted`, `lineHeight: 1`, `aria-hidden`. The inning number stays `ink` and
  mono, so the caret is subordinate to the number but still legible.
- **Not conditional.** A live game is always in one half or the other; there is no state where
  the caret is omitted.
- `title` on the indicator reads "Top of the 1st" / "Bottom of the 9th". The chip button's
  `aria-label` carries score + half + "Restore widget", e.g.
  `"HOU 8, CHC 5 — bottom of the 9th. Restore widget."`

Reference implementation (design source):

```jsx
<div style={{ color: T.ink, display: 'flex', alignItems: 'center', gap: 2, lineHeight: 1 }}
  title={`${top ? 'Top' : 'Bottom'} of the ${g.inningLabel}`}>
  <span>{parseInt(g.inningLabel, 10)}</span>
  <span style={{ fontSize: 11, lineHeight: 1, color: T.textMuted }} aria-hidden="true">
    {top ? '▲' : '▼'}
  </span>
</div>
```

## Comes with it: the chip must be data-driven

The dock's two chips were **duplicated hardcoded markup** in `landing.jsx` — literal logo URLs,
literal scores, and hand-typed carets, one block per game. That is exactly how a caret goes
missing on one chip and not the other. They are now a single component,
`LiveWidgetMini({ game, onRestore })`, reading the same game object the expanded widget reads.

In the app the chip should likewise render from the live game payload — `away`/`home` (logo +
abbr), `awayScore`, `homeScore`, `inningLabel`, `half`. Nothing in the chip should be a
per-game literal.

## Unchanged

- Chip **content stays score + inning only** — no count, no bases, no team names, no venue.
- Chip size/shape: two stacked team rows (20px away logo, 18px home logo) with a hairline
  between, the inning indicator to their right, `borderStrong` border, `T.r.sm` radius,
  `surface` background, max width ~74px.
- Clicking the chip restores that game's widget; the whole chip is the target.

## Acceptance

1. Minimise a game in the **top** of an inning → chip shows `N ▲`. Minimise one in the
   **bottom** → `N ▼`.
2. The caret flips live as the half changes, without the widget being restored.
3. Both/all dock chips show a caret — verify with two games in *different* halves at once
   (that's the case the duplicated markup got wrong).
4. Chip content is still score + inning only.
5. Clicking a chip restores that game's widget.
