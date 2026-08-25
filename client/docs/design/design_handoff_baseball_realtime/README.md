# Team Page — Overview

Design handoff for a new `/team/:teamId` route in the Baseball Realtime client.

## What this is

A team-level landing page — the missing middle between the games list and the player page. Today a team exists in the app only as a logo on a game card; this gives it a home.

## Files

| File | What it is |
|---|---|
| `PROMPT_team_page.md` | Implementation spec — hand this to Claude Code |
| `Team Page — Overview.html` | The design of record. Pixel reference. |
| `Team Page — Today card states.html` | The Today card in all three game states (live / final / upcoming) |

## Structure

**Hero** — logo, division eyebrow, team name, venue + founded, and three numbers: Record, Division, Streak.

**Left column**
- **Today** — the current/last/next game. Three states, one frame. See the states file.
- **Recent form** — last 10 as W/L chips, plus Home / Away / 1-Run splits.
- **Roster** — table grouped by position (Infield / Outfield / Catcher), Batters/Pitchers toggle. Names link to `/player/:mlbId`.

**Right column**
- **AL West** — their division only, five rows, their row pulled out in `surfaceAlt`.
- **Team leaders** — HR and AVG top-3, Bat/Pitch toggle.
- **Next up** — next three games.

## Decisions made

- **One scrolling page, no tabs.** Tabs earn their place only if Schedule and a full Stats reference land here later.
- **Roster is a table, not cards.** Same call as the player Stats tab — dense reference reads better as a table.
- **Standings shows one division, not the league.** Full league lives at `/standings`.
- **One verb on the Today card.** All three states link to `/game/:providerGameId`. There is no box score view (removed during the game-view design pass) and no separate preview — the game view's pregame state is the preview.
- **No "Full schedule" link.** No such view exists and full-season schedule data is unconfirmed. Next up covers the lookahead.

## Data notes

Mostly reuses what's already wired. Two things to confirm before building:

- **Team season splits** (Home / Away / 1-Run) — source unconfirmed.
- **Team leaders** — may be derivable from the existing `/leaders` data filtered by team, or may need a new team-scoped query.

Everything else (records, standings, schedule lookahead, rosters, player stats) already flows through existing endpoints.

## Not designed

Mobile breakpoints · empty/loading/error states · a Pitchers roster view (toggle renders, inert) · postseason or offseason states.
