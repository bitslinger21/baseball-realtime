# Handoff: Postseason bracket on Home + series drawer

rev 1 · Sep 29, 2026

## Overview
Once all 12 postseason spots are clinched, Home's **Races** section becomes a **postseason bracket**. It uses the same slot and full width. Wild-card chases go away too, since the season is over. Clicking any matchup that has started opens a **series drawer** from the right: one row per game, with score, pitchers, a notable line and the recap video.

- **Trigger:** a condition, not a date: all 12 berths are clinched.
- **Two mock states:** `set` (field just set, nothing played) and `ds` (mid-Division Series).
- **Data:** the bracket needs no new API beyond schedule + series standings. The drawer needs per-game decisions (W/L/SV), one notable-player line, and a **recap video id** per game (see §6).

## About the design files
The files in `holistic/` are **design references built in HTML/React-in-the-browser**. They are not production code. Recreate them in the app's existing React/TS environment and patterns. `Home - Postseason.html` opens the reference directly: use the "Season" segmented control and pick **Field set** or **Oct · DS**.

## Fidelity
**High fidelity.** Colours, type, sizes and spacing are final. Use the app's existing tokens (`T.*`, see §7) and atoms (`TeamDot`). Don't use new hexes.

---

## 1. Bracket layout (`holistic/bracket.jsx` → `window.PlayoffBracket`)

**Seven rounds in one row, mirrored:** AL Wild Card · ALDS · ALCS · World Series · NLCS · NLDS · NL Wild Card.

- **Row:** flex row, `padding: 0 32px`, inside a horizontal scroller (`overflow-x:auto`, `padding-bottom:16px` so the scrollbar never covers a card). `min-width: 980px`. Below that width it scrolls rather than squeezes.
- **Round width** = the widest card in that round (see widths below). It does **not** stretch.
- **Gaps between rounds** are flex spacers: `flex:1; min-width:44px`. They're all equal, so **rounds are equally far apart**, and any extra width goes into the gaps, not the cards. The spacers also draw the connector lines.
- **Round header:** centred over its cards, two lines, right above the cards (44px header zone including a 10px gap to the cards):
  - line 1: round name, DM Sans 11.5 / 700 / letter-spacing .08em / uppercase / `T.text`
  - line 2: `Best of N`, JetBrains Mono 11 / `T.textMuted`
  - A header wider than its round (e.g. "AL WILD CARD" over 58px cards) overhangs **evenly on both sides**, which is why the row has 32px of side padding.
- **Vertical:** each round's body is `CH = 2×92 + 26 = 210px` tall.
  - **Paired rounds** (Wild Card, DS): two 92px slots at top 0 and 118, centres at y=46 and y=164.
  - **Single rounds** (CS, WS): centre at y=105.
  - A card shorter than 92px is centred vertically in its slot.

### Card types (the card's state picks the type)
| Type | When | Width |
|---|---|---|
| **Current** | series started or both teams known, not decided | **150px**, all identical |
| **Finished** | series decided | **58px** |
| **Upcoming** | at least one side not yet known | **84px** |

All cards share: `T.surface` background (hover `T.surfaceAlt`), 1px `T.border`, radius `T.r.sm`, overflow hidden, centred in the round (`margin: 0 auto`).

**Current card (150 × 92)**
- Two team rows, 28px each, grid `14px 18px 1fr auto`, column gap 7, padding 0 8:
  - seed: Mono 11 / 600 / `T.textMuted`, right-aligned
  - `TeamDot` 18
  - abbreviation: DM Sans 13.5 / 700 / `T.text`
  - series wins: Mono 15 / 700. The leader is in `T.text`, the trailer in `T.textMuted`. Blank until game 1.
- Footer: 1px `T.border` top, the remaining height, padding 0 8, **two lines centred vertically**, gap 2, Mono 11, no wrap, ellipsis:
  - line 1 (always), 600 `T.text`: **`Game {n} of {bestOf} @ {HOST}`**, e.g. `Game 4 of 5 @ BOS`
  - line 2 (not live), 500 `T.textMuted`: **date + time**, e.g. `Wed 10/07 7:08`
  - line 2 (live), 600 `T.text`: a 6px `T.accent` dot, then `LIVE` (DM Sans 10.5 / 800 / .06em / `T.accent`), then `· ▼6 HOU 3 CLE 1`.
- **Score rule (see §5):** the live score is written as **team + runs, team + runs**, never `3–1`.
- **Deliberately removed:** stakes copy ("NYY can clinch"), probable starters, and the old seed-row strikethrough/fade.

**Finished card (58 wide, 2 × 24px rows + 1px divider)**
- **Winner first**, whatever the seeding.
- Each row: flex, `justify-content: space-between`, padding 0 8: `TeamDot` 18 on the left, wins **right-aligned** (Mono 12).
- **Winner row:** background `T.positiveSoft` (the win-chip green), number 700 `T.positive`.
- **Loser row:** no background, **no fade**, number 500 `T.textMuted`.
- No abbreviation, no seed, no footer. The native `title` tooltip = `BOS won 2–0`.

**Upcoming card (84 wide: 2 × 24px rows + a date row)**
- Each side is one of:
  - a known team: `TeamDot` 18
  - one of two possible teams: `TeamDot` `/` `TeamDot` (the slash is Mono 11 `T.textMuted`, gap 4)
  - an unknown team: a word, e.g. `AL champ` (DM Sans 11 / 600 / `T.textMuted`)
- **No empty/dashed placeholder circles.**
- Date row: 1px `T.border` top, padding 4 8, Mono 10.5 / 600 / `T.text`, e.g. `Mon 10/12`.
- Tooltip = what it's waiting on ("Waiting on ALDS").
- **Not clickable** (`cursor: default`).

**World Series** column: the card is centred in its round and lines meet it from both sides.

### Connectors
- **One colour everywhere:** 1.5px `T.borderStrong`. They don't change when a series ends; the cards already show who advanced.
- **Wild Card → DS:** two straight lines, at y=46 and y=164.
- **DS → CS:** an elbow.
  - From each DS card, a horizontal line to the middle of the gap.
  - A vertical line from there to y=105.
  - A horizontal line from there to the CS card.
  - Mirrored on the NL side.
- **CS → WS:** one straight line at y=105.
- **Narrow card inside a wider round** (e.g. a finished 58px card in the NLDS next to a 150px current card):
  - Stubs fill the space on each side, out to the round's edges.
  - The lines stay continuous and the card sits on top of them (z-index 1).

### Followed teams
A followed team's row gets a 2px `T.ink` bar on its left edge (inset 4–5px top/bottom), on every card type. On upcoming cards the bar marks the whole logo pair if **either** team is followed.

---

## 2. Series drawer (`holistic/series.jsx` → `window.SeriesDrawer`)

**Opens from:** a click on a **Current** or **Finished** card. Upcoming cards don't open it.

**Panel**
- `position: fixed`, full viewport.
- Backdrop `rgba(20,16,12,0.28)`, fades in over 0.2s.
- Panel on the right, **420px** wide (max 100%): `T.surface`, 1px `T.borderStrong` left edge, shadow `-18px 0 48px -16px rgba(20,16,12,.28)`.
- Slides in with `translateX(100%→0)`, 0.24s, `cubic-bezier(.22,.61,.36,1)`. Same gesture as the game view's Lineups panel.
- **Close:** ✕ button, Esc, or a backdrop click.

**Header bar** (`T.surfaceAlt`, padding 14 18, bottom border): round name DM Sans 15/700 + `Best of N` DM Sans 12 `T.textMuted`; ✕ button 28×28 on the right.

**Series summary** (padding 18, centred, bottom border):
- Logo 30 + abbreviation (13/700) · **`2 – 1`** (Mono 30/700, the dash 400 `T.textMuted`) · logo + abbreviation.
- Below: the status sentence, DM Sans 13/600: `Yankees lead 2–1` · `Series tied 1–1` · `Phillies won 3–1`.

**One row per game, in order.** Padding 12 18, bottom border, column gap 6. Head line = `Game N` (DM Sans 12.5/700) + `Sat 10/03 · @ NYY` (Mono 11.5 `T.textMuted`).

| Game state | Row contents |
|---|---|
| **Final** | Recap button on the right of the head line. Score line: `TeamDot` 16 + abbr + runs per side; winner 700 `T.text` listed first, loser 500 `T.textMuted`; extra innings tag `F/10` (Mono 11). Decisions: `W Cole  L Crochet  SV Williams` (DM Sans 12 `T.textMuted`, letters bold `T.text`; SV only when there is one). Notable line: DM Sans 12.5 `T.text`, e.g. `Judge 2-for-4, HR, 3 RBI`. |
| **Live** | Row background `T.accentSoft`. `Open game →` link on the right (goes to that game's live view). Dot + `LIVE` + inning, then the score line, then the situation (`1 out · runner on 1st`). |
| **Next** | Date **and time** + probables (`Gil vs Houck`), or `Probables not announced`. |
| **If necessary** | Date only + `If necessary`. |

**Recap button**
- 26px tall, padding 0 9, 1px `T.border`, radius `T.r.sm`.
- Contents: ▶ glyph + `Recap` (DM Sans 12/700) + duration (Mono 11/500, 80% opacity).
- Hover / playing: `T.ink` background and border, white text.
- **No recap id yet:** shows plain text `Recap not posted yet` (DM Sans 11.5 `T.textMuted`) instead of the button.

**Recap player:** it opens **inside that game's row**, under the notable line.
- 16:9, radius `T.r.sm`, `T.ink` background; use a real `<video>` with native controls.
- **Slides down/up:** wrap it in a `display:grid` whose `grid-template-rows` animates `0fr ↔ 1fr` over 0.28s `cubic-bezier(.22,.61,.36,1)`; the inner wrapper is `min-height:0; overflow:hidden`.
- Keep it mounted so closing animates too.
- Only one open at a time; pressing Recap again closes it.

**Game-row clicks** (suggested, not built): a final row opens that game's game view (final state).

---

## 3. State
- **Home:** `seasonPhase`, which is `postset` or `postds` (a derived condition, see Overview).
- **`PlayoffBracket`:** `open: {seriesId, hi, lo} | null`.
- **`SeriesDrawer`:** `playingGame: number | null`.
- **Series id in the mock:** `${hi.abbr}-${lo.abbr}`. Use the real series id in the app.

## 4. Data needed per series / game
- **Series:** round, bestOf, seeds, teams, wins per side, status sentence (built from the wins; see §5 for wording).
- **Game:**
  - game number, date, start time, host
  - state: `final` / `live` / `scheduled` / `ifNecessary`
  - final: runs per side, extra innings count, W / L / SV pitcher names
  - live: inning half + number, runs per side, outs/runners sentence
  - scheduled: probable starters
- **Notable line:** one short line per final game. Build it server-side from the box score: the top performer by a simple rule (multi-HR > HR + RBI > 3+ hits > pitcher with ≥7 IP or ≥10 K). If nothing qualifies, leave the line out; no filler.
- **Recap:** a video id + URL + duration for each final game (§6).

## 5. Score-formatting rule (decided)
A **dash always means the series**, and a **game score always pairs each team with its own runs**:
- Series: `Yankees lead 2–1`, `BOS won 2–0`, the drawer's big `2 – 1`.
- Game: `HOU 3 CLE 1`, `NYY 5 BOS 2`, **never** `HOU 3–1`.

Apply this anywhere a series record and a game score can appear together.

## 6. Recap video: needs backend confirmation
- MLB's per-game content feed is believed to tag a **Game Recap** (and a **Condensed Game**) among each game's highlights.
- **Backend: confirm it's reliably identifiable** (keyword/type tag rather than a title match), then expose `recap: { id, url, duration } | null` per game.
- `null` renders `Recap not posted yet`. Recaps usually post an hour or more after the final out.
- This belongs with the clips collection in `handoff_video_clips/`: same `<video>` player, same fields.

## 7. Tokens used (from `holistic/shared.jsx`, `window.T`)
| Group | Tokens |
|---|---|
| Surfaces | `bg #f4f1ea`, `surface #fcfaf6`, `surfaceAlt #efeae0` |
| Text | `text/ink #15161a`, `textMuted #5c574f`, `textFaint #6f685f` |
| Lines | `border #cfc8b4`, `borderStrong #b4ae9b` |
| Accent (live only) | `accent #b8421e`, `accentSoft #fbe9dd` |
| Positive (winner row) | `positive #3a6330`, `positiveSoft #e6efd9` |
| Type | DM Sans for labels/prose; **JetBrains Mono + tabular-nums for every number** |

Radii: `T.r.sm`.

## 8. Assets
Team logos come from `TeamDot` (the existing MLB logo atom, which falls back to letter marks). No new assets.

## 9. Files
- `Home - Postseason.html`: the entry point (Season → Field set / Oct · DS).
- `holistic/bracket.jsx`: bracket, card types, connectors, mock `BRACKET` data.
- `holistic/series.jsx`: drawer, game rows, recap player, mock `SERIES` data.
- `holistic/home.jsx`, `home-data.jsx`, `shared.jsx`: context only (the Races → bracket swap is at `SEASON_STATES.postset/postds`).

**Not for port:** all mock data (teams, pitchers, notable lines, dates), and the placeholder video frame.
