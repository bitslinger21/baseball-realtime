# BUG-019 — "Runs score" pill attached to the wrong at-bat (off-by-one)

## Problem
In the game-view pitch-by-pitch feed, the green "N run(s) score · [resulting score]" pill is
showing up on the PA AFTER the one that actually drove in the run(s) — not on the scoring PA
itself.

Confirmed with two examples from the live app:
- Christian Walker hits a solo HR — no pill. The NEXT PA (Isaac Paredes' HR) carries "1 run
  scores · TEX 0–6 HOU" — that's actually Walker's run.
- Paredes' HR — no pill. The FOLLOWING PA (Austin Wynns, an OUT, on the OPPOSING team, in a
  half-inning where his team scored zero runs) carries "1 run scores · TEX 0–5 HOU" — that's
  actually Paredes' run.

The Wynns case rules out a team-side mixup — it's a pure list-position offset of one.

## Design is correct — this is a data-mapping bug
The design's data model attaches `scored: { runs, score }` directly on the PA object that
itself produced the run (see `holistic/game-v2.jsx`'s `PAs` mock — e.g. Isaac Paredes' own
grand-slam entry carries `scored: { runs: 4, ... }` on ITS OWN row, not the next one). There is
no shared/adjacent-index relationship in the design.

## Fix
Find wherever the port pairs the scoring-play/run-event stream with the rendered PA list —
likely paired by adjacent array index or arrival order instead of matching the play/event ID
that actually produced the run. Match each scoring event to its OWN originating PA by ID.

## Scope
No design change. Pill placement, copy, and styling (`positiveSoft`/`positive` green, "N
run(s) score · [score]") are correct and unchanged — only which PA row it's attached to needs
fixing.
