# Two design decisions: bracket live line + Upcoming tab empty state

**Oct 2, 2026.** Two small design jobs from the Sep 30 send, both already built as specced and both still open. For each: pick a direction, update the design files, and send a short PROMPT (with a rev number) that I can hand to dev.

House rules still apply:
- Mono + tabular-nums for every number.
- Rust only means live.
- A dash only appears in a series record or a full game score (`HOU 8 – 5 CHC`).
- All times are in the viewer's own timezone, with no zone label.

---

## 1. Postseason bracket: the live footer line still clips

**Where:** `holistic/bracket.jsx`, the Current card (`BK.curW`), Home → Postseason. Rev 2 widened the card from 150 to **176px** and says the footer line must never ellipsize.

**What happens now:** line 2 of a live card's footer reads `● LIVE · ▲1 CWS 0 HOU 0`. At 176px it fits **up to 15 characters of score text** (e.g. `▼6 SEA 1 DET 3`, `▲10 NYY 5 BOS 4`). It still clips when the score runs two characters longer:
- extra innings + a double-digit score: `▲11 HOU 10 CLE 3`
- both teams in double digits: `▼6 SEA 10 DET 11`

The longest realistic line, `▼10 SEA 10 DET 11`, needs **186px**.

These measurements are from the app: Mono 11 inside the card's 8px side padding.

**Options considered** (pick one, or propose another):
- **A. Widen current cards to 186px.** Keeps the line exactly as specced. Every current card grows 10px more, so the bracket's minimum width grows and it scrolls sooner on narrow screens.
- **B. Drop the word `LIVE` (and the `·`); keep the rust dot.** The line becomes `● ▼6 SEA 10 DET 11`. It fits every score even at 150px, so the card could also go back to its rev 1 width. The rust dot alone carries "live", which is already the app's convention.
- **C. Accept the clip for those rare scores.** No change; the last run total ellipsizes only for extra innings with a double-digit score, or for double digits on both sides.

**Deliver:** the chosen option in `bracket.jsx` (and `BK.curW` if it changes), plus a rev 3 note in `PROMPT_postseason_bracket.md`.

**Acceptance:** at the chosen width, `● LIVE · ▼10 SEA 10 DET 11` (or the shortened form) renders without ellipsis on a current card.

---

## 2. Player page → Upcoming tab: no upcoming game

**Where:** `holistic/player-upcoming.jsx` (Upcoming tab, Tab 5). This is the parked edge state **F-001** in `future.md`.

**What happens now:** when the player's club has no known next game, the tab falls back to its **mock games**. Today Bryce Harper's tab shows "vs Tigers" with blank stats. That's false data, and it happens all the time in October and the off-season.

**When there is no next game:**
- **Postseason, waiting on a result:** the next round's opponent depends on a series that isn't decided yet. The game exists, but its opponent is `ATL/PHI`.
- **Eliminated:** the season is over for that club.
- **Off-season:** from the World Series to spring training.
- **Between series:** the next postseason game exists, but its time and probable starter are TBD.

**What the data can give the empty state:**
- the club's last game: date, opponent, final score
- why there's no next game: waiting on a series (with the possible opponents), eliminated, off-season
- the next round's date even when its opponent isn't known (e.g. `Sat 10/03 · vs ATL/PHI`)
- the player's season line, already on the page

**Design:**
1. **No game at all** (eliminated or off-season): what replaces the 3-game selector rail and the deep-dive? One quiet line? The last game? A pointer to the season?
2. **Next game known but opponent TBD** (`vs ATL/PHI`): show the game with the opponent as a pair (like the bracket's logo pair) and the projection cards empty? Or treat it as "not yet"?
3. **Opponent known, starter TBD:** the tab already has a "Starter TBD" note. Confirm it covers this.

**Constraints:** no mock data in any state. The tab must never show a game that isn't on the schedule. Keep the tab in place and still selectable, because the player still exists.

**Deliver:** the states in `player-upcoming.jsx` (an artboard each is fine), and a PROMPT with acceptance lines.

**Acceptance:**
- An eliminated club's player shows the designed empty state, not mock games.
- A player waiting on a series shows the real next date with both possible opponents.
- No state renders mock teams, mock pitchers or mock numbers.
