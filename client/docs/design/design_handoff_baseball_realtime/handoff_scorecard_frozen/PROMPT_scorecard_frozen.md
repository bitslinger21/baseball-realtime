# Scorecard mode — fit the card: frozen edges + free-sliding innings

**Rev 4 · Oct 19, 2026.** Rev 4 adds **§5a Show / hide animation** (the full card grows out of its slot and shrinks back), the page-scroll lock, and the off-screen close fallback. **If you built rev 3, only §5a and its acceptance line are new.** Rev 3 added **§5 Full card** (pop-out that shows the whole sheet) and **§6 Print** (one US Letter landscape page). Rev 2 added: the rust batter row follows the player actually at the plate (sub, not starter). **If you already built rev 2, only §5–§6 and the new acceptance lines are new.** Design SIGNED OFF. Ungated, no new API. Baseline `main` @ `7c53e7f`.

Design reference: `Scorecard - Frozen Edges.html` (+ `holistic/scorecard-frozen.jsx`). The mock is a React re-draw of the sheet for review; **the app keeps `window.buildScorebookGrid`** — change the builder and its container, don't port the mock's components.

**Why:** the scorecard is a full printed sheet (~1,600 × 1,200) inside a ~640px card. Today you pan and zoom around a small piece of it, and the names and totals scroll away while you pan. Now it always fits the card's width and reads at one fixed size.

---

## 1 · What the user sees

- **Three frozen edges.** The name columns (`#` / Name / Pos) are pinned left, the totals (AB / R / H / RBI, and R / H / K / BB in the pitching block) are pinned right, and the inning-number header row is pinned on top. A soft shadow on the inner side of each frozen column shows the innings passing underneath.
- **The innings slide freely between them**: two-finger horizontal swipe on a trackpad, Shift + wheel, or a one-finger drag on touch. They follow the gesture 1:1 with no snapping, and can stop part-way through an inning. Vertical swipe scrolls the lineup and pitching with the header frozen.
- **The window uses all the width between the frozen columns.** On a ~900px card that's about 5½ innings at the new cell size.
- **Header label + chevrons:** `‹ Innings 3–8 of 9 ›` next to `◆ SCOREBOOK`. The label lists the innings currently visible (count one at the edge if at least a quarter of it shows). The small `‹` `›` (24px, `textMuted`, `border` colour when disabled) glide to the next inning boundary. They're the fallback for a plain mouse. When every inning fits, the label reads `All 9 innings` and the chevrons hide.
- **Live highlights:** the live inning's header cell is `accent` with white text, and the **current batter's name row** is `accent` with white bold text (order #, name, pos). They meet at his live (dashed rust) cell. **The rust row is whoever is actually at the plate:** if a sub is batting (pinch hitter, or a sub who entered earlier and is now up), highlight **the sub's own sub-row**, not the starter's top row. Match on the live at-bat's `batterId` against the slot's starter + `subs[]` `playerId`s. A starter who has been replaced is never highlighted, even though his slot is up. Subbed-out players' rows render in `textMuted`.
- **Opening position:** when the scorecard opens, and at each half-inning change, the live inning sits **second from the right**, so the next inning is in view.
- **Removed:** wheel/pinch zoom, click-and-drag panning, and the transform-based pan state. **No size control in the app** — the S / M / L switch in the mock is review-only.

## 2 · Cell size — fixed at "M" (~0.8 of print)

| | Print (unchanged) | Screen (new) |
|---|---|---|
| Inning column | 112px | **90px** |
| Batter slot (3 sub-rows) | 96px | **77px** (26 / 26 / 25) |
| Field svg (`.cwfield`) | 88px | **70px** |
| Marker column / tally boxes | as is | scale ×0.8 |
| Pitching tally sub-columns | 112 / 4 | 90 / 4 |

Add a `cellScale` option to `buildScorebookGrid` (default `1`, so `Scorebook Page.html` and print are unchanged; the game view passes `0.8`). **Text does not shrink with the field**: result codes, `scorebookSub`, the foul-ground reached codes and tally numbers keep about 11px / 8.5px. In the mock that's `textBoost = min(1.3, 1 / scale)` on the svg text. Name and stat text stay at their current sizes.

## 3 · Implementation — use native scrolling

The mock slides a transformed track. **In the app, prefer native scrolling with CSS `position: sticky`.** You get free sliding, trackpad momentum, touch and Shift + wheel from the browser for nothing:

1. The scorecard viewport (`scorecardViewRef`) becomes `overflow: auto` on both axes, with `overscroll-behavior-x: contain`, which stops the browser's back/forward swipe. Hide or thin the horizontal scrollbar (`scrollbar-width: thin`).
2. In the builder's table: the left label cells get `position: sticky; left: <cumulative offset>; z-index: 2`, with the shadow on the last one. The right total cells get `position: sticky; right: <cumulative offset>`. Every header-row cell gets `position: sticky; top: 0; z-index: 3`. The **four corner header cells** need both offsets and `z-index: 4`. Sticky cells need an opaque background (they already have the header/row fills).
3. Drop the grey matchup row + team band from the scrolling area if they stop the inning header pinning at `top: 0`. Otherwise the inning header's `top` = the height of the rows above it. Either is fine; the inning numbers must stay visible.
4. Chevrons: `view.scrollTo({ left: nextBoundary, behavior: 'smooth' })`, with boundaries every `90px` from the first inning column. If smooth scroll is a no-op in your environment (see the PR B note in this file), animate `scrollLeft` with rAF over ~320ms.
5. Header label: compute it from `scrollLeft` + the visible inning width on `scroll` (rAF-throttled).

If sticky table cells fight the builder's layout, the mock's approach (three blocks with a clipped `translateX` track, `overflow-x: clip` so the sticky header survives) is the fallback. Then you add the wheel/touch handling yourself, as in `scorecard-frozen.jsx`.

## 4 · Things in `PitchByPitchV2.tsx` to change

- **Delete** `scorecardXf`, `applyScorecardXf`, `zoomScorecardAt`, the scorecard wheel-zoom effect, the pointer-drag handlers, and the pinch/touch handlers. The `[data-runner-ab]` / `[data-clip-pa]` taps become plain clicks; no drag guard is needed now.
- **The feed's wheel listener** (`pbpv2FrameRef` → `onWheel`, which steps the play head and calls `preventDefault`) must **ignore events while the scorecard is showing** (`flipped`). Otherwise it eats the scorecard's vertical scroll and horizontal swipe.
- **Runner-trace auto-pan** (the effect that clears the 350px trace panel) now scrolls the viewport. It sets `scrollLeft` so the traced cells sit between the frozen left column and the panel's left edge (the panel covers the frozen right column; that's fine), and `scrollTop` so they're vertically in view. Keep the "origin + final movement first" priority.
- **Extra innings:** the window and label use `numInnings`, not 9 (`Innings 8–12 of 12`). The opening position is still live-inning-second-from-right.
- The opening position re-runs on flip-open, team toggle and half-inning change (where `focusCurrent`-style logic used to reset the transform).

## 5 · Full card — pop-out that shows the whole sheet (rev 3)

The slide window can't show the whole game at once. **Full card** pops the scorecard out over the page and scales the entire sheet to fit: every inning and every row, with no slide and no scroll.

- **Trigger:** a `Full card` button in the scorecard header, before `← Back`, with an expand icon (four outward corners). In the full card it becomes `Exit full card` (inward corners, `surfaceAlt` fill).
- **Layout:** `position: fixed; inset: 20px` over the whole app, `z-index` above the sticky band and the Lineups tray. Backdrop `rgba(21,22,26,0.45)`. Card shadow `0 24px 60px rgba(21,22,26,0.35)`. Entry animation: opacity 0 → 1 + scale .97 → 1, 220ms `cubic-bezier(.22,.7,.3,1)`; backdrop fades in over 180ms. The sheet is centred horizontally.
- **Close:** Esc, the button, or a click on the backdrop. Hidden in the full card: `← Back` (and, in the mock only, the review-only size control). Kept: the team toggle, the innings label (reads `All 9 innings · full card`), the rust live inning, the rust batter row, the live cell, clip ▶ marks and runner taps.
- **Fit — two stages, so text stays readable:**
  1. **Cells scale** to `s = min(1, (W − frozenL − frozenR) / (innings × 112), (H − fixedRows) / (9 × 96))`, with a **floor of 0.66**. Codes keep the text boost (§2), and the frozen columns stay their normal width. On a 1440×900 window `s` is about 0.77, roughly M.
  2. **Below the floor, scale the WHOLE sheet** (frozen columns included) with one `transform: scale(k)` on a wrapper sized to the scaled box, where `k = min(1, W / sheetW, H / sheetH)` at `s = 0.66`. Don't keep shrinking only the cells: the frozen columns don't shrink, so the sheet overflows and the sticky totals pin over the last inning (a bug the review caught).
  - Re-fit on window resize. Use `numInnings` for extra innings. No vertical scroll inside the full card.
- **Rendering:** use a portal to `document.body` (the scorecard sits deep inside the game page, so `position: fixed` can be trapped by a transformed ancestor). Leave a placeholder of the card's size in place so the game page doesn't reflow.

### 5a · Show / hide animation (rev 4)

The full card **grows out of the scorecard's slot in the page** and **shrinks back into it** on close. It's a FLIP animation: measure both rects and animate a transform between them, with `transform-origin: 0 0`.

- **Open:** before switching to the full card, read the in-page card's `getBoundingClientRect()`. After the full card mounts (layout effect), read its rect and animate `translate(dx, dy) scale(sx, sy)` → `none` over **340ms `cubic-bezier(.22,.7,.3,1)`**. The backdrop fades in over 180ms. Replace §5's opacity/scale entry animation with this.
- **Close** (Esc / button / backdrop): animate `none` → the transform onto the **placeholder's** rect over **260ms `cubic-bezier(.4,0,.2,1)`**, `fill: forwards`, with the backdrop fading out over the same 260ms. Unmount the full card on `finish`. Ignore repeat close requests while it runs.
- **Edges move independently, not from the centre.** In the game view the scorecard sits in the right column of the hero row, so on open the left edge travels furthest (across the zone/matchup column), the right edge barely moves, the top rises past the sticky score bar and the bottom drops to the window margin. Rects are viewport-relative, so it works at any page scroll position, including a card partly scrolled out of view. The stretch during the non-uniform scale is brief at this speed; that's accepted.
- **Lock page scroll while open:** `overflow: hidden` on `<html>`, restored on close/unmount. Otherwise the page scrolls behind the backdrop and the close target moves.
- **Off-screen fallback:** on close, if the placeholder rect doesn't intersect the viewport (window resized, layout changed), fade out plus `scale(.97)` from the centre over 180ms instead of shrinking toward a slot you can't see.
- **`prefers-reduced-motion: reduce`** → instant swap both ways, backdrop included.
- **Print** (§6) skips the animation: the print layout swap and the return from it don't animate.
- While open, the card stays live: new pitches fill cells, and the rust inning and batter move. Re-fit only on resize or when `numInnings` grows (extra innings).

## 6 · Print — the full card on one US Letter page (rev 3)

- **Trigger:** a `Print` button (printer icon), **only in the full card**, before `Exit full card`. It prints the team currently showing.
- **Page:** US Letter **landscape**, 0.4in margins. That's a printable area of **979 × 739 CSS px**. On click, lay the full card out at exactly that size (same fit logic as §5), wait two animation frames, then `window.print()`. Restore on `afterprint`. Result: the sheet fills the page width and about 90% of its height. Names print at about 10pt and codes at about 6–7pt. Portrait would be about 70% of that size, so don't offer it.
- **What prints:** the card with its `◆ SCOREBOOK · All 9 innings` title line. No buttons, team toggle, backdrop or page behind it (`.noprint` on controls).
- **Three print rules (all found in review):**
  1. **Portal + hide the app root.** Render the printing card into its own `<body>` child, and in `@media print` set `body > *:not(.print-root){display:none}` and `html,body{height:auto;overflow:hidden}`. `visibility:hidden` is not enough: the hidden page keeps its height, so the browser prints 2–3 pages and repeats the `position: fixed` card on each.
  2. **Force colours:** `-webkit-print-color-adjust: exact; print-color-adjust: exact` on the print root and all its children. Otherwise the rust live inning, rust batter row, blue header/name fills and green run fill print white unless the user ticks "Background graphics".
  3. **Scope the print CSS to the printing state.** Inject the `@page` + `@media print` rules only while printing, so a normal Cmd+P elsewhere in the app isn't blanked.
- The existing print path (`Scorebook Page.html`, 112 × 96 cells) is unchanged. This is the in-app, one-click version.

## 7 · Re-bind gesture listeners when the viewport remounts (rev 3)

Opening and closing the full card (or printing) remounts the scorecard viewport. Native `wheel` / `touch` listeners bound once in a `[]` effect stay attached to the detached node, and **swipe dies** after the first full-card round trip. Either re-run the binding effect when the viewport node changes (key it on full-card / printing state, or use a callback ref), or keep the viewport at a stable tree position. If you use native scroll (§3), there's nothing to bind for the slide; this applies to any custom listeners left over, including the feed-wheel guard.

## Acceptance
- At a ~900px card, the scorecard opens with names left, totals right, inning numbers on top and the live inning second from the right. No zoom; cells 90 × 77.
- A two-finger sideways swipe slides the innings smoothly and stops where the fingers stop. The names, totals and header never move sideways. A vertical swipe scrolls rows under the frozen header. The browser never navigates back/forward.
- `‹` `›` glide one inning and disable at the ends. The label is always right, including part-way positions and a 10+ inning game.
- The live inning header and the current batter's name row are rust; switching team or a half-inning change moves both.
- With a pinch hitter at the plate, the rust is on the pinch hitter's sub-row, not the starter's; the starter's row shows muted.
- Runner trace: the traced cells end up visible beside the panel, not under it or under a frozen column.
- **Full card (rev 3):** opens over the page with a backdrop; all innings (`numInnings`) and every batter + pitching row visible, no scroll. At 1440×900, cells are about 86 × 74. At a ~924×540 window, the whole sheet shrinks and **inning 9 is still visible**, never under the totals. Esc / button / backdrop close it, and the page didn't move underneath.
- **Print (rev 3):** exactly **one** landscape Letter page, the card printed once, rust + blue + green fills present with "Background graphics" OFF. A plain Cmd+P with the full card closed prints normally (not blank).
- **After full card → exit (and after print → exit), the sideways swipe still slides the innings.**
- **Animation (rev 4):** opening grows from the card's actual slot (check it with the page scrolled part-way); closing shrinks back into the slot; the page behind can't scroll while open; after resizing the window so the slot is off-screen, close fades instead; reduced-motion = instant.
- Clip ▶ marks and runner taps still work. Print / `Scorebook Page.html` are unchanged (`cellScale` 1).

## Report back
Done / partial / blocked, the commit, which implementation you used (sticky or translate) and why, plus a screenshot at a ~900px card and at a narrow one (~680px), one of the full card at 1440×900 and at ~924×540, and a PDF of the print output.
