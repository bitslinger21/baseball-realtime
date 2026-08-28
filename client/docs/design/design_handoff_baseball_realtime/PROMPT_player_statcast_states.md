# PROMPT — Player view: Statcast batter metrics + Today-widget empty states

Two independent changes on `/player/:mlbId`. Both close open items from the Aug 27 player-view sync.

---

## Part A — Wire the eight batter-level Statcast rows (Stats tab)

**Today.** The Stats tab renders these eight rows as `—` with "Statcast, not available":

| Card | Rows |
|---|---|
| Plate discipline | Chase %, Whiff %, Contact %, Swing % |
| Contact quality · Statcast | Exit Velocity (avg), Exit Velocity (max), Hard Hit %, Barrel %, Launch Angle |

**Why they're empty.** The Jul 19 Statcast ingest (`PROMPT_statcast_ingest.md`) landed *pitch-level* rows and rolled them up **by pitch type** for the Pitching tab. It never produced **player-season aggregates**. Same ingested table, a different groupby — this is not a new data source.

**Do.** Add a player-season rollup off the existing Statcast rows and expose it on the player endpoint.

```ts
interface BatterStatcast {
  // plate discipline — per-pitch flags, season totals
  chasePct: number | null;    // swings at pitches outside zone / pitches outside zone
  whiffPct: number | null;    // swings that miss / total swings
  contactPct: number | null;  // 100 - whiffPct
  swingPct: number | null;    // swings / pitches seen
  // contact quality — per-batted-ball, season
  exitVeloAvg: number | null; // mph, 1dp
  exitVeloMax: number | null; // mph, 1dp
  hardHitPct: number | null;  // batted balls >= 95 mph / batted balls
  barrelPct: number | null;   // barrels / batted balls
  launchAngleAvg: number | null; // degrees, 1dp
  battedBalls: number;        // denominator, for the sample-size gate
  pitchesSeen: number;        // denominator for the discipline four
}
```

Each row also needs a **league average** for the Δ and percentile columns — the design shows `lg`, `delta`, `deltaTone`, and a percentile bar per row. Compute league averages from the same ingested set (all batters, season) rather than hardcoding.

**Sample-size gate.** Keep a row `null` (rendering `—`) rather than showing a noisy number when the denominator is thin. Suggested floors: discipline rows need `pitchesSeen >= 100`; contact-quality rows need `battedBalls >= 25`. A `null` row must still render its label and the existing not-available note — do not hide the row.

**Percentile.** Rank against the same-season batter population, gated on the same floors. If a percentile can't be computed, render the value and Δ but leave the bar empty rather than drawing a bar at 0.

**Ordering note.** `Whiff %` already exists per-pitch-type on the Pitching tab, so the player-level number is derivable from data already shipped. If Part A has to be split, the discipline four are the cheap half — do them first.

**Acceptance.** For a batter with a full season, all eight rows show mono values, a league average, a signed Δ with the right tone, and a percentile bar. For a September call-up with 40 pitches seen, rows stay `—` with the note. No hardcoded league constants.

---

## Part B — Today widget + Watch live: off-day state

**Today.** The app shows "No game today" and a disabled **Watch live**, but the design never specified either, so the current treatment is dev's own. Now specified.

Design reference: **`Player Hero — Today states.html`** (side by side). Design source: `holistic/player.jsx`, gated on `todayState` / `hasGameToday`.

**Both states keep the same footprint** — the 220px widget box and the button both stay in place. The hero grid must not reflow between a game day and an off day.

### Today widget, no game

- Same `width: 220`, same `padding: '14px 16px'`, same `borderRadius: T.r.md`, and a shared
  `minHeight: 107` on **both** states so the two boxes measure identically and the button row below
  can't shift by a pixel between them
- `background: transparent`, `border: 1px dashed T.borderStrong`
- No hover handlers, no `cursor: pointer`, not clickable
- Header row: eyebrow reads just **"Today"** (no opponent); right side is **"OFF DAY"** at 11px / 600 / `T.textFaint` — **not** a `LivePill`
- Body: **"No game today"** at 13px / 600 / `T.textMuted`
- Below it, the last game so the space still carries information:
  `Last played <mono>Aug 26</mono> at CHC · <mono>2-for-4</mono>` at 11px / `T.textFaint`,
  `lineHeight 1.45`. Date and line are **mono**; the prose is sans. Both mono spans need
  `whiteSpace: 'nowrap'` — without it the browser breaks `2-for-4` at its hyphens and the box-score
  numeral splits across two lines. Let the sans prose take the wrap instead.
  - If no prior game exists this season (season not started), drop this line entirely rather than printing a placeholder.

### Watch live, disabled

- `color: T.textFaint`, `borderColor: T.border`, `background: transparent`, `cursor: not-allowed`
- Real `disabled` attribute (not just styling) so keyboard/AT skip it
- `title="No game today"` so the reason is legible
- **Compare stays enabled** — it never depended on a game.

**Season-over case** uses the same state; only the "Last played" line differs (it will point at the final game).

**Acceptance.** On an off-day player page the hero is the same height and column widths as on a game day; the widget is visibly inert (dashed, flat, no hover); Watch live is dimmed, `disabled`, and tooltipped; Compare still opens. Numerals mono throughout.

---

## Out of scope

The Overview **hot-zone parked strip** ("Collecting data…" / "Limited pitch data (N pitches)" / "Location data coming with pitch-level stats") stays as the app has it — reviewed and accepted, no design change.
