# PORT 2 of 3 — app-wide consistency pass

**Version:** rev 1 · Sep 10, 2026
**Order: run AFTER the audit (`PROMPT_verify_state.md`), BEFORE `PROMPT_team_page.md`.**
The team-page prompt uses the shared chip, row rule and link convention built here.

**Ungated.** No new API, no new endpoint, no new data. Every change is presentational.

---

## What this is

The Sep 10 audit found that four things this app treats as "shared" are not shared at
all. Most consequential: **ten different win/loss treatments**, no component, no loss
token. This prompt consolidates them. It also fixes the smaller drifts the audit turned
up in rows, tables and links.

Read the audit report first — it has the file+line citations for everything below and
they are not repeated here.

**Where the audit found the app is ahead of the design, the app wins.** Those are called
out inline. Do not regress them.

---

## 1. Win/loss — one token pair, one component

### 1a. Split the token first — this is a prerequisite, not a step

`--color-positive` / `--color-positive-soft` currently back **both** the win chip and the
general "good thing happened" wash: trend arrows, stat deltas, the scored-run trace in
`ScorebookCell`, and the "N runs score" chip in `PitchByPitchV2`.

**If you change the win colour before splitting these, those four unrelated surfaces turn
saturated green.** A win chip and a "2 runs score" chip are not the same idea and must
stop sharing a variable.

Add to `tokens.css`:

```css
/* general positive/negative wash — unchanged behaviour, keep every current consumer */
--color-positive:      #3a6330;
--color-positive-soft: #e6efd9;
--color-negative:      #8a2721;   /* NEW — no loss token existed */
--color-negative-soft: #f4dedb;   /* NEW */

/* the win/loss RESULT CHIP only. Deliberately separate from the wash above. */
--color-win-chip-bg:   #cce7a4;
--color-win-chip-fg:   #3a6330;
--color-loss-chip-bg:  #f4bdb5;
--color-loss-chip-fg:  #8a2721;
```

Then repoint the four wash consumers at `--color-positive*` explicitly so a later chip
change cannot reach them.

### 1b. Build one `ResultChip`

Pale tinted background · coloured letter · 1px border in the letter colour at 20% opacity
(`#3a633033` / `#8a272133`) · 11px, weight 700.

This is the Player → History pill, chosen because it was already the best of the ten and
already in the app. Two shape variants, same colours:

- **pill** (default) — schedule result cell, player last-5, player history
- **circle** — team page Recent form, where the chips sit above a chart and must line up

Replace all ten treatments. Specifically:

| # | Surface | Change |
|---|---|---|
| 1 | Team page Recent form | filled square → `ResultChip` circle |
| 2 | Team page hero Streak | grey loss → `--color-negative`; win → `--color-positive` |
| 3 | Team page Today-card score | leave the dim; it isn't a W/L chip |
| 4 | **Standings Streak column** | **currently no colour distinction at all** — W green, L red |
| 5 | Player last-5 pill | drop the borrowed `live` tone → `ResultChip` |
| 6 | Player history pill | → `ResultChip` (this is the reference design; colours shift slightly) |
| 7 | Schedule result chip | filled square + literals → `ResultChip` pill |
| 8 | Schedule decision cell | leave uncoloured — "W: Blanco" is a credit, not a result |
| 9 | Pregame "Coming in" streak | `#86efac`/`#fca5a5` are from no palette in this app → tokens |
| 10 | **Daily-games Final card** | **renders no "L" at all**, just dims the loser → add the chip |

**#4 and #10 are correctness bugs, not inconsistencies.** A streak column that doesn't
say whether the streak is wins or losses, and a final score with no loser marking, both
fail to communicate the one thing they exist for. Do these even if the rest slips.

**Add a `loss` tone to `Pill`** so nothing has to borrow `live` again. Losses wearing the
LIVE badge's red is the exact collision this pass exists to remove: red means *live* in
this app, everywhere else.

## 2. Clickable rows

**The rule:** exactly one destination in a row → the whole row is the link and the whole
row shades on hover. Two or more distinct destinations → individual names are links, the
row does not shade.

**Use real anchors.** The audit confirmed every existing whole-row target is a
`react-router-dom` `Link`, never a click handler on a `div`. **The design mocks use click
handlers; they are wrong and the app is right.** Keep the anchors — they are focusable,
keyboard-activatable and middle-clickable for free.

Fix, per the audit's table:

- **League leaders rows** — name-only click, no row hover. One destination → whole row.
- **Team leaders card rows** — same. → whole row.
- **Team roster rows** — the row shades but only the name is clickable. Hover is writing
  a cheque the row doesn't cash. → whole row.
- **Team schedule rows** — same mismatch, trailing link only. → whole row. (The duplicate
  trailing link column is removed by prompt 3.)
- **Team "Next up" rows** — no click target at all, though each row is one game.
  **Cheapest real fix in the audit.** → whole row, to that game.
- **Team mini-standings "my team" row** — resting tint and hover tint are the *same hex*,
  so hovering your own team does nothing. Rest `rgba(184,66,30,.055)`, hover
  `rgba(184,66,30,.11)`.
- **League leaders category-leader rows** — tinted, and no hover rule exists. Same
  treatment as above. A highlighted row is the *most* clicked row in its group; it must
  respond.

One hover shade app-wide: `--color-surface-alt` `#efeae0`. The schedule's live-row
`#f6e7e0` is a legitimate exception — it's tinting a status, and it correctly has its own
distinct hover.

**Not in scope:** extracting a shared clickable-row primitive. Worth doing, but it touches
five files with different row shapes and this pass is already wide. Apply the rule per
file and leave a comment naming it.

## 3. Tables

- **`Table.tsx` header is 10px** — below the project's own 11px floor for word labels, and
  it propagates to every consumer. → 11px. Fix this first; it's upstream.
- **Also below the floor:** the standings wild-card divider (10px), team-page LIVE/date tag
  (10.5px), schedule division-group header (9.5px), schedule LIVE badge (10px). Decorative
  team-initial badges at 8–9px are fine — they aren't words.
- **Header fills** — League Leaders (white on navy) and Schedule (surface-alt) are the only
  two filled header bands; everything else is hairline-only. Settled treatment is
  **hairline, no fill**. Remove both.
- **Body text 13.5 vs 13** — Standings, Leaders, Teams directory and Schedule use 13.5px;
  the shared primitive and all four team-page tables use 13px. Settle on **13px**.

## 4. Teams directory spacing

On the Teams page, the six division blocks sit 26px apart vertically, which reads as one
continuous list rather than six groups. **75px between blocks**; the 30px column gap is
unchanged. `holistic/teams.jsx` in `design-files/` carries the value.

## 5. Links

Three conventions coexist. Settle on **rust at rest `#b8421e`, darker rust on hover
`#8f3317`** for in-context action links.

- Add the hover value — the audit found it doesn't exist anywhere yet, in correct or
  near-miss form. There *is* a commented-out global `a:hover` in `index.css` set to a
  leftover Vite purple; delete it rather than reviving it.
- **The muted-at-rest-then-rust-on-hover convention (5 files) loses.** An action link
  should look like one before you point at it.
- **Team page's own "Enter game →" is the single outlier** — ink at rest, while the other
  four "Enter game" instances in the app are already rust. Fix it. (Explicitly confirmed
  by the design owner: **rust is correct for "Enter game".**)
- `.player-link`'s inherit-plus-dotted-underline is fine *inside dense table rows* where
  every row would otherwise be rust. Keep it, but only there, and note it as deliberate.

## 6. Acceptance

- Grep for `#b4ae9b`, `#fdecec`, `#a31621`, `#86efac`, `#fca5a5` in a win/loss context →
  zero hits.
- The "N runs score" feed chip and the scorebook scored-diamond are **visually unchanged**
  from before this pass. If either went green, 1a was skipped.
- Standings streak column shows W and L in different colours.
- The daily-games final card marks the loser with an L chip.
- Every row with one destination: pointer, shade, keyboard-focusable, Enter opens it.
- No table header below 11px; no table header band filled; all table body text 13px.
- Tab through a leaders card and a roster card — focus ring visible on each row.
- Teams page division blocks 75px apart.
