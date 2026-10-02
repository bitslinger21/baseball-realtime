# Back to design: Sep 30 send package, as built

**Oct 1, 2026.** All six items in `handoff_send_sep30/` are in the app. This note covers where the build departs from the specs (each approved by the product owner), two things that need a design decision, and the data limits that should shape the next designs.

---

## Needs a design decision

### 1. Bracket live line still clips in the worst case
Rev 2 (176px) fixed the normal case: `● LIVE · ▲1 CWS 0 HOU 0` fits. The rule says the line must never clip, but it still does when the score text runs two characters longer than that:
- extra innings + a double-digit score: `▲11 HOU 10 CLE 3`
- both teams in double digits: `▼6 SEA 10 DET 11`

The longest realistic line, `▼10 SEA 10 DET 11`, needs a **186px** card. The options:
- widen to 186px
- drop the word `LIVE` and keep the rust dot (fits every score at 150px)
- accept the clip for those rare scores

Today it ellipsizes.

### 2. Upcoming tab with no upcoming game
When a player's club has no known next game (postseason clubs waiting on a series result, eliminated clubs, the off-season), the Upcoming tab falls back to its **mock games** (it shows Harper "vs Tigers"). This is the parked F-001 edge state, and it's now visible every October. It needs an empty-state design.

---

## Decided by the product owner (Oct 2)

- **Following clip score is the full game score:** `▲7th · NYY 7 – 2 TOR · 0:41` (away first, the dash form), not the compact `NYY 7–2` in `PROMPT_score_format_revert.md` §5. Please update that prompt and `holistic/home.jsx` to match.
- **Every time in the app is in the viewer's own timezone, with no zone label.** This covers Following, pregame first pitch, the game header, Schedule, the Team page and the Upcoming tab. Anything that says "ET" in a design should drop it.

## Built differently from the spec (approved)

| Item | Spec | As built | Why |
|---|---|---|---|
| Live at-bat badge | 44px `ScorebookCell` | **40px** | Matches that list's finished badges, so the column stays aligned (acceptance #3). |
| Live at-bat badge in Scout/replay | (not covered) | **No badge** in that slot, as before | The donut never existed there. Say if Scout should get the dashed cell too. |
| Pregame band streak colours | `#86efac` / `#fca5a5` | Token-based (`--color-positive`/`--color-negative` lightened 55%) | The existing pregame code already did this on purpose, for legibility on ink. |
| Following TODAY line | `▼7th · leading Atlanta 3–0` | `▼7th · leading ATL 3–0` (abbreviations; `Final · beat BOS 9–2`, `lost to NYY 2–9`) | City names are ambiguous (two clubs each in NY, Chicago, LA; MLB calls the Yankees "Bronx"), and club names overflow the 320px rail. |
| Game times, app-wide | `7:05 ET` in places | The **viewer's own timezone**, no zone label | Product-owner decision (above). |
| Following video layers | One per clip | **Play highlights only** | Interviews, ABS challenge reviews, alternate angles and the condensed game have no linked play, so no inning or score for line 3. They still appear on the game page and the Highlights page. |
| Following W/L line | `W: Imanaga (12–6)` | In October, the pitcher's **postseason** record (`W: Fried (1–0)`) | It's what the live feed carries during a postseason game. |
| Highlights page | A clip grid per game, all open | **One collapsed row per game**: `logo AWY 4 – 3 HOM logo [Final/Live] … 45 clips  Open game → ▾`. Clicking opens that game's grid; one open at a time; all collapsed on a new date | A 15-game day was ~550 thumbnails. Product-owner change; the `▾`/`▴` caret was added so the row reads as expandable. |
| Highlights page | Every game with clips | **Cancelled/postponed games left out** | A rainout reads as "final" in the schedule data and its clips are rain-delay videos (it showed as `BAL 0 – 0 NYY Final`). |

---

## Data facts the next designs should assume

- **Not every clip is a play.** About two-thirds of a game's videos are non-plays: interviews, ABS challenge reviews (`…-capture-review`), alternate angles, "Field View", the condensed game, anthems. Only play highlights carry an inning, a score and an at-bat link. Any surface that needs those should expect about a third of the clips.
- **Play highlights now link exactly.** MLB's video id matches the play, so every play highlight gets its at-bat (Watch button, scorecard mark, inning label, game order). Spring-training videos carry no such id and stay mostly unlinked.
- **A day is big.** About 15 games and roughly 550 clips. Design for collapsing or lazy loading, never "show everything".
- **Start times can be unknown.** Later postseason rounds and rescheduled games have a date but no time. MLB fills in a fake clock time; the app now shows the day alone (`Sat vs ATL/PHI`).
- **Opponents can be unknown.** Until a series ends, the next round's opponent is a pair (`ATL/PHI`). The bracket draws this as a logo pair; text surfaces show `ATL/PHI`.
- **The live strip has the full situation.** The on-top player's strip reads `LIVE ▲8 BOS 2 – 9 NYY · 1 out · runner on 2nd`.
- **Scheduled innings aren't known before first pitch.** The pregame band always shows 9 empty innings, including for a 7-inning doubleheader game.

---

## Verified in the app (Oct 1, live PHI @ ATL)

- **Live at-bat badge:** the rust-dashed empty cell, the same as the batter card's live cell, at the same width as the finished badges. No solid circles remain.
- **Same clip on two cards:** Michael Harris II's three-run homer appears on both his card and the Braves card.
- **Real Statcast whiff % on the Upcoming tab:** the data path is wired, with 4 of Ray Kerr's 5 pitches matching Harper's Statcast mix. Not yet seen on screen; it needs a game with named probable starters (see decision 3).
