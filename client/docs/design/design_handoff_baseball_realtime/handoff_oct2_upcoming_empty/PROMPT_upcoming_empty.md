# Upcoming tab: no-upcoming-game states

**Rev 1 · Oct 2, 2026.** This answers `PROMPT_design_bracket_live_line_and_upcoming_empty.md` §2 and closes **F-001**. It isn't gated: it reads the schedule, standings/series and last-game data the app already has.

Design reference: `holistic/player-upcoming.jsx` (`UpcomingEmpty`, `StarterTBDBody`, and the `!g.pitcher` branch in `GameSelectCard`) and `Upcoming Tab - Empty State.html` (four artboards). **Port the layout values verbatim.**

## The one rule
**The tab never renders a game that isn't on the schedule, or any mock team, pitcher or number.** Delete the mock fallback path (Harper "vs Tigers"). The tab stays in place and stays selectable in every state.

## Pick the state
```
no scheduled game for the club?
  ├─ in postseason, next round's opponent undecided → EMPTY · waiting
  ├─ eliminated                                      → EMPTY · eliminated
  └─ off-season                                      → EMPTY · offseason
scheduled game(s) exist
  └─ per game: no probable AND no rotation projection → STARTER TBD (rail card + body)
     otherwise → normal deep-dive (unchanged)
```
A game whose opponent is a pair (`ATL/PHI`) counts as **waiting**, not a rail card, because there's no opponent to project against.

## 1. Empty states (`UpcomingEmpty`): answers design Q1 + Q2
These replace the rail AND the deep-dive. The layout is:
- the title "Next games"
- one card:
  - left: a headline (20px, 700), one "why" sentence (14px, muted), and an optional link (rust)
  - right, behind a hairline divider: only the KNOWN facts as label/value rows
- a one-line footnote: "Matchups for {first name} appear here once a game and its probable starter are set."

There is no Confirmed/Projected legend and no "Sample data" pill.

| kind | Headline | Why (written from data) | Facts |
|---|---|---|---|
| `waiting` | Next opponent not set yet | The round just won + the series that decides the opponent, with its series score | Next series `ALCS · best of 7` · Opponent = logo pair + `NYY/CLE`, sub "Set after Game 5 tonight" · Game 1 `Sat 10/17 · vs NYY/CLE`, sub "Start time not announced" when unknown |
| `eliminated` | Season over | Who eliminated them, the round, the series score, the date | Last game `Oct 9 · NYY 5 – 2 HOU`, sub `ALDS Game 4 · lost series 1–3`. Link "See his 2026 season in Stats" → Stats tab |
| `offseason` | No games scheduled | When the season resumes | Opening Day + opponent logo if known (`Thu 3/25 · vs LAA`); omit the row if not |

- Drop any fact row you can't fill. Never write "TBD" or "—".
- Every number is mono + tabular-nums.
- Game scores use the full dash form (`NYY 5 – 2 HOU`); a bare dash is only for series records.
- No rust except the link.

## 2. Starter TBD: answers design Q3
The existing "TBD" chip alone did NOT cover this: the rail card and deep-dive dereferenced `g.pitcher` and would have rendered mock pitcher data. Now:
- **Intro:** the title counts the real games (`Next game` / `Next N games`, never a fixed "3"). When any game is TBD, the Confirmed/Projected legend and the sample-data pill are hidden. When every game is TBD, the subtitle reads "Starters for these games haven't been announced or projected yet."
- **Rail card:** same slot and height. A dashed `borderStrong` empty headshot (36×54), "Starter not announced" in muted 13px/700, and the TBD chip. The verdict pill reads "Matchup pending" (soft).
- **Deep-dive:** the header reads `Peña vs {opp short}` with date · time · venue; any missing part is dropped, not blanked. The body is ONE card: "Starter not announced yet" plus one sentence ("…once the {opp short} name a probable or their rotation makes one projectable. Probables usually post 1–2 days out.").
- The verdict pill is `width:100%`, so it needs `box-sizing:border-box`. Without it, it overflows the card by its padding (this affected every rail card, not just TBD).
- **No** H2H, arsenal, read, splits, location or recent-meetings cards. Each of those describes a pitcher who doesn't exist yet.
- When a projection or probable arrives, the game becomes the normal deep-dive.

## Times
Use the viewer's own zone with no label. If the start time is unknown, show the date only. MLB's placeholder clock time must never show.

## Acceptance
1. An eliminated club's player shows EMPTY · eliminated with the real last game. No mock games.
2. A player waiting on a series shows the real next date with both possible opponents as a logo pair.
3. A scheduled game with no probable and no projection shows the TBD rail card + body, with no pitcher cards.
4. In no state does a mock team, pitcher or number render. Grep for the mock arrays (`UPCOMING_GAMES`, `PENA_*`) in app code comes back empty.
5. The tab is still present and selectable in all states.
