# One score format, app-wide

**Rev 1 · Sep 30, 2026.** Copy/format only. Not gated, and no API change.

## The rule
- **A dash only ever means a series record:** `2–1`, `Yankees lead 2–1`, `BOS won 2–0`.
- **A game score pairs each team with its own runs, with no dash:** `HOU 8 CHC 5`. The away team is listed first, as the rest of the app does.

The rule exists because the bracket shows both kinds on one card: series wins in the team rows and the game score in the live footer. There, `HOU 3–1` read as the series.

## Change these (all currently `TEAM n – n TEAM` or `TEAM n–n`)
1. **Sticky line-score bar** (`LineScoreBand`): `[logo] HOU 8 – 5 CHC [logo]` becomes `[logo] HOU 8   [logo] CHC 5`.
   - Each logo sits before its own abbreviation.
   - The dash between the runs is deleted, and there's an 8px gap before the second team.
   - Leader white / trailer dim is unchanged.
   - Pregame keeps its empty run slots.
2. **"Runs score" chip** in the at-bat list: `2 runs score · HOU 8 – 5 CHC` becomes `2 runs score · HOU 8 CHC 5`.
3. **Live strip above the on-top clip player:** `HOU 8 – 5 CHC` becomes `HOU 8 CHC 5`.
4. **Home Following video layers:** the line `Judge home run · ▲7 · NYY 7–2` becomes `… · NYY 7 TOR 2`.
5. **Highlights page game header:** `[logo] HOU 8 – 5 CHC [logo]` becomes `[logo] HOU 8 [logo] CHC 5`.
6. **Bracket live footer / series drawer:** these already follow the rule. Leave them.

**Anywhere else a game score is built from a string, use one shared formatter** rather than formatting per component. The design's `window.fmtScore` in `shared.jsx` rewrites `HOU 8 – 5 CHC` / `HOU 8–5 CHC` to `HOU 8 CHC 5`.
- Grep for `– ` and `–{` between two numbers.
- **Leave W–L records, game-back dashes and em-dash placeholders alone.** They aren't game scores.

## Acceptance
1. No game score anywhere contains a dash.
2. Series records still use the dash.
3. W–L records (standings, team pages) are unchanged.
