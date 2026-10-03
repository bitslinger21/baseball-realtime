# Revert: game scores keep the dash

**Rev 1 · Sep 30, 2026.** Copy/format only. Not gated, and no API change.

This withdraws the "one score format" rule (the old `PROMPT_score_format.md`, rev 1, now withdrawn). That rule put each team next to its own runs with no dash (`HOU 8 CHC 5`). **Game scores go back to the original form: `HOU 8 – 5 CHC`.** That is away team + runs, an en dash with a space on each side, then home runs + team.

If none of the old rule landed in your branch, there's nothing to do. Just confirm the acceptance checks below.

## Revert these
1. **Sticky line-score bar** (`LineScoreBand`, live, final and Scout):
   - `[logo] HOU 8   [logo] CHC 5` becomes `[logo] HOU 8 – 5 CHC [logo]`.
   - The home logo goes back to AFTER its abbreviation, so the score reads out from the dash.
   - Put back the dash between the runs (mono, dim `#b0b0b8`) and remove the extra 8px gap.
   - Leader white / trailer dim is unchanged.
2. **Pregame line-score band bar:** same layout as item 1, with empty run slots on each side of the dash.
3. **"Runs score" chip** in the at-bat list: `2 runs score · HOU 8 CHC 5` becomes `2 runs score · HOU 8 – 5 CHC`.
4. **Live strip above the on-top clip player:** `NYY 7 TOR 2` becomes `NYY 7 – 2 TOR`.
5. **Home Following video layers:** line 3 reads the full game score, away first: `▲7th · NYY 7 – 2 TOR · 0:41`. *(Updated Oct 2, 2026 by product-owner decision — rev 1 said the compact `NYY 7–2`.)*
6. **Highlights page game header**, if it was built: `[logo] HOU 8 [logo] CHC 5` becomes `[logo] HOU 8 – 5 CHC [logo]`, with one ink colour for the whole string.

## Shared formatter
If a `fmtScore` helper was added, remove it and restore the original strings at each call site. Alternatively, make it a pass-through, which is what the design's `window.fmtScore` in `shared.jsx` now is. **Don't leave it rewriting strings.**

## Leave alone
- **Postseason bracket live footer and series drawer** (`LIVE · ▼6 HOU 3 CLE 1`, and the per-game scores in the drawer). These used the no-dash form before the rule and were signed off that way. On a bracket card the dash means the series record, so they stay as they are.
- Series records (`2–1`), W–L records, games-back dashes, and em-dash placeholders.

## Acceptance
1. Every game score outside the bracket and series drawer reads `TEAM n – n TEAM` (or `TEAM n–n` where it was compact before).
2. The bracket footer and series drawer are unchanged.
3. Nothing in the app still calls a score reformatter that swaps team and run order.

Design files (post-revert): `holistic/shared.jsx`, `holistic/game-v2.jsx`, `holistic/clips.jsx`, `holistic/home.jsx`.
