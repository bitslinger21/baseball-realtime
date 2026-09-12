# Handoff — Bullpen status &amp; Injuries cards

**Cut Sep 12, 2026.** Frozen delivery. Nothing in this folder should be edited; if the
design changes, a new dated folder supersedes it.

## Contents

| File | What |
|---|---|
| `PROMPT_bullpen_injuries.md` | The port prompt. Read §2 (availability rule) and §3 (missing data) before building. |
| `Team Page - Overview v2.html` | The full team page, snapshot. Both cards are the bottom two in the right-hand column. |
| `Team Page - Bullpen and Injuries states.html` | Four edge states: bullpen all-available, bullpen worked over, injuries empty, injuries with unknown returns. |

## Port order

1. `handoff_2026-09-10_consistency/` — introduces the win/loss chip colours both cards use.
2. This folder and `handoff_2026-09-11_season_pulse/` are independent of each other.

Unlike Season pulse, **neither card here is gated on a new computed dataset.** Bullpen status
is derivable from the existing play-by-play feed today. Injuries needs one new endpoint (MLB
transactions) and nothing else.

## What this closes

The last two placeholder cards on the team Overview page. With these ported, the page has no
`.card.ph` placeholders left, and `Team Page - Cards pending data.html` in the design
workspace becomes historical reference only.

## Two decisions recorded, in case they are questioned

- **Bullpen is a per-pitcher list, not four aggregate counts.** The counts were the original
  placeholder and were rejected: the name is what a reader acts on. Costs height; the stacked
  right column has it.
- **Roster moves left the card.** The title is now `Injuries` alone, and call-ups/options/DFAs
  live behind `All transactions →`. Churn was burying the players actually hurt.

## Not for port

All names, dates, pitch counts and return estimates are fabricated. The roster is approximate
and the injury list is invented.
