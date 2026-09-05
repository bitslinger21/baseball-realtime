# PROMPT: Runner Trace

Build **Runner Trace** — click a baserunner in the scorebook and follow that runner's whole journey
through the inning. It is an extension of the scorebook, not a separate screen and not an analytics
dashboard.

Reference: `Runner Trace Mock.html` (static; shows the panel and the scorebook highlight states side
by side). Source spec: the uploaded `RUNNER-TRACE-HANDOFF.md`.

> **This prompt supersedes the earlier `PROMPT_runner_trace.md`**, which listed pre-contrast-pass
> token values, omitted the scorebook highlighting model entirely, and offered an out-of-scope
> "View Full Inning Trace" footer. Details under *Corrections* at the end.

---

## 1. What launches it

**The base-path notation inside an at-bat cell.** Not the cell at large, and **never the player's
name.**

A trace belongs to a **specific baserunner instance** — one runner, created by one plate appearance,
in one inning. A player who reaches base three times in a game has three separate traces. In the
mock, Altuve's 6th-inning single and his 8th-inning single are unrelated instances; selecting the
6th must leave the 8th untouched.

Clicking a different runner switches the active trace. `Esc` and the ✕ close it.

---

## 2. Scorecard highlighting — the part that makes it work

This keeps the panel connected to the scorecard, and it is the piece most likely to get dropped.
Runner Trace renders on the **real `scorebook-cell.js` cell** — the field diagram with the boundary
arc, dashed mound, infield diamond and base dots. Do not build a text-code cell for this.

**The scorecard's lines are ALWAYS ink.** No colour of any kind enters the scorecard — the colour
sequence in §3 belongs to the panel alone. This keeps the trace layer purely additive: it only ever
draws, never recolours. `scorebook-cell.js` is shared with the print sheet (`Scorebook Page.html`), so
anything that modified the cell's own marks would change the printed scorecard too.

**The cell already draws base paths.** `buildScorebookGrid` draws a home → reached-base line for any
reached-base code, with the result label along that base's foul line. Runner Trace extends the same
language — which is what a scorer does on paper, tracking each runner's advance on the same cell.

When a trace is active the scorecard shows three states:

| State | Which cells | Treatment |
|---|---|---|
| **Origin** | the PA that put the runner on base | unchanged ink notation; `outline: 2px solid` ink, `outline-offset: -2px` |
| **Movement** | every later PA that moved this runner | batter's own ink result stays; the traced runner's advance is drawn as an additional **ink** polyline at `stroke-width: 2.4` (slightly heavier, so it reads as a second runner's movement) with a filled `r=3` dot at the destination; same ink outline |
| **Unrelated** | everything else | `opacity: 0.32` |

Rules:

- **No `1B→3B` text notation on the cell.** The drawn path says it. Text notation was in an earlier
  draft against a text-code mock; it is redundant on the field diagram and clutters a 112px cell.
- The movement polyline runs the **real route**: `1B → 3B` passes through 2B, so it is drawn
  `1B → 2B → 3B`, base to base. Never a straight diagonal between non-adjacent bases.
- **Keeping the batter's own result intact is the point of the movement state.** The cell then answers
  both questions at once — what this batter did, and what it did for the runner being traced.
- De-emphasis is **dimming, not hiding**. Unrelated cells stay readable at 32%; a user must be able
  to keep reading the scorecard with a trace open.
- **Derive movements from the play-by-play, not from the batter result display.** A plate appearance
  moves runners who are not the batter. Alvarez's cell reads `1B` as *his* result; in Altuve's trace
  that same PA also carries a `1B → 3B` advance. The same cell renders differently depending on whose
  trace is open. Deriving from the batter's own result silently produces a trace that misses every
  advancement.

**Geometry — use the constants already in `scorebook-cell.js`, do not re-derive:**

```js
HOME = [50, 90]
1B = [79.7, 56.06] · 2B = [50, 26.36] · 3B = [20.3, 56.06]   // field viewBox 0 0 100 100
```

Wrap every added path in the cell's existing `clipPath` pattern. The scorecard sits inside a 3D
transform context (the flip/pan-zoom wrapper), which defeats plain `overflow: hidden` clipping in
some engines — `buildScorebookGrid` already handles this and the comment there explains why.

**Extending the module.** Add an optional `trace` field to the per-cell data that
`buildScorebookGrid` already takes, defaulted off, so an absent value renders exactly today's cell.
Do not change existing parameters or drawing behaviour — the print sheet consumes the same builder.

Worked example (the mock): Altuve singles in the 6th → Alvarez singles, Altuve 1B → 3B → Diaz
sacrifice fly, Altuve scores. Three outlined cells in one column, all ink.

---

## 3. Panel

350px, **slides in from the RIGHT and overlays the content** (`translateX(350px)` → `0`, 300ms
ease-out), with a left-edge shadow so it reads as elevated above the scorecard.

### Colour sequence — panel only

**Colour appears in the panel and nowhere else.** Within the panel, each play's colour is shared by
its **badge circles** and its **diamond segment**, so a row and its leg of the journey read as one
thing. Fixed order, always:

| Play | Colour | Value |
|---|---|---|
| Batter's own on-base line (H → 1B) | **ink** | `#15161a` |
| 1st advancement | **red** | `#b8421e` |
| 2nd advancement | **green** | `#3f6b34` |
| 3rd advancement | **blue** | `#2c4a78` |

The order is positional, not semantic — red does not mean "hot" and green does not mean "scored". A
runner who is stranded at second still gets ink then red. With more legs than the table covers, cycle
back through red, green, blue.

Each base marker and label on the diamond takes the colour of the play that **reached** it, so the
diamond reads as a sequence of legs rather than one continuous path.

A trace that ends **stranded** or **out** stops its final leg at the last base reached. The result
badge in the player block still uses green for `SCORED` / muted for `STRANDED` and `OUT` — that badge
is semantic and independent of the positional leg colours above.

- **Header bar** — `RUNNER TRACE` label, ✕ at the right
- **Player block** — headshot (through the shared `Headshot` atom, portrait ratio, never a 1:1
  square), name 18px bold, inning (`6th Inning`), result badge: `SCORED` green `#3f6b34` /
  `STRANDED` muted / `OUT` — uppercase, 11px, letterspaced
- **Journey timeline** — one row per play, vertical connector between rows. Each row:
  - base badges showing the move (`1B` → `3B`), **all 26px — one uniform size**, circles stroked
    2px in that play's colour, mono label inside
  - play description, 13px, ink: `Advanced on Alvarez single`
  - detail line, 12px muted: `Single to right field, 2 outs`
  - Emphasis stays on **the runner's movement**, not on the batter who caused it. Lead with the
    bases, not the name. Descriptions and details stay ink/muted — only the badge circles carry
    colour, so rows don't become a rainbow of text.
- **Diamond**, 128×124 — the runner's route, **each leg in its play's colour** (3px), path
  terminating mid-diamond when stranded or out. Use the scorecard's existing field language.
  Explanatory, not decorative — do not add grass, dirt, or texture. Works without animation.
  - **Orientation is fixed: home at the BOTTOM, 1B right, 2B top, 3B left.** Bases are squares
    sitting ON the field's corners; home is a plate pentagon. Labels go outside the field, never on
    the markers, and take the colour of the play that reached them.
  - Draw the path the runner **physically ran**. A runner going 1B → 3B passes through 2B, so that
    segment is part of his route — for a runner who scored the path is the full perimeter, which is
    exactly the right read ("all the way around"). Do not draw a straight 1B→3B shortcut.

- **Timeline row structure:** a **64px** badge gutter (holds a `1B → 3B` pair without touching the
  description), badge groups **left-aligned** so every row's "from" badge sits in one vertical column,
  and the connector running down that column's centre (`left: 12px`). Description and detail in the
  content column beside it. Do not centre the groups in the gutter — a lone origin badge then sits
  off-axis from the pairs below it. Badge-above-copy puts the connector through the text.
- Numerals are mono with `tabular-nums`. Labels and prose are DM Sans.

---

## 4. Interaction

| Action | Result |
|---|---|
| Hover a timeline row | highlight the corresponding scorecard cell |
| Click a timeline row | select that scorecard cell |
| Hover a highlighted cell | emphasize the corresponding timeline row (reverse binding) |
| Click another runner | switch the active trace |
| `Esc` / ✕ | close |

The reverse binding is easy to skip and load-bearing — it is what makes the two halves feel like one
object rather than a list beside a table.

---

## 5. Game-view integration

**Decided: the panel slides in from the RIGHT and overlays the content. It does not displace or
re-fit anything.**

Runner Trace lives in the game view's **scorecard mode**, which animates the hero grid to
`280px 1fr` and slides the scorecard up over the content region. The game view is the declared 1600
exception — 1544 of content.

The panel enters from the right edge at 350px, elevated over whatever is beneath it, with a
left-edge shadow. The scorecard keeps its full width and its pan/zoom; the hero grid does not
re-flow; the 280px sidebar is not collapsed. Nothing under the panel is resized.

**The consequence to handle: the panel covers the right ~350px of the scorecard, and the cells it is
describing may be underneath it.** So opening a trace must scroll the scorecard so that all of the
trace's highlighted cells sit clear of the panel, in the region to its left. This is not optional
polish — a trace whose cells are hidden behind its own panel is the failure case for the entire
feature. `Runner Trace Mock.html` shows the scrolled-clear state.

Corollaries:

- Scroll to clear **every** highlighted cell, not just the origin. A trace can span several innings.
- If the highlighted cells cannot all fit in the remaining width, prioritise the origin and the
  final movement, and let the middle scroll.
- On close, do not scroll back — the user's position is theirs to keep.
- Below ~900px viewport width the panel takes the full width, and the scorecard is simply behind it.

**Note on the mock.** `Runner Trace Mock.html` renders the **real `scorebook-cell.js` cells** at
their real 112px width and geometry, three batting slots across innings 4–9, and it loads the shared
module rather than reimplementing it — so the cell design cannot drift from the locked one. What it
does *not* show is the rest of scorecard-mode chrome (no dark band, no transport, no `280px`
sidebar) or the full 9-slot lineup and pitching section. Take the surrounding layout from the shipped
scorecard mode; take the cell treatment, the colour system and the three states from the mock.

The mock also implements the auto-scroll: it measures the traced cells and right-aligns their span in
the region left of the panel on load and on resize. That code is a reasonable starting point.

---

## 6. Data

```typescript
interface RunnerTrace {
  runnerInstanceId: string;   // identifies THIS baserunner instance, not the player
  runner: { mlbId: string; name: string; headshotUrl: string | null;
            finalResult: 'scored' | 'stranded' | 'out' };
  inning: number;
  originPlayId: string;       // the PA that put him on
  events: AdvancementEvent[];
}

interface AdvancementEvent {
  sequence: number;
  fromBase: 0 | 1 | 2 | 3;    // 0 = at the plate
  toBase: 1 | 2 | 3 | 4;      // 4 = scored
  playId: string;             // the scorecard cell to highlight — the join key
  playDescription: string;    // "Advanced on Alvarez Single"
  playDetail: string;         // "Single to right field, 2 outs"
  causedByPlayerId: string;   // the batter, for attribution only
  outCount: number;
  scoreAfter?: string;        // optional, per spec
}
```

`playId` on each event is what binds panel rows to scorecard cells in both directions. Without a
stable play id the hover/click sync has nothing to match on.

Traces are derivable from the existing play-by-play feed — **no new API data.** Pre-compute per
inning.

---

## 7. Edge cases

- **Single-event trace** — reached and scored on the same play. Timeline is one row; diamond draws
  the direct path.
- **Stranded** — path stops at the last base reached; result badge muted, not green.
- **Erased on the bases** — path terminates at the base where he was retired, `OUT` badge.
- **Runner who never advances** — origin cell only, no movement cells. The panel must still be worth
  opening: show the origin and the result, not an empty timeline.
- **Missing headshot** — initials fallback (the `Headshot` atom already handles this).
- **No play detail** — description only, no empty second line.
- **Pinch runner / substitution mid-inning** — a pinch runner is a **new baserunner instance**
  inheriting the base. Undesigned; flag if the feed makes this reachable.

---

## 8. Out of scope

Per the spec's terminology section, only **Runner Trace** ships. **Run Trace** (how one run scored)
and **Inning Trace** (all movement in an inning) are named for consistency but not built — do not add
a "View Full Inning Trace" affordance. Also out: run-expectancy charts, replay animation of the
journey, and runner-vs-pitcher tendency comparisons.

---

## Corrections to the earlier prompt and mock

Both had drifted; the design files are now fixed.

1. **Stale tokens.** The old prompt and mock used `#e0dccd` for borders and `#75706a` for secondary
   text — both **pre-Jul-4-contrast-pass** values. Current: border `#cfc8b4`, textMuted `#5c574f`.
   The old values fail the AA pass that hardening was done for, and this is the same regression found
   live in `StandingsPage.css`. Corrected throughout.
2. **Scorebook highlighting was missing.** The old prompt specified only hover-sync — none of the
   persistent origin / movement / unrelated model in §2, which is the core of the feature. The mock
   had no de-emphasis at all; it now dims unrelated cells at `opacity: 0.4`.
3. **The mock highlighted the wrong cell.** Altuve's **8th**-inning at-bat was marked as part of his
   **6th**-inning trace — a different baserunner instance, and precisely the error §1 warns about.
   Removed.
4. **`Esc`, click-to-select, and the reverse binding** were all absent from the old prompt. Added.
5. **"View Full Inning Trace"** was offered as an optional footer while the spec scopes Inning Trace
   out of V1. Removed from the mock.
6. **Grid geometry.** The mock declared 10 inning columns for 9 innings at 40px each, too narrow for
   an advancement note — `1B→3B` overflowed its cell. Now 9 columns at 56px.
7. **Flex resolution.** Widening the grid raised the scorebook's min-content floor, and because
   `.panel` had no `flex-shrink: 0` it absorbed the whole shortfall — rendering at **210px instead of
   350px with the ✕ off-screen entirely.** Fixed: the panel is `flex-shrink: 0`, and the scorebook is
   `min-width: 0; overflow-x: auto` so the 9-inning grid **scrolls inside its own card** rather than
   forcing the row wider than the viewport. Worth carrying into the build: the scorecard, not the
   panel, is what gives up space.
8. **Timeline was single-column** — badges stacked above the copy, so the vertical connector ran
   straight through the text. Each row is now a two-column grid: a 58px badge gutter (wide enough for
   a `1B → 3B` pair, not just one badge) with the connector down its centre, and the description and
   detail in the content column.
9. **The diamond was drawn wrong.** Three of the four base markers floated *inside* the field instead
   of sitting on its corners; the top vertex was labelled `1B` and the right vertex `3B` (not a
   baseball diamond in any orientation); **2B was missing entirely**; labels sat on top of the
   markers; and the arrowhead was a 4-point sliver. Redrawn per §3 — fixed orientation, the full
   travelled base path, squares on the corners, a home plate, labels outside the field.
10. **The mock used the wrong cell entirely, and it changed the design.** It drew text-code cells
    (`1B`, `4-3`) in a plain grid under a `Scorebook` heading — a view that **does not exist in the
    app**. The live scorecard uses the locked `scorebook-cell.js` field-diagram cell (boundary arc,
    dashed mound, infield diamond, base dots, marker boxes, 112px). The mock now loads that shared
    module and renders real cells at real geometry.

    Not cosmetic: on a text cell the highlight had to be a border plus `1B→3B` notation. On the real
    cell **the base path is already drawn**, so the trace extends the existing notation — origin path
    recoloured, the runner's advance drawn over the batter's ink result — and the text notation is
    redundant. §2 was rewritten around this.
11. **The panel side flipped twice.** Right (original spec) → left (misread instruction) → **right**
    (confirmed). It is right, overlaying, per §5.
12. **Colour scope was wrong — corrected.** An intermediate draft pushed the per-play colours onto the
    **scorecard cells** (recolouring the origin's ink path, drawing advances in colour). That was a
    misreading. **Colour belongs to the panel only** — badge circles and diamond legs. The scorecard's
    lines are always ink. This also makes the trace layer purely additive, which matters because
    `scorebook-cell.js` is shared with the print sheet.
13. **Colour order is fixed and positional:** ink (batter's own on-base line) → red → green → blue.
    Earlier drafts had rust-origin and reserved green for scoring; both are superseded.
14. **Badge sizing and alignment.** Origin was 32px against 24px advancement badges and the groups were
    centred in the gutter, so the lone origin circle sat off-axis from the pairs below. All badges are
    now one 26px size, groups left-aligned, connector down the first badge's column.
