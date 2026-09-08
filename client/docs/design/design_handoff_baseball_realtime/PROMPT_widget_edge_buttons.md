# Live widget — carousel edge buttons must not cover the minimise button

**Date:** Sep 7, 2026 · **Ungated** — no new API, no new data, no visual redesign
**Design source:** `holistic/scoring-widget.jsx` (`LiveWidget`, `SW`) — preview `review-live-widget.html`
**App scope:** `client/src/pages/dailyGames/ScoringWidget.tsx` + `ScoringWidget.css` only

## Problem

The two invisible edge hit-areas that page the carousel are `position:absolute; top:0; bottom:0`
— full card height, 40px wide. The **minimise button** sits in the top-right of every slide's
header, inside that right-hand strip. Clicking it lands on the edge button instead: the widget
pages to the next slide rather than minimising to the dock. (Left edge has the same overreach;
it just has nothing under it today.)

## Fix

Start both edge strips **below the header band**.

```js
const SW = { w: 425, h: 195, headerH: 52 };   // headerH is new
// nav(side):
position: 'absolute', top: SW.headerH, bottom: 0, [side]: 0, width: 40, …
```

`headerH: 52` is measured against the **tallest** header of the six slides (slide 0 / `FrontCard`,
whose header is two person rows ≈67px); 52 clears its 24px minimise button (which bottoms out at
~50px) and also clears the shorter single-title headers on the other five slides. One constant,
not a per-slide value — the strips are rendered once by the wrapper, not by the slides.

In the app this is a CSS change: give the edge button rule `top: 52px` instead of `top: 0`
(or `inset: 52px auto 0 0` / `... 0 auto`). Expose it as a variable if the header ever changes
height.

## Unchanged

- Width (40px), z-index, gradient-on-hover background, transparent-until-hover chevron colour.
- Chevrons stay vertically centered — they now center in the remaining ~143px, which reads
  correctly against the slide body (the visual content the buttons page through).
- Swipe paging, tap-body-to-enter-game, the dot indicators, and `Enter game →` are untouched.

## Acceptance

1. Click the minimise button on **every** slide (0–5) — the widget minimises to the dock; the
   carousel does **not** advance.
2. Click anywhere in the left/right 40px below the header — still pages the carousel.
3. Hovering the edge below the header still fades in the gradient + chevron; hovering the header
   region does not.


---

# Minimised chip — inning must carry the top/bottom caret

**Same date, same file, ungated.** Design source: `window.LiveWidgetMini` in
`holistic/scoring-widget.jsx`; used by the dock in `holistic/landing.jsx`.

## Problem

The minimised chip shows **score + inning only** — correct scope. But the inning read as a bare
number ("9"), with no half indicator. At a glance that does not answer the question the chip
exists to answer: whether the home team still has a turn to bat. "9" is two very different games.

## Fix

The inning indicator is **inning number + half caret**, always both:

- `▲` = top of the inning · `▼` = bottom.
- Same convention and reading direction as the expanded widget's `FrontCard` (`g.half === 'top'`),
  so minimising never changes vocabulary.
- Caret is 11px, `textMuted`, `aria-hidden` (the number stays `ink`) — subordinate to the number
  but legible. It is **not** conditional: a live game is always in one half or the other.
- The chip's `title` reads "Top of the 1st" / "Bottom of the 9th"; the button's `aria-label`
  carries score + half + "Restore widget".

## Also in this change (design-source hygiene, mirrors what the app should do)

The dock's two chips were **duplicated hardcoded markup** in `landing.jsx` — literal logo URLs,
literal scores, literal carets, one of which was hand-typed per game. They are now one
data-driven component, `LiveWidgetMini({ game, onRestore })`, reading the same game object as
the widget. In the app the chip should likewise read the live game payload (`awayScore`,
`homeScore`, `inningLabel`, `half`) — nothing about the chip should be per-game literal.

## Acceptance

1. Minimise a game in the **top** of an inning → chip shows `N ▲`. Minimise one in the
   **bottom** → `N ▼`. Both update live as the half flips.
2. Chip content is still score + inning only — no count, no bases, no team names.
3. Clicking the chip restores that game's widget.
