# Bases atom — hover to name the runners

**Status:** design signed off Sep 18, 2026. **Ungated** — no new API.
**Scope:** one shared atom + two call sites. Small, self-contained.

---

## 1. What changes

The half-diamond base indicator (solid = occupied, outline = empty) currently says
*that* someone is on, never *who*. Add an optional hover reveal that names them.

`Bases` gains ONE optional prop:

```
runners?: (string | null)[]   // [first, second, third] — runner display names
```

- Prop absent → the atom renders and behaves **exactly as today**. No visual change,
  no cursor change, no listeners attached. Every existing call site is untouched.
- Prop present → hovering the diamond reveals a small card naming each occupied base.

## 2. The hover card

- Anchored **below** the diamond, horizontally centred (`top:100%`, `translateX(-50%)`,
  `marginTop: 8`).
- `T.surface` ground, `1px solid T.borderStrong`, `T.sh.md`, padding `8px 11px`,
  `whiteSpace: nowrap`, `zIndex: 40`, `pointerEvents: 'none'`.
- One row per **occupied** base, in 1st → 2nd → 3rd order. Empty bases are omitted —
  the card answers "who is on", it is not a three-row table with blanks.
- Row = base label + name: label `T.mono` 11px/700 `T.textMuted`, fixed `width: 22`
  so the names align; name `T.sans` 13px/600 `T.text`. Rows `gap: 4`.
- If no base is occupied (or `runners` supplies no names), **no listeners, no card** —
  there is nothing to say.

## 3. Two decisions worth not re-litigating

**One hover target for the whole diamond, not three per-base targets.** At the size
this atom actually ships — 26px in the play-state eyebrow — each base is about 5.6px
across, which is not a pointer target. One card listing every occupied base is also
the question users actually ask ("who's on?"), not "who is on second specifically?".

**The hit area is padded past the diamond** (`position:absolute; inset:-6`, inside the
relative wrapper). The three bases are separated squares with gaps between them; without
the pad the pointer falls through the middle and the card flickers.

## 4. Data

The play feed already carries the runners — no new endpoint, no new field request.
Map the play's runner list into the three slots by the base they currently occupy and
pass names straight through. Names use the same short form as the rest of the game view
(`S. Suzuki`), not full first names.

**Scout mode:** the design's `basesAt()` was changed from holding booleans to holding
the runner's id in each slot (occupancy becomes `Boolean(slot)`), so hover names stay
correct at every marker position rather than only at live. Do the equivalent wherever
the app derives base state for a replay marker — if base state is reconstructed rather
than read from the play, it must reconstruct *who*, not just *whether*.

Call sites in the design:

| File | Call site |
|---|---|
| `holistic/game-v2.jsx` | play-state eyebrow, live game view (mock names) |
| `holistic/game-scout.jsx` | play-state eyebrow, Scout mode (`bases.map(Boolean)` + names from `BATTERS`) |
| `holistic/foundations.jsx` | swatch, labelled "Bases · hover" |

Mock names in `game-v2.jsx` (`['S. Suzuki','I. Happ', null]`) are **not for port** —
that call site should read the live play.

## 5. Acceptance

1. A `Bases` with no `runners` prop is pixel-identical to today and attaches no handlers.
2. Hovering a diamond with runners shows the card below it within one frame; leaving hides it.
3. Only occupied bases appear, in 1st/2nd/3rd order, labels aligned in a mono column.
4. Moving the pointer across the gaps *between* the base squares does not dismiss the card.
5. The card overlays whatever is beneath it and never changes the eyebrow's height.
6. In Scout, stepping the marker changes the names, not just the filled/empty states.

## 6. Not designed

**Hover-only, so desktop-only.** Touch needs a tap-to-reveal (and a dismiss) — not
designed here; on touch the atom should simply stay as it is today rather than
half-working. Also not designed: keyboard/focus access to the card, and any runner
detail beyond the name (speed, SB threat, pinch-run status).
