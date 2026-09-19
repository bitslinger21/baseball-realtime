# Handoff — Bases: hover to name the runners

Written Sep 18, 2026. **Ungated, no new API.** One shared atom, two call sites.

## Contents

- `PROMPT_bases_runner_hover.md` — the spec. Read this first; it is the whole job.
- `shared.jsx` — the `Bases` atom with the change (the file of record for the port).
- `game-v2.jsx` — live game view call site (play-state eyebrow).
- `game-scout.jsx` — Scout call site + `basesAt()` carrying runner ids instead of booleans.
- `foundations.jsx` — the swatch, now labelled "Bases · hover".

Design files are copies of `holistic/` as of Sep 18, 2026.

## One-line summary

The half-diamond says *that* someone is on base but never *who*; an optional
`runners` prop adds a hover card that names them. Absent the prop, nothing changes.

## Flags for the dev

1. **Do not split the hover into three per-base targets.** At 26px each base is ~5.6px.
   One target, one card listing every occupied base. See PROMPT §3.
2. **Keep the padded hit area** (`inset:-6`). Without it the pointer falls through the
   gaps between the base squares and the card flickers.
3. **Scout must reconstruct *who*, not just *whether*.** The design changed `basesAt()`
   from booleans to runner ids for exactly this reason.
4. **Mock names are not for port** — `['S. Suzuki','I. Happ', null]` in `game-v2.jsx`
   stands in for the live play's runner list.
5. **Hover-only = desktop-only.** On touch, leave the atom as it is today rather than
   shipping a half-working tap.
