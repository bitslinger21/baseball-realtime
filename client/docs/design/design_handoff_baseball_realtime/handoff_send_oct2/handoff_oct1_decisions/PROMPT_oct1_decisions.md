# Oct 1 decisions: four small items

**Rev 1 · Oct 1, 2026.** Answers to the four questions in `HANDOFF_to_design_oct1.md`. None of them is gated or needs a new API (item 2 only reads the schedule data you already have).

Do them in this order. Commit each one, report back, and wait for "next".

## 1. Bracket: current card 176 → 186px
- Set `BK.curW` to `186` in `holistic/bracket.jsx`, and update the matching CSS width in the app.
- This fits the longest realistic live line, `● LIVE · ▼10 SEA 10 DET 11`.
- Keep the ellipsis as a safety net.
- Acceptance: that string renders without clipping. Rounds still space evenly and the connectors still line up.
- Commit: `bracket: current card 186px`

## 2. Upcoming tab: empty state
> **SUPERSEDED Oct 2** by `handoff_oct2_upcoming_empty/PROMPT_upcoming_empty.md`, which adds the starter-TBD state. Use that prompt instead of this section.
- When the club has no known next game, render `UpcomingEmpty` (in `holistic/player-upcoming.jsx`; review file `Upcoming Tab - Empty State.html`).
- **Never fall back to mock games.** Remove the Harper "vs Tigers" path.
- The state shows:
  - a title "Next games"
  - one card: a headline, one "why" sentence, and an optional link
  - on the right, only the facts that are KNOWN
  - a one-line footnote: "Matchups for {player} appear here once a game and its probable starter are set."
  - no Confirmed/Projected legend and no sample-data pill
- Three kinds:

| kind | Headline | Why sentence (write from data) | Facts |
|---|---|---|---|
| `waiting` | Next opponent not set yet | Round just won + which series decides the opponent and its state | Next series (`ALCS · best of 7`) · Opponent as a logo pair + `NYY/CLE` · Game 1 date, with "Start time not announced" when the time is unknown |
| `eliminated` | Season over | Who eliminated them, in which round, the series score, the date | Last game (`Oct 9 · L 2–5 vs NYY`). Link: "See his 2026 season in Stats" → Stats tab |
| `offseason` | No games scheduled | When the season resumes | Opening Day with opponent if known; omit it if not |

- If there's no fact you can stand behind, drop that row; don't write "TBD".
- Dates show the day alone when the time is unknown (MLB's placeholder clock time must never show).
- Commit: `upcoming: empty state when no next game`

## 3. Scout / replay at-bat badge: no change
Scout gets no dashed badge. The dashed rust cell means LIVE, and a replay marker isn't live. Keep the slot empty, as built. Nothing to do; just confirm.

## 4. Timezone: viewer's own zone everywhere
- Every game time in the app renders in the **viewer's local timezone with no zone label**, as Following already does.
- That covers pregame, Today's games, schedule, the bracket, the series drawer, Upcoming and team pages.
- Find every remaining `ET` label and every hard-coded `America/New_York` formatting, and route them through one shared time formatter.
- Unknown start times show the day alone (see item 2).
- Acceptance: grep for `' ET'` / `America/New_York` in display code comes back empty, and the same game shows the same clock time on Following and on the game page.
- Commit: `time: viewer's local zone everywhere`

Design files: `holistic/bracket.jsx`, `holistic/player-upcoming.jsx`, `Upcoming Tab - Empty State.html`, `holistic/shared.jsx` (needed by the review file).
