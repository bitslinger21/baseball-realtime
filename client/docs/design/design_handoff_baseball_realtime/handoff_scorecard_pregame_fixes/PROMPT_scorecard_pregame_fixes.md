# Scorecard mode before first pitch — 4 fixes

**rev 6 · Oct 22, 2026** · Ungated, no new API · Follows `handoff_scorecard_transition/` (rev 1, as built)

> **rev 6: SCOPE FIX. Fix 1 applies BEFORE THE FIRST PITCH ONLY.** rev 5 said "in scorecard mode" in general, and
> that broke the mid-game scorecard. **From the first pitch on, scorecard mode is unchanged and stays exactly as
> built:** the left column shows the batter at the marker, the play-state strip and the strike zone; the sheet
> matches the left column's height and scrolls inside itself. If you already applied rev 5's row-height change to
> every state, undo it for every state except before the first pitch.
>
> rev 5: the standalone preview is fixed. In rev 3–4 the design's own sheet stopped after about three batters,
> the same bug as the app. Re-open the standalone file: it now runs down to Win probability / Highlights. The
> cause and the fix apply to the app too: **the sheet card must size to its container (`height: 100%`), not to a
> height measured once at mount.** See Part 1.
>
> rev 4 added `app_now_oct22.png`, a screenshot of the app taken after rev 1–3 were sent. **None of the four fixes
> are in it yet.** See "Where the app is now" below. The fixes themselves are unchanged.
>
> rev 3 added **`Scorecard - Before First Pitch (standalone).html`**. It's a single file, so double-click it to open
> it in a browser. Open it at desktop width (≥1400px) to see the target state exactly. The other preview file
> (`Scorecard - Before First Pitch.html`) needs a local web server and shows a blank page if opened straight from
> disk. The four fixes are unchanged from rev 1.

Found in a screenshot of the shipped app: Scout, scorecard mode, head before the first pitch (CLE @ TB). The Starting
pitchers sidebar and the 2×2 scorecard header are correct; leave them alone. Fix only the four items below.

Design reference (read, don't copy): `holistic/game-scout.jsx` → `ScorecardPregameSidebar`, and the
`sheetNeed` row height in `GameScoutPrototype`; `holistic/scorecard-frozen.jsx` → the `empty` prop (blank sheet).
Preview: `Scorecard - Before First Pitch (standalone).html`.

**Not for port** (preview scaffolding only): the `SCOUT_PREGAME` flag / `?pregame`, the marker forced to pitch 1, and
`PregameAnalyticsStub` (the Win probability / Leverage placeholders). The line score and timeline in the preview
show pitch 1, not pregame. Ignore them.

## Where the app is now (`app_now_oct22.png`)

This is Scout on a FINAL game with the marker at the start, which counts as "before the first pitch" (Part 2).
Compare it with the standalone preview:

| # | App now | Target |
|---|---|---|
| 1 | The sheet is about 230 px tall, shows one batter (Yandy Díaz) and stops level with the sidebar. A separate `Waiting for data…` line sits **below the whole row**, centred on the page, in the empty band above Highlights. | The sheet runs down to Highlights and shows all 9 batters plus pitchers. **Remove** that page-level `Waiting for data…` line. The message lives **inside the sidebar card**, under the two pitchers, filling the rest of the column (Part 1). The two cards end at the same height. |
| 2 | Opens on **Tampa Bay Rays** (home). | Opens on **Cleveland Guardians** (away: they bat first). The CLE/TB toggle shows CLE selected. |
| 3 | The `Cleveland Guardians @ Tampa Bay Rays · Mon Oct 19 · Tropicana Field` strip sits above the dark team bar. | Gone on screen. The header goes straight to the dark `Tampa Bay Rays` / `Cleveland Guardians` bar. Print only. |
| 4 | A grey scrollbar shows under the innings (and a vertical one at the top right of the sheet). | No visible scrollbars. Scrolling still works. There's no vertical scroll at all once fix 1 is in, because the sheet is tall enough. |
| — | A dark team bar (`[logo] Tampa Bay Rays`) sits above the column-header row. | The design has no separate bar. The team is named in the header corner (`Batting · HOU`). **Not part of this fix.** Leave the bar as built unless design says otherwise. |

The page-level `Waiting for data…` is probably the main game view's empty-feed placeholder rendering under the
hero grid. In scorecard mode before the first pitch it shouldn't render there at all.

## 1. Before the first pitch only: the scorecard runs down to Highlights; "Waiting for updates" goes under the pitchers

**Now:** the hero row matches the right column's height to the left column's (the Jul 11 rule). Before the first pitch
the left column is only two short pitcher rows, so the scorecard is about 250 px tall and shows one batter (Yandy Díaz).

**Fix:**
- **Before the first pitch only**, the **scorecard sets the row height**, not the sidebar. The sheet gets its normal
  height and ends just above the Highlights card. From the first pitch on, the row goes back to the as-built rule:
  the left column (batter · strip · zone) sets the height, and the sheet scrolls inside it. Pitch-by-pitch mode
  keeps its own Jul 11 cap.
- The sheet card fills that row: `height: 100%` of its slot. Don't pass a pixel height measured when the slot first
  rendered. The slot is short at that moment (the sidebar's height), so a measured height freezes the sheet short
  even after the row grows. The design made exactly this mistake until rev 5.
- The left column stretches to the same height (`align-items: stretch`). Its card is a flex column. If your card
  component wraps its children in an inner block, the flex layout has to apply to that inner wrapper too, or the
  waiting block won't fill. The design hit exactly this.
  The card contains:
  - eyebrow row (`STARTING PITCHERS · First pitch 7:08`), unchanged
  - away pitcher row, then home pitcher row, unchanged
  - **new:** a "Waiting for updates" block fills the rest (`flex: 1`, at least 120 px), centred:
    - `Waiting for updates`: 13 px / 600, `T.text`
    - `The sheet fills in from the first pitch.`: 12 px, `T.textMuted`
    - fades in like the rows: 0.9 s, +0.4 s delay
- This **revises** `PROMPT_scorecard_transition.md` §2's acceptance line ("never 'Waiting for updates'"). The message is
  back, but **below** the starting pitchers, never instead of them.
- At pitch 1 the normal sidebar (batter · strip · zone) takes over, as before.

## 2. Open on the team at bat

**Now:** before the first pitch the sheet opens on the **home** team (Rays).

**Fix:** scorecard mode always opens on the **team at bat at the head**:
- Before the first pitch, that's the **away** team (top of the 1st).
- In Scout, it's the batting team at the marker. Live, it's the batting team now.
- This sets only the starting team. The user's team toggle still works, and stays as they set it until they leave
  scorecard mode. Reopening picks the team at bat again.

## 3. Remove the game-title strip from the on-screen card

**Now:** a row reading `[logo] Cleveland Guardians @ [logo] Tampa Bay Rays   Mon Oct 19 …` sits between the scorecard
header and the dark team bar.

**Fix:** that row belongs to the **printed sheet only** (Full card → Print). Don't render it on screen, in the in-page
card or in the Full card. On screen the card goes straight from the header (SCOREBOOK · innings · transport · timeline)
to the dark team bar (`[logo] Tampa Bay Rays`). Keep it in the print output.

## 4. Hide the innings scrollbar

**Now:** a grey browser scrollbar shows across the bottom of the sheet all the time.

**Fix:** hide the scrollbar but keep scrolling (two-finger swipe, Shift+wheel, touch drag, and the `‹ ›` chevrons all
still work):

```css
.scorecard-innings { scrollbar-width: none; }
.scorecard-innings::-webkit-scrollbar { display: none; }
```

Don't use `overflow: hidden`, because that stops scrolling. Applies in every state, not just before the first pitch.

## Acceptance

- Scout, head before the first pitch, scorecard mode: the sheet runs down to just above Highlights and shows the
  full lineup. On the left: Starting pitchers, then "Waiting for updates" filling the rest of the column.
- The two columns end at the same height. Nothing changes height when the head reaches pitch 1 (the sidebar contents
  swap inside the same box).
- Pitch-by-pitch mode still caps the right column to the left (Jul 11 behaviour unchanged).
- **Mid-game scorecard mode is unchanged:** batter at the marker + strip + strike zone on the left; the sheet is the
  same height as that column and scrolls inside itself. Check this at any head after pitch 1.
- Opening scorecard mode before the first pitch shows the away team. Mid-game, it shows whoever is batting at the
  head. The toggle still switches teams.
- No game-title row on screen. Print still has it.
- No visible scrollbar under the innings. Swipe, Shift+wheel and the chevrons still scroll.
