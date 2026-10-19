# PROMPT — Oct 19, 2026 send package (paste this into Claude Code)

Three items, in order. Supporting design files are in the subfolders.

1. **Scorecard mode — fit the card (rev 6).** If rev 4 is already built, the new items are the full-card close cross-fade (§5a) and all of §6 Print: both teams, sheet only (no header, no browser header/footer), uniformly scaled to fill the page with a 1/8 in margin, and no live highlights in print.
2. **Series drawer — Enter game + "Open game" → "Enter game" app-wide (rev 1).**
3. **At-bat end transitions (rev 1)** — close on the final pitch, pre-stage the next batter, straight to Scout at game end.

Report back per item: done / partial / blocked, the commit, and the acceptance results.

---

# Scorecard mode — fit the card: frozen edges + free-sliding innings

**Rev 6 · Oct 19, 2026.** Rev 6 reworks **§6 Print**: just the sheet (no card header, no browser header/footer), scaled uniformly to fill the page with a **1/8 in margin**, and **no live highlights** in print. **If you built rev 4, the new items are the rev 5 close cross-fade (§5a) plus all of §6.** Rev 5 ( Oct 19) changed two things: the full-card **close** now cross-fades instead of swapping contents after the shrink (§5a), and **Print includes both teams**, one page each (§6). **If you built rev 4, only those two bullets and their acceptance lines are new.** Rev 4 added **§5a Show / hide animation** (the full card grows out of its slot and shrinks back), the page-scroll lock, and the off-screen close fallback. **If you built rev 3, only §5a and its acceptance line are new.** Rev 3 added **§5 Full card** (pop-out that shows the whole sheet) and **§6 Print** (one US Letter landscape page). Rev 2 added: the rust batter row follows the player actually at the plate (sub, not starter). **If you already built rev 2, only §5–§6 and the new acceptance lines are new.** Design SIGNED OFF. Ungated, no new API. Baseline `main` @ `7c53e7f`.

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
- **Close** (Esc / button / backdrop) — **rev 5, cross-fade.** Rev 4 shrank the full card and *then* swapped in the in-page card. The content jump (whole sheet → inning window) happened after the motion and looked abrupt. Now:
  1. Snapshot the full card (`cloneNode(true)`, or render a static copy) into a `position: fixed` layer at its current rect, with a matching backdrop layer.
  2. **Immediately** switch state so the real in-page card renders in its slot (scroll lock released; the slot hasn't moved because the page was locked).
  3. Animate the snapshot onto the slot rect over **300ms total**: the transform runs over the first **60%** with `cubic-bezier(.4,0,.2,1)` and holds, then the snapshot's opacity goes 1 → 0 over the last 40%. Fade the backdrop layer out over the full 300ms.
  4. Fade the real in-page card **in** (opacity 0 → 1) starting at **45%** (135ms delay) for 165ms, `ease-out`, `fill: backwards`. The two overlap, so the contents dissolve from whole sheet into inning window while the box lands.
  5. Remove both layers on `finish`. Ignore repeat close requests while it runs.
  - Off-screen fallback (below) uses the same layers: the snapshot fades + `scale(.97)` from the centre over 180ms, and the in-page card fades in over 180ms.
- **Edges move independently, not from the centre.** In the game view the scorecard sits in the right column of the hero row, so on open the left edge travels furthest (across the zone/matchup column), the right edge barely moves, the top rises past the sticky score bar and the bottom drops to the window margin. Rects are viewport-relative, so it works at any page scroll position, including a card partly scrolled out of view. The stretch during the non-uniform scale is brief at this speed; that's accepted.
- **Lock page scroll while open:** `overflow: hidden` on `<html>`, restored on close/unmount. Otherwise the page scrolls behind the backdrop and the close target moves.
- **Off-screen fallback:** on close, if the placeholder rect doesn't intersect the viewport (window resized, layout changed), fade out plus `scale(.97)` from the centre over 180ms instead of shrinking toward a slot you can't see.
- **`prefers-reduced-motion: reduce`** → instant swap both ways, backdrop included.
- **Print** (§6) skips the animation: the print layout swap and the return from it don't animate.
- While open, the card stays live: new pitches fill cells, and the rust inning and batter move. Re-fit only on resize or when `numInnings` grows (extra innings).

## 6 · Print — the full card on one US Letter page (rev 3)

- **Trigger:** a `Print` button (printer icon), **only in the full card**, before `Exit full card`. **Rev 5: it prints BOTH teams' cards, one page each**, with the team currently showing first. Tooltip: "Print both teams' cards (US Letter, landscape, one page each)".
- **Page (rev 6):** US Letter **landscape**, `@page { size: letter landscape; margin: 0 }`. A zero page margin is what removes the **browser's own header and footer** (date, page title, URL, page numbers); they live in the page margin. The sheet sits **1/8 in** from each edge (margin on the printed element), so the usable area is **10.75 × 8.25 in = 1032 × 792 CSS px** (lay out at 790 tall so rounding can't push a blank third page).
- **Fill the page, keep the aspect ratio:** lay the sheet out at **print size** (`cellScale` 1, 112 × 96 cells, normal frozen-column widths), then scale the **whole sheet uniformly** with one `transform: scale(k)`, `k = min(1032 / sheetW, 792 / sheetH)`. Centre it on the page. Never stretch one axis: the sheet is wider than the page in proportion, so it fills the full width and about 94% of the height. Use `numInnings` for extra innings (k shrinks to fit).
- **What prints (rev 6):** **only the sheet**: the inning grid, its name and totals columns, and the pitching block. **No** card header (`◆ SCOREBOOK · All 9 innings`, the `<TEAM> batting` label, buttons); each page is identified by the sheet's own `Batting · TEAM` / `Pitching · TEAM` labels. Both teams print, one page each (`break-before: page` on the second), with the team showing first.
- **No live highlights in print (rev 6):** the live-inning header prints in the normal header colour, the current batter's row in its normal fill, and the live at-bat cell without its dashed rust border. The printed card is a plain scoresheet. On screen (in-page and full card) the rust inning, the rust batter row and the live cell stay as they are.
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
- **Print (rev 3, rev 5, rev 6):** exactly **two** landscape Letter pages, one per team (team showing first). Each is only the sheet: no card header, and **no browser date / title / URL / page numbers** (even with the dialog's "Headers and footers" setting on). The sheet fills the page width inside a 1/8 in margin, uniformly scaled and centred. No rust inning, no rust batter row, no dashed live cell. Blue header/name fills and green run fills present with "Background graphics" OFF. A plain Cmd+P with the full card closed prints normally (not blank).
- **After full card → exit (and after print → exit), the sideways swipe still slides the innings.**
- **Animation (rev 4):** opening grows from the card's actual slot (check it with the page scrolled part-way); closing shrinks back into the slot **and the contents cross-fade into the inning window during the landing, with no visible swap after it (rev 5)**; the page behind can't scroll while open; after resizing the window so the slot is off-screen, close fades instead; reduced-motion = instant.
- Clip ▶ marks and runner taps still work. Print / `Scorebook Page.html` are unchanged (`cellScale` 1).

## Report back
Done / partial / blocked, the commit, which implementation you used (sticky or translate) and why, plus a screenshot at a ~900px card and at a narrow one (~680px), one of the full card at 1440×900 and at ~924×540, and a PDF of the print output.


---

# Series drawer — "Enter game" on live and future games + "Open game" → "Enter game" app-wide

**Rev 1 · Oct 19, 2026.** Design SIGNED OFF. Ungated, no new API. Builds on the postseason bracket + series drawer (`handoff_postseason_bracket/`, rev 3).

Design reference: `holistic/series.jsx` (`EnterGame`, `SeriesGame`), shown in `Home - Postseason.html` (click any started series on the bracket).

## Change

In the series drawer (Home → bracket → click a series), **every live or future game row gets an `Enter game →` link**:

| Row | Before | Now |
|---|---|---|
| Final | Recap | Recap (unchanged, **no** Enter game) |
| Live | `Open game →` | **`Enter game →`** → live game view |
| Next scheduled (probables known) | no link | **`Enter game →`** → pregame view |
| Scheduled, probables not announced | no link | **`Enter game →`** → pregame view |
| If necessary | no link | **`Enter game →`** → pregame view (**kept on purpose**: MLB lists these with a gamePk; if the game turns out not to be needed it drops out of the series like any cancelled game) |

- **Label:** `Enter game →`, the same as the Games page and its widget. Rename the live row's `Open game →`.
- **Placement:** in the row's header line, right-aligned opposite `Game N · day · @ HOST` (where Recap sits on finals). Future rows' header becomes a flex row (`space-between`, `gap: 10`), and the status line (`If necessary` / probables / `Probables not announced`) stays underneath.
- **Style:** link, DM Sans 12px / 700, `white-space: nowrap`, default `a` colours (rust; darker rust on hover).
- **Target:** the game's `gamePk` route (the same one as the Games page). Opening it doesn't close the drawer first; normal navigation handles that.
- If a future game has no `gamePk` yet, render no link (not a disabled one).

## Copy sweep — one verb app-wide: `Enter game →`

"Open game" and "Enter game" did the same thing (go to the game page). Standardize on **`Enter game →`**, the established term (Games page cards, the live widget, Team page). Replace the remaining three:

| File | Line | Change |
|---|---|---|
| `client/src/pages/home/SeriesDrawer.tsx` | ~160 | `Open game →` → `Enter game →` (covered above) |
| `client/src/pages/HighlightsPage.tsx` | ~158 | `Open game →` → `Enter game →` |
| `client/src/components/alerts/alertTypes.ts` | ~32 | both `"Open game →"` → `"Enter game →"` (`▶ Watch clip` unchanged) |

After this, `grep -rn "Open game" client/src` returns nothing.

## Acceptance
- ALDS NYY–BOS: G1–G3 Recap only; G4 (next) and G5 (if necessary) show `Enter game →`.
- ALDS CLE–HOU: G3 (live) shows `Enter game →` (not "Open game"); G4/G5 (if necessary) show it too.
- A finished series (e.g. a Wild Card) shows no Enter game links.
- Each link lands on that game's live or pregame view.
- No "Open game" text anywhere in the app: Highlights rows and alert actions read `Enter game →`.

---

# At-bat end transitions — close on the final pitch, pre-stage the next batter, go straight to Scout at game end

**Rev 1 · Oct 19, 2026.** Ungated, no new API. Baseline `main` @ `7c53e7f`.

## The bug, and why it's bigger than the scorecard

`client/src/hooks/useAtBatHistory.ts` only moves an at-bat into `completedAtBats` when **the next at-bat's first pitch arrives** (`isNewAtBat`). The final pitch sets `result` but leaves the at-bat as `currentAtBat`. So:

- **Scout / finished games:** the game's last at-bat never closes, because no next pitch ever comes. The scorecard, the batter card's At-bats row and anything else built from `completedAtBats` miss the final play.
- **Live, not the 3rd out:** after the at-bat ends, the screen keeps showing the batter who just finished until the next batter's first pitch, often 20–40 seconds later.
- **Live, game-ending play:** the view goes through the half-inning "Due up" state before becoming final.

The server already sends `isFinalPitchOfAtBat` (BUG-023 fix), so the client can know the moment an at-bat ends.

---

## Part A · Close the at-bat on its final pitch (`useAtBatHistory.ts`)

- When a processed update has `isFinalPitchOfAtBat === true`, set the result fields as today, then **push the at-bat into `completedAtBats` immediately** and set `currentAtBat = null`.
- The next pitch then starts a fresh at-bat via the existing `cur == null → isNewAtBat` path. Keep the `isHalfEnd` marking: set it at close time when this play's `outs === 3`, and keep the existing inning-change check as a backup.
- **MLB resends the last pitch** with its result a few seconds later, and the existing `changed` → rebuild path handles that. Make sure the rebuild also closes on `isFinalPitchOfAtBat`, so the at-bat isn't pushed twice.
- Pitchless plays (automatic intentional walk, caught stealing as its own play) carry `isFinalPitchOfAtBat: true` on their single frame and close the same way.
- **A runner out ends the inning, not the at-bat** (caught stealing for the 3rd out while a batter is up). No `isFinalPitchOfAtBat`, so that batter's at-bat must **not** close. It's dropped as an unfinished PA, and he leads off his team's next half. See Part D.

**Accept:** on 824164 and two postseason finals in Scout, the last play of the game appears on the scorecard, in the batter card's At-bats row and in Earlier at-bats. No at-bat appears twice after the result resend. Scrubbing back and forth with the marker gives the same result.

## Part B · Live, not the 3rd out — pre-stage the next batter

When the final pitch of an at-bat arrives and `outs < 3` (and the game isn't over, Part C):

1. **Work out who is up next:** the batting team's `activeLineup`, the slot after the batter who just finished. That's the same cycle as `dueUp()` in `lineupUtils.ts`, anchored on the finished batter's id. If the live feed exposes MLB's own `linescore.offense.batter` / `onDeck` after the play, **prefer it**: it already knows about an announced pinch hitter. The lineup math is the fallback.
2. **Initialise the whole live view for him**, the same way the half-inning transition pre-stages its leadoff batter, but for the **same team in the same inning**:
   - **Batter card:** his headshot, name, today line, his At-bats row (with an empty dashed live cell) and `vs PITCHER`.
   - **Zone:** empty, count **0-0**, outs and bases as left by the play just finished.
   - **Pitch-by-pitch canvas:** pinned to him with `· up next · 0-0` and a soft **UP NEXT** pill (same style as the half-inning `DUE UP` pill), rust dropped to neutral until his first pitch. The finished at-bat is already at the top of **Earlier at-bats** with its result, code badge and scoring chip. That's where his result stays visible, so don't hold the old batter on screen.
   - **MatchupContext:** head-to-head for him versus the pitcher, with On deck / In the hole moved along by one.
   - The **height lock** still applies: nothing changes height between "up next" and live.
3. **His first pitch arrives:**
   - **Same batter as projected:** the pill drops, rust returns and pitches fill in. Nothing else moves.
   - **A different batter (pinch hitter):** re-initialise everything for the real batter, then continue normally. Also re-derive if a boxscore refresh changes `activeLineup` for that slot before the first pitch, so an announced pinch hitter shows up early.
4. **Mid-at-bat pinch hitter** (same `atBatIndex`, new `batterId`): switch the batter card and canvas to the new batter and keep the count and pitches. MLB credits the PA by count rules, so keep the existing result handling.

**Accept:** in a live game, the moment a non-3rd-out at-bat ends, the screen shows the next batter at 0-0 with UP NEXT, and the finished at-bat is at the top of Earlier at-bats. A pinch hitter's first pitch swaps the view to him. Nothing changes height.

## Part C · Game-ending play → straight to Scout, no "Due up"

When the final pitch of an at-bat **ends the game**, don't enter the half-inning transition. Switch to the finished-game (Scout) view at once, with the marker on the last pitch (`setScoutMarkerIdx(stableUpdates.length)`, as when a game loads final).

Decide game over **locally, from the play itself**. Don't wait for the schedule's `FINAL`, which can lag. Using the play's post-play score, inning, half and outs, for `inning >= 9` (or the scheduled length):

| Play | Game over when |
|---|---|
| 3rd out, **top** half | home team leads (bottom half not needed) |
| 3rd out, **bottom** half | away team leads (if tied → extra innings, normal Due up) |
| **Walk-off**: bottom half, **any outs** | home team takes the lead on this play |

The walk-off ends the game **without** a 3rd out. It's covered here even though it isn't the 3rd-out case, because it would otherwise pre-stage a next batter (Part B) for a game that's over.

- Shortened or suspended games (rain, mercy rules) aren't predictable from the play. For those, keep today's behaviour and switch when the status becomes final.
- If the local call is ever wrong (a scoring correction), the feed's live status wins on the next update.

**Accept:** a top-9 3rd out with the home team ahead, a bottom-9 3rd out with the away team ahead and a walk-off each go straight to the Scout view with the final play on the scorecard. None of them shows Due up or UP NEXT. A tied bottom-9 3rd out still shows Due up.

## Part D · Fix the due-up anchor (`halfInningTransition.ts → deriveDueUpNext`)

`deriveDueUpNext` anchors on the **last `batterId` seen** for the incoming team. If that team's previous half ended on a runner out (caught stealing / pickoff for the 3rd out) while X was at the plate, X never completed his PA and **leads off** the next half. The current anchor skips him.

Anchor on the **last completed PA** for that team (from `completedAtBats`, which Part A keeps correct), not the last update. Part B's next-batter lookup uses the same rule.

**Accept:** find a half-inning ending on a caught stealing or pickoff in the audit set (824164 AB11, Carter caught stealing). The batter who was at the plate leads off that team's next half in Due up.

---

## Report back
Per part: done / partial / blocked, the commit, and the acceptance results with game IDs. Note whether the live feed's `linescore.offense` was available for Part B or you used the lineup fallback.
