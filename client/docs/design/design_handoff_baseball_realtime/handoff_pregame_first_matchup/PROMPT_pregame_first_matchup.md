# Pregame: first matchup in the live layout

**rev 1 · Oct 23, 2026** · Data needed: probable starters (already used by the band drawer + Head-to-head), a
projected lineup, batter-vs-pitcher career lines (already used by Head-to-head). Follows `handoff_scorecard_oct22/` (accepted).

Preview: `Pregame - First Matchup (standalone).html` (double-click, open at ≥1400px). The dark bar at the top is
**review-only** and switches between three states. Do not port it.
Design source: `holistic/game-v2.jsx`: `GameScreenV2Pregame`, `PregameMatchupLeft`, `PregameMatchupContext`,
`PregameFeed`, `ProjectedTag`, `fmtClock`, `fmtDay`.

## Why

Before the first pitch, the Preview view showed a single "Game hasn't started" card. Now it uses the **live
layout**: a 600px left column (matchup card + context card) and the pitch-by-pitch card on the right. Every card sits
in the slot it fills during the game, so at the first pitch the cards fill in and nothing moves.

## 1 · Left column, matchup card (`PregameMatchupLeft`), same structure as `MatchupLeft`

- **Eyebrow:** `▲ 1st` · empty bases · Balls / Strikes / Outs all 0 · **Lineups ▾** (the button moves out of the
  old empty card into this eyebrow, the same slot as live).
- **Zone column (280px):** strip `○ BEFORE FIRST PITCH` (hollow dot, neutral, no rust). Empty `StrikeZone`.
  Under it: `Pitches plot here from 7:05p`.
- **Batter half:** eyebrow `Leading off · HOU` + **Projected** tag. Headshot 68, order spot, name, pos · hand, season
  slash. Rows: `Last 7 games  9-for-27` and `vs Imanaga  3-for-9 · career`. With no history, show
  `First meeting` (sans).
- No "At-bats" diamond row (there are none yet). The card is therefore a little shorter than live. That's accepted.

## 2 · Left column, context card (`PregameMatchupContext`), same structure as `MatchupContext`

- **Strip:** `Starting · CHC` · probable name · hand · #. On the right are season figures: record, ERA / WHIP, K, then `· season`.
  **Never tagged:** probables are announced by MLB.
- **Left half:** `First matchup` · `Altuve vs Imanaga` · `Career 3-for-9 · .333 · 1 HR` (or `First meeting`).
- **Right half:** `Due up` + **Projected** tag · On deck (spot 2) / In the hole (spot 3), each with their career
  line vs the probable (`1-5`) or `First meeting`.
- Keep the `minHeight: 138` row lock.

## 3 · Right column, pitch-by-pitch card in its empty state (`PregameFeed`)

Same card, same slot, stretched to the left column's height. Header `PITCH BY PITCH` · `Starts at 7:05p`.
Body, centred:
- `FIRST PITCH` eyebrow + the time large (mono 40/700).
- `Every pitch appears here as it's thrown, with the strike zone and the matchup on the left updating alongside it.`
- Projected: `Lineups are projected from each club's last lineup against a left-handed starter. Official lineups
  usually post about 6:05p.` ("projected" in rust bold). Official: `Official lineups posted at 6:02p.`
- `Bench and bullpen are in Lineups.`

## 4 · Projected tag (`ProjectedTag`)

Rust text, 1px **dashed** rust border, pill, 11px/700 uppercase, `line-height:16px`. It goes on exactly two
headings: **Leading off** and **Due up**, the two that come from the lineup. Both disappear when the official
lineup posts. Nothing else changes, and no height changes.

**Projection rule:** the club's most recent lineup against a starter of the **same hand** as today's opposing probable.
When the official lineup arrives, swap the data and drop the tags. The first pitch is the final truth (same posture
as the Oct 22 Due Up projection).

## 5 · Times: viewer's timezone, computed, no zone label

- Every clock time on this screen is formatted in the **viewer's timezone**, with **no zone label** (Oct 1 rule).
  This includes the page subtitle (`Wrigley Field · Fri Oct 23 · 7:05p`), which used to read `8:05p ET`.
- Lowercase `a`/`p`, no space (`7:05p`). See `fmtClock` / `fmtDay`.
- **Derived times are computed, never written as an offset.** Write `usually post about 6:05p` (first pitch − 60 min),
  not `about an hour before 7:05p`.

## 6 · States

| State | When | Shows |
|---|---|---|
| `projected` | probable known, official lineup not posted | the layout above, with tags |
| `official` | lineup posted | same layout, no tags, "Official lineups posted at …" |
| `none` | no probable starter announced | the single "Game hasn't started" card (⚾ emoji removed; copy: "The first matchup appears here once the starting pitchers are announced…") |

Head-to-head view and the pregame line-score band are unchanged. The bar keeps its dashes (a dash means not started;
`0 – 0` would mean started and scoreless).

## Acceptance

- [ ] Before the first pitch with a probable: two-column live layout. The left column's cards sit in the slots
      `MatchupLeft` / `MatchupContext` fill live, and pitch-by-pitch is on the right at the same height.
- [ ] Lineups button is in the matchup card's eyebrow.
- [ ] Projected tag on Leading off + Due up only. Gone once the official lineup posts, with no layout shift.
- [ ] Probable starter is never tagged.
- [ ] "First meeting" shows wherever there is no batter-vs-pitcher history.
- [ ] All times are in the viewer's timezone, with no "ET" or other zone label anywhere on the page.
- [ ] Lineup line shows a computed clock time (first pitch − 60 min), not "an hour before".
- [ ] No probable: single empty-state card, no emoji.
- [ ] At the first pitch, the cards fill in place. The page does not change shape.
