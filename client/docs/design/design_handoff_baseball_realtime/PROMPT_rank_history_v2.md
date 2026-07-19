# Standings — Rank History v2 + Division card flip (dev handoff, Jul 18, 2026)

Extends the Standings page with two features built on top of `PROMPT_rank_history.md`:

1. **Playback animation** on the full Rank History tab — a play/pause/replay button that animates
   cumulative wins growing from Opening Day to today.
2. **Division card flip** on the Divisional view — clicking a small chart icon on any division card
   flips it over to show a mini animated win-pace chart for that division.

Source of truth: the app's `StandingsPage.tsx` / `StandingsPage.css`. Update `holistic/standings.jsx`
to match. `PROMPT_standings.md` and `PROMPT_rank_history.md` are the prior layers; this doc adds
only the delta.

---

## 1 — Rank History tab: playback animation

### What changed

`RankHistoryCard` gains a **▶ / ⏸ / ↺ button** to the left of the scope `<select>`. Pressing it
replays the season from Opening Day: all team lines start at zero wins and grow rightward at
~22 days/second, reaching today's real record in about 4–5 seconds.

### Button states

| State | Icon | Condition |
|---|---|---|
| Play | ▶ | Not playing, not at end (or never started) |
| Pause | ⏸ | Currently playing |
| Replay | ↺ | Finished — `playDay` reached the final day |

Clicking **▶** always restarts from day 0 (no resume from pause). Clicking **⏸** pauses in place.
Changing the scope resets playback state (stop + clear `playDay`).

### Animation mechanics

- `playDay: number | null` — a float from 0 to `RH_DAYS.length − 1`. `null` = show all days (static).
- Driven by `requestAnimationFrame`; `playDay` advances by `dt × 22` per tick where `dt` is elapsed
  seconds since last frame.
- **Smooth tip**: the polyline for each team includes a fractionally-interpolated final point between
  `floor(playDay)` and `ceil(playDay)`, so the line tip moves continuously rather than jumping one
  day at a time.
- **Logo dots follow the live tip** during playback — they're positioned at the same interpolated
  x/y as the polyline tip, not the final end-of-season point.
- **Hover tooltip is suppressed while `isAnimating`** (dots are in motion; hover would be chaotic).
- CSS transitions on opacity/stroke-width are also suppressed while animating (`transition: none`)
  to avoid fighting the RAF loop.

### `RankHistoryChart` signature update

```
RankHistoryChart({ scopeTeams, playDay, minimal? })
```

`playDay: number | null` is new. `minimal?: boolean` is also new (see §2 below).

- When `playDay` is `null`, renders all days (existing static behaviour).
- When `playDay` is a float, clips each polyline to that day and adds the interpolated tip point.

### Date range: Opening Day → today

`RH_DAYS` (the day array) now ends at **`new Date()` (today)** rather than a hardcoded Jul 4 date.
The start date remains hardcoded as 2026-03-26 (Opening Day). Both `RH_WEEKS` and `RH_WEEK_LABELS`
are derived from `RH_DAYS`; the subtitle in `RankHistoryCard` (`"Cumulative wins · Mar 26–{today}"`)
updates accordingly. When wiring real data, replace the hardcoded start date with the real Opening
Day from the API.

---

## 2 — Division card flip

### What it is

Each division card in the Divisional view now has a small **chart icon button** in its header band
(to the left of the AL/NL tag). Clicking it triggers a **CSS 3D flip** of the card:

- **Front face** — the existing standings table (unchanged).
- **Back face** — a compact animated wins-over-time chart scoped to that division's 5 teams, with
  a `←` button to flip back.

### Flip animation

CSS `transform: rotateY(180deg)` on the card container with `transform-style: preserve-3d` and
`backface-visibility: hidden` on both faces. Duration: **0.5s**, `cubic-bezier(0.4, 0.2, 0.2, 1)`.
Both faces are the same size — the back is `position: absolute; inset: 0` so it exactly matches
the front's height. `overflow: hidden` on the back face clips any chart overflow.

### Auto-play timing

After the flip is triggered, a **1 000 ms timeout** fires before playback starts (≈ 0.5s flip
completes + 0.5s pause so the user can register the back face before it animates). Flipping back
immediately cancels the timer and resets `playDay` to null, so the chart is clear next time.

### Back face layout

```
┌────────────────────────────────────┐
│ AL East                    ↺   ←  │  ← navy header strip (same T.info as front)
├────────────────────────────────────┤
│                                    │
│   [mini RankHistoryChart]          │  ← fills remaining height
│                                    │
└────────────────────────────────────┘
```

- Header height matches the front's title row (~40px). No column-label row.
- Two buttons grouped on the right: **↺ Replay** (restarts the animation from day 0) and **← Back**
  (flips the card back to the standings table). Same glass style as the flip trigger on the front.
- Pressing ↺ while the animation is already playing stops it instantly and restarts from day 0.
  There is no delay before replay — it starts within one frame (~16ms).

### Mini chart (`minimal` mode)

`RankHistoryChart` accepts a `minimal` boolean prop. When `true`:

- **Y tick labels suppressed** — gridlines are kept (they help read relative positions) but the
  numeric labels on the left are hidden.
- **X date labels suppressed** — the date labels below the chart are hidden.
- **Gridlines extend only to the right edge of the plot** (no extra overhang), since there is no
  Y label space to accommodate.
- Logo dot sizes scale by scope: `n ≤ 5` → 26px, `n ≤ 12` → 22px, `n ≤ 15` → 20px, `n > 15` → 18px.
  The mini chart always has 5 teams (one division), so it always uses **26px** dots.
  **Same sizes in both static and animated states** (no smaller dots during playback).

The mini chart inherits the same `playDay` animation mechanics described in §1. Logo dots follow
the live tip at full size during playback.

### `HeaderBand` update

`HeaderBand` gains an optional `action?: React.ReactNode` slot rendered between the title and the
tag in the title row. The division card passes the chart-icon flip trigger here. `WildCardCard`
passes nothing and is unchanged.

---

## Component map (additions / changes)

| Component | Change |
|---|---|
| `HeaderBand` | `action?` slot added (right of title, left of tag) |
| `DivisionCard` | Now stateful (`flipped`); wraps in flip shell; passes `action` to `HeaderBand` |
| `DivisionMiniChart` | **New** — back face: plays mini chart on flip; auto-starts after 1 000ms |
| `RankHistoryChart` | `playDay` + `minimal` props added; interpolated tip; hover suppressed while animating |
| `RankHistoryCard` | Play/pause/replay button added; `isPlaying` + `playDay` state; RAF loop |
| `buildDays()` | End date changed from hardcoded to `new Date()` |

---

## Tokens / rules

- Flip trigger button: `rgba(255,255,255,0.12)` background on the navy band, border
  `rgba(255,255,255,0.22)`, icon color `rgba(255,255,255,0.75)`. Hover: slightly brighter.
- Back face header: same navy (`T.info`) as the front header band. Back button same glass style as
  the flip trigger.
- Play button (in `RankHistoryCard`): matches the scope `<select>` height and border radius. Active
  (playing) state uses `T.info` background with white text.
- No transitions on chart elements while `isAnimating` — suppressing them prevents jitter when the
  RAF loop is setting state every frame.

---

## Acceptance

### Rank History tab — playback
- ▶ / ⏸ / ↺ button appears left of the scope select; all three states are reachable.
- Pressing ▶ resets to day 0 and all lines grow from the left.
- Line tips move smoothly (no per-day jumps); logo dots track the tips.
- At the end, playback stops and the button shows ↺.
- Changing scope while playing or after finishing resets to static (all lines visible, button shows ▶).
- Hover tooltip does not appear while playing.

### Rank History tab — date range
- Subtitle and X-axis end at today's date, not Jul 4. Verify by checking `RH_DAY_LABELS` last entry.

### Division card flip
- Every division card in the Divisional view shows the chart-icon button in its header band.
- Clicking it triggers the card flip; the front face disappears and the back face reveals over ~0.5s.
- After ~0.5s pause, the 5 division lines animate from zero wins.
- The back face header shows the division name and a `←` back button.
- Back face shows two buttons: **↺** (replay) and **←** (back), right-aligned in the header.
- ↺ restarts the animation from day 0 immediately, even if already playing.
- Clicking `←` flips back to the standings table; the chart resets (next flip starts fresh).
- No axis labels on the mini chart; gridlines visible.
- Logo dots are full-size (26px for a 5-team division) throughout playback and at rest.
- Wild Card view is unaffected — no flip button, no chart.
