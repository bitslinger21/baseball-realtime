# Game view — design sync handoff (Aug 26, 2026)

The game view has been reconciled screen-against-app in four sections. The app was the
source of truth: where the shipped code had moved ahead, the design was updated to match
and there is nothing for you to do. **This document lists only the deltas that still need
to land in the app.**

Design files of record (attached): `holistic/game-v2.jsx` (live), `holistic/game-scout.jsx`
(Scout / finals), `holistic/shared.jsx` (tokens + atoms), `holistic/app.jsx` (canvas only).

Target files: `client/src/pages/game/` — `GamePage.tsx`, `LineScoreBand.tsx`,
`MatchupLeft.tsx`, `MatchupContext.tsx`, `PitchByPitchV2.tsx`, `PitcherCard.tsx`,
`LeverageCard.tsx`, `ScoutControls.tsx`, and their `.css` siblings.

---

## 0. Headline decision — the plain final view goes away

**Scout mode becomes THE view for completed games.** Today a final game opens in a static
"everything already happened" view, and Scout is a separate mode. The overlap is nearly
total, and the static view is the weaker of the two: it shows the finished state with no way
to watch the game arrive.

So: **a final game opens in Scout, paused at the start of the game, with nothing filled in
yet.** The marker sits at position 0; the line score, scorecard and feed reflect only what
has happened up to the marker. Play advances it. The old static final view is removed, not
kept as an option.

Two consequences worth naming before you start:

1. Anything that reads "the final state" now has to read "state at the marker" — the line
   score band, the batter card's at-bats row, the scorecard sheet, win prob and leverage.
   Most of this already exists in Scout; the work is deleting the static path, not building
   a new one.
2. A user landing on a finished game sees an empty scoreboard until they press play. Add a
   one-time hint near the transport — the design shows "Press play to watch the game" — so
   an empty line score never reads as a data failure.

## 1. Terminology — "head" → "marker"

Rename the play-head concept to **marker** in all user-facing copy and, where cheap, in
code (`scoutHeadIdx` → `scoutMarkerIdx`, etc.). "Play head" is production jargon; "marker"
is what it looks like. Nothing else about the model changes.

---

## 2. Content column — the game view's declared exception

Everywhere else in the app the content column is **1240 inside 28px gutters**. The game view
is the **one declared exception: a 1600 box → 1544 of content**, because the left hero
column is a fixed 600px and 1240 would starve the pitch feed to 568px. At 1600 the feed
lands at ≈928px.

The app is full-bleed here today. Adopt the 1600 box: one `max-width: 1600px; margin: 0
auto; padding: 0 28px; box-sizing: border-box` wrapper, applied to the band, the hero grid
and the below-the-fold row alike, so every edge on the page lines up. Nothing is full-bleed
except the header's bottom hairline.

---

## 3. Below the fold — the pitcher card is retired

`PitcherCard` (and Scout's `MoundCard`) is a full-width ~190px card carrying six numbers,
below the fold where it is rarely reached. **Remove both from the layout** and move their
content up, condensed, as the **header row of `MatchupContext`** — which is the right home
for it, because the head-to-head immediately below is "batter vs *this* pitcher", so the
strip names the subject of the card it heads.

The strip, at `surfaceAlt` with a bottom border and `9px 16px` padding, is a three-column
grid — `auto minmax(0,1fr) auto`:

| Slot | Content |
|---|---|
| left | `Headshot` at `size={30} ratio={1.15}` |
| middle | eyebrow `Pitching · HOU` (11px), then name (14/700, links to `/player/:id`) + `RHP · #29` (mono 11, faint) |
| right | two right-aligned mono lines, `whiteSpace: nowrap` |

Right-hand lines, `tabular-nums` throughout:

```
3 1/3 IP   2 H · 0 R · 4 K · 1 BB          <- 12.5px; IP value bold, unit faint 11px
14 P · ERA 0.00 · WHIP 0.96                <- 11.5px, muted; faint units and separators
```

Both rows use `·` separators — the second row originally used gaps alone and read as
unrelated fragments next to the row above it.

Do **not** try to fit this on one line. It was built as a single row first and needed
~620px inside the 600px column, so it wrapped and the auto-margined stats block floated
mid-strip, aligned to neither edge. Two explicit rows, ~57px total.

Three data notes:

- **WHIP** is not in the current `pitcherLine` payload — it needs adding (season WHIP,
  same source as season ERA).
- **Handedness**: show `RHP`/`LHP`, not the raw `P` that comes back in `position`. Map the
  pitcher's throwing hand through.
- The eyebrow is **`Pitching · HOU`**, team included; the app's plain "Pitching" loses the
  side, which matters when you have arrived from a scoring play.

Keep the `PitcherCard` component in the tree, unmounted, if you want the fuller treatment
back later. Its stat labels were 9px; if it is ever restored they must be 11px minimum
(see the Jul 4 small-label floor).

## 4. Leverage card

The app derives its situation sentence and thresholds correctly (≥2.0 HIGH, ≥1.0 MED, else
LOW; scale auto-expands past 3.5 when the peak demands it) — that is all kept.

**But the app dropped the plain-language explanation**, which was part of what was signed
off. Restore it above the situation line, 12px muted, `line-height: 1.5`:

> How much this moment can swing the outcome vs. an average play. *(then the generated
> situation: "Runners on 1st & 2nd, 2 outs, tying run aboard.")*

The card is otherwise unchanged. The big number stays **rust at every tone** — do not tint
it by LOW/MED/HIGH; the pill already carries the tone, and a tinted number reads as a
second, competing signal.

## 5. Win probability

No changes. The app's data-driven inning ticks and exact `atBatIndex / lastAtBatIndex`
X-domain are better than the design's approximation and the design has been updated to
match. Copy is the only difference and the app's is fine.

---

## 6. Pitch-by-pitch — one header, one control set

Today the controls are duplicated: one set on the feed, another on the scorecard, and the
timeline would have made a third. Collapse to **two stacked sections inside the card**:

**Section 1 — pinned header.** One row, and it stays put across both modes:
- left: the context label — `△9 · Batter Name` in feed mode, the Scorebook wordmark in
  scorecard mode
- right: the full control set — jump-to-inning, playback speed, play/pause, step batter
  (◂ ▸), step pitch (‹ ›), the `Feed | Scorecard` switch, and in scorecard mode the
  HOU/CHC team toggle
- below it, still pinned: **the timeline** (section 7)

**Section 2 — content.** Either the pitch feed or the scorecard sheet. This is the only
part that changes when you switch modes.

**Remove the `All / Runs / K / HR / BB` filter segmented control.** It is not in the app and
is not wanted — the timeline and the marker are how you move around the game now.

**Mode switch mechanics.** The scorecard **slides up from beneath the content region**; it
does not flip the card and does not cover the header or the timeline. The 3D `rotateY` flip
is retired — with a pinned header and timeline above, flipping the whole card would take
them with it.

One porting note: opening the scorecard must go through the same handler that seeds the
displayed team and resets pan/zoom. Wiring the switch straight to the open/closed boolean
leaves the sheet showing one team while the toggle highlights the other.

## 7. Timeline

A scrub timeline occupying the space the removed "Upcoming" zone used to hold (see §8),
pinned directly under the header row.

- **Two lanes**, away above, home below — so a run is attributable at a glance without a
  legend.
- **Team colours** distinguish the lanes: each team's own colour, not rust/navy, which the
  eye reads as generic accent.
- **Run markers** overlaid on the lane, one per scoring event, sized by runs scored.
- **The marker itself gets its own colour**, distinct from both team colours and from the
  scoring markers. It is a position, not an event, and users read a rust marker as a run.
- **One stop per pitch**, so short innings and long innings look different — this was
  chosen over 28 out-stops. **No out ticks for now**; they can be added later.
- Dragging seeks; play and manual stepping move the marker, and the marker's position is
  the single source of truth for the whole screen.

## 8. Scout — Upcoming zone removed, transport relocated

- **Remove the "Upcoming" zone** from the three-zone canvas. On deck and in the hole are
  already shown in `MatchupContext`, so it duplicated them. The canvas is now two zones:
  the current at-bat pinned, and Earlier at-bats below.
- **Transport controls move onto the batter row** of the canvas header, right-justified —
  same row as the batter's name rather than a separate strip beneath it. One row saved, and
  the controls sit next to the thing they move.

---

## 9. Carried over from the earlier sections (still outstanding in the app)

From section 2 (dark band):
- Game-leader names at **15px with a dotted-underline link** to the player page (app is
  12px, unlinked).

From section 3a (left column):
- **Rewind context strip** above the zone: a `LIVE AT-BAT` dot line, or — when a past
  at-bat is selected from the scorebook row — a rust-tinted strip naming it with a **Live**
  button to return.
- **"tap to replay in zone"** hint beside the At-bats label.
- **Batting-order spot** beside the batter's name.
- The scorebook row's live cell is **tap-to-select**, not static: tapping a past cell moves
  the rust dashed selection there and drives the zone and last-pitch strip.

---

## Acceptance

1. A final game opens in Scout, paused at game start, scoreboard empty, hint visible.
2. Every edge on the game view aligns to a 1600 box / 1544 of content; the pitch feed is
   ≈928px wide.
3. No standalone pitcher card anywhere; the condensed strip heads `MatchupContext` in both
   live and Scout, on two rows, `·`-separated, nothing wrapping or floating.
4. WHIP and `RHP`/`LHP` render real values.
5. Leverage shows the explanation sentence; number is rust at all tones.
6. The pitch-by-pitch card has exactly one control set, pinned with the timeline above the
   content; no `All/Runs/K/HR/BB` filter; the scorecard slides up over the content only and
   opens on the correct team.
7. Timeline: two team-coloured lanes, run markers, a distinctly-coloured marker, one stop
   per pitch, drag-to-seek.
8. Scout has no Upcoming zone; transport sits on the batter row, right-justified.
