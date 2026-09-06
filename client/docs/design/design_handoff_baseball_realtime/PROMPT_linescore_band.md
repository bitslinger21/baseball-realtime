# Line score band → thin sticky bar + drawer (Sep 5, 2026)

The dark line-score band at the top of the game view is replaced. It was **164px of fixed
chrome**: it never scrolled away, never changed height, and cost the same on every visit —
roughly a quarter of the pitch-by-pitch feed's height. It is now a **48px sticky bar holding
the score**, plus a **drawer** that overlays the content when you want the inning grid.

Design file of record (attached): `holistic/game-v2.jsx` — `LineScoreBand`. Tokens in
`holistic/shared.jsx` (unchanged). `holistic/app.jsx` is canvas-only; its extra-innings
artboard now passes `defaultOpen` so the drawer's grid is visible without a click.

Reference: `Line Score Band — Compression Options.html` — the four compression options this
was chosen from, measured at real 1544 width. Option 3, then cut further.

Target: `client/src/pages/game/LineScoreBand.tsx` + its `.css` sibling. No new API, no new
fields — this is layout and deletion only.

**Not in scope:** `PregameLineScoreBand` still has its old three-zone form, and Scout mode
(`game-scout.jsx`) has not been given this treatment yet. Leave both alone; they will follow.

---

## 0. Three things are DELETED, not moved

This is the substance of the change, so do it deliberately rather than as cleanup. Each was
removed because the screen already shows it somewhere closer to the user's eye:

| Removed from the band | Because it already lives in |
|---|---|
| **LIVE pill + elapsed** | the page header's h1-row status slot |
| **Inning indicator** (`Live · ▼9`) | the play-state eyebrow, next to B/S/O |
| **Last pitch** — type / velo / result | the pitch-by-pitch feed itself |

The last-pitch deletion is the one to read twice. **It reverses the Jul 18, 2026 decision
that moved last pitch INTO the band, and that decision shipped** — so this is a deletion from
working code, not a no-op. It does **not** go back to `MatchupLeft`, where it lived before
July. It is gone from the screen; the feed is its only home. The user's reasoning, verbatim:
*"a user watching the game will not look up to see the pitch type/velo each time when it's
already shown in the spot the user is looking."*

`MatchupLeft` keeps the shortened form it gained in July — do not restore its bottom
headline strip.

The **scoring summary** (old Zone 2) was already removed in the Jul 11 polish pass and stays
removed.

What survives: **the score**, and **the inning-by-inning breakdown behind it**.

---

## 1. The bar — 48px, score only

One flex row, `height: 48px`, `padding: 0 20px`, `background: ink`, `border-radius: lg`:

- **Score block** (`flex-shrink: 0`, gap 10): away `TeamDot` 22px + abbr → away runs →
  `–` → home runs → home abbr + `TeamDot` 22px.
  - Runs: mono, **26px, 800**, `tabular-nums`. **Leader is `#fff`, trailer is `#c4c4cc`** —
    the score is legible as a result, not two equal numbers.
  - Abbrs: sans, 13px, 700, `letter-spacing: 0.04em`, `#fff`.
  - The `–` separator is mono 18px `#52525b`.
- **1px × 24px divider** (`#3f3f46`).
- **The drawer trigger**, immediately after the divider: `Line score & leaders ▾`.
  Sans 11.5px/700, uppercase, `letter-spacing: 0.08em`, `padding: 6px 11px`,
  `border-radius: 7px`, 1px border `#3f3f46` → **`accent` when open**, text `#b0b0b8` → `#fff`
  when open. Caret `▾` → `▴`. Carries `aria-expanded`.
- **Then a `flex: 1` spacer.**

The trigger sits **next to the score, not at the far right**. A lone button across 1500px of
empty band reads as unrelated chrome.

`isLive` stays on the props for callers and a possible future final treatment, but the bar
renders no status. Do not add a FINAL label — the header owns game status.

## 2. Sticky

The bar is `position: sticky; top: 0; z-index: 30`, wrapped so it pins as the page scrolls.
This is deliberate and is the other half of the original complaint: **scrolling down to the
feed used to lose the score entirely.** At 48px it is cheap enough to keep pinned, and it
becomes the one piece of game chrome that survives scrolling.

Check the real page for an `overflow: hidden` ancestor between the bar and the scroll
container — that is the usual reason a correct `position: sticky` does nothing.

## 3. The drawer — overlays, never pushes

`position: absolute; top: calc(100% + 6px); left: 0; z-index: 40`, on a `position: relative`
wrapper around the bar. Dark `ink` surface, `border-radius: lg`,
`box-shadow: 0 18px 40px rgba(0,0,0,0.38)` when open, `2px solid accent` top border on the
inner block. Animated with `max-height` (0 → 260) + opacity, `0.32s
cubic-bezier(.22,.7,.3,1)`; `pointer-events: none` while closed.

**It must overlay the content below, not push it down.** The bar is sticky: a drawer that
pushed would shove the feed down and move whatever the user was reading, then yank it back on
close. Same posture as the scorecard panel.

**Width is shrink-to-fit** — `left: 0` with **no `right`**, plus `max-width: 100%`. The panel
ends just past Game leaders instead of running full-bleed with an empty half. When Baseball IQ
situational facts land (`future.md` **F-010**) the panel simply gets wider; nothing
pre-commits that space, and nothing should be put there now.

**Keep the drawer always mounted.** The innings scroller needs real layout width to measure
whether its chevrons are needed; mounting it on open gives you a zero-width measurement and no
chevrons.

Drawer contents, `display: grid`, `grid-template-columns: minmax(0, 560px) max-content`,
`justify-content: start`, padding `14px 20px`:

1. **Line score** (see §4).
2. **Game leaders** — unchanged from today: 2 reserved slots, `TeamDot` 22px, name 15px
   (links to the player page, dotted underline), line mono 13px `#c4c4cc`. `border-left:
   1px solid #27272a`, `padding-left: 20px`.

**Column 1 must be capped at 560px, not `1fr`.** The cap does three jobs: keeps Game leaders
adjacent to the grid it belongs with (a `1fr` column swallowed the free space and stranded
leaders at the far right, ~829px away), keeps a narrow frame able to provoke the innings
overflow chevrons, and stops the shrink-to-fit panel from stretching.

## 4. Line score — ONE scroller (this part matters)

**Structure: fixed label column · one horizontally-scrolling grid · fixed R/H/E.**

The scrolling middle is a single `display: grid` with
`grid-template-rows: 22px 30px 1px 30px` (header · away · **hairline** · home),
`grid-auto-flow: column`, `grid-auto-columns: 28px`, `column-gap: 1px`. Each inning emits
four cells in row order: inning number, away runs, hairline, home runs. The label column and
the R/H/E column use the **same four-row template**, with a `#27272a` background cell in the
hairline row, so the hairline reads as one continuous line across all three sections.

- Inning number: mono 14px/700, `#b0b0b8`, **`accent` for the current inning**.
- Run cell: mono 14px, `tabular-nums`, `#fff`; `null` renders `–` in `#52525b`; current
  inning gets `background: rgba(184,66,30,0.22)`, `border-radius: 4`.
- Labels: `width: 132`, `TeamDot` 24px + team short name (14px, **away 700 / home 600**,
  ellipsised, links to the team page). Header row of that column reads `INNINGS` — 12px/700
  uppercase `#8b8b93` — since status moved to the header.
- R/H/E: three 34px cells, mono 17px/700; **R is `#fff`, H and E are `#d4d4d8`**. Header row
  is sans 14px/700 `#b0b0b8`. `border-left: 1px solid #3f3f46`, `padding-left: 10`,
  `margin-left: 8`.
- Chevrons: absolutely positioned over a gradient fade (`linear-gradient(to right/left, ink
  55%, transparent)`), 40px wide, rendered **only when there is overflow** on that side, and
  they `scrollBy` **3 innings (87px)** smoothly. Measure on scroll: `canL = scrollLeft > 1`,
  `canR = scrollLeft + clientWidth < scrollWidth - 1`.
- Innings count is **derived** — `max(9, currentInning, awayRuns.length, homeRuns.length)` —
  so extra-inning games grow the grid on their own.

### ⚠️ Port note: the bug this structure exists to kill

The previous model was **three separate scrollers** (inning header, away runs, home runs)
kept in sync by assigning `scrollLeft` to the other two on every scroll event. It had a
latent desync that the design source has now fixed structurally, and **the shipped app very
likely still has it** — visible in extra-inning games, where the inning numbers drift off the
runs beneath them mid-scroll.

Two independent causes, both real:

1. The run rows were `overflow-x: hidden`. **`scrollLeft` is not writable on a
   hidden-overflow element**, so the sync assignment silently no-oped.
2. `Row`, `cell` and `rhe` were declared **inside** the `LineScoreBand` component body. Every
   `setCanL`/`setCanR` therefore produced a *new component type*, React unmounted and
   remounted those rows, and the fresh DOM nodes came back at `scrollLeft: 0` — mid-scroll,
   and mid-`scrollBy` for the chevrons.

Do not port a synced-scroller version and do not fix it by patching either cause. **One
scroller means there is nothing to sync**, no refs to coordinate, and no way for the header to
drift from the runs — they are columns of the same grid. If your framework's equivalent of
declaring components inside a render exists in `LineScoreBand.tsx`, hoist those out while you
are in here.

---

## 5. Acceptance

- Band measures **48px** at rest (was 164). No horizontal overflow at 1544.
- Bar stays pinned while the feed scrolls; the score is readable at every scroll position.
- Trigger toggles `aria-expanded`; drawer animates open and **the feed below does not move**.
- Drawer ends just past Game leaders — no empty half-panel, no full-bleed stretch.
- No LIVE pill, no inning indicator, no last-pitch type/velo/result anywhere in the band.
- `MatchupLeft` unchanged (still no bottom last-pitch strip).
- In a 13-inning game in a narrow frame: both chevrons appear, and a chevron click moves the
  inning numbers and BOTH run rows together, staying aligned.
