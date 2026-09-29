# Postseason bracket on Home + series drawer

**Rev 1 · Sep 29, 2026.** Net-new UI. The bracket isn't gated. The drawer's recap button is gated on backend confirming a recap video id (§5). Everything else uses schedule + box-score data the app already has.

Full spec: `README.md` in this folder. Design reference: `Home - Postseason.html` (Season → **Field set** / **Oct · DS**), `holistic/bracket.jsx`, `holistic/series.jsx`. **Port the layout values verbatim; don't reinterpret them.**

## 1. When the bracket shows
On Home, the **Races** section is replaced by the bracket once **all 12 postseason spots are clinched**. That's a condition, not a date. It uses the same slot at full width, and the chases/wild-card race go away. Before that point, Races is unchanged.

## 2. Build `PlayoffBracket`
- Seven rounds in one flex row: AL WC · ALDS · ALCS · WS · NLCS · NLDS · NL WC. It sits inside a horizontal scroller with `padding-bottom:16px` (so the scrollbar never covers a card), `min-width:980px`, and `padding: 0 32px`.
- **Each round is exactly as wide as its widest card.** The gaps between rounds are `flex:1; min-width:44px` spacers, so every gap is the same width. The spacers draw the connectors.
- Round header: centred over its cards, **two lines**. Line 1 is the name (uppercase, 11.5/700); line 2 is `Best of N` (Mono 11, muted).
- Three card types (README §1 has exact sizes and type):
  - **Current, 150×92, every one the same width.** Two team rows: seed · logo · abbreviation · series wins. Footer, centred vertically:
    - line 1: `Game {n} of {bestOf} @ {HOST}`
    - line 2: `Wed 10/07 7:08`, or, when live, `● LIVE · ▼6 HOU 3 CLE 1`
    - **No stakes copy, no probables.**
  - **Finished, 58 wide.** Logo + wins **right-aligned**. **Winner first**, on a `T.positiveSoft` row with its number in `T.positive` 700. The loser is **not faded**.
  - **Upcoming, 84 wide.** Each side is a logo, a `logo / logo` pair, or a word (`AL champ`), then a date row. **No empty placeholder circles.** Not clickable.
- Connectors: **one colour, 1.5px `T.borderStrong`**. They don't change colour when a series ends.
  - Wild Card → DS: straight lines.
  - DS → CS: an elbow (vertical line in the middle of the gap).
  - CS → WS: straight.
  - A card narrower than its round (e.g. a finished card in a round that also has a current one) gets stubs out to the round's edges, so the lines always reach it.
- Followed team: a 2px `T.ink` bar on the left edge of its row.

## 3. Build `SeriesDrawer`
- **Opens from** Current and Finished cards.
- **Panel:** right side, 420px wide, dim backdrop. Slides in over 0.24s; closes with ✕, Esc, or a backdrop click. It's the same gesture as the Lineups panel, so reuse that implementation if it's shared.
- **Top:** round + `Best of N`; logo · `2 – 1` · logo; then a status sentence (`Yankees lead 2–1` / `Series tied 1–1` / `Phillies won 3–1`).
- **One row per game, in order:**
  - **Final:**
    - score line: each side = logo + abbreviation + runs; winner bold and listed first; `F/10` for extra innings
    - `W · L · SV` pitchers (SV only when there is one)
    - one notable line
    - **Recap** button (▶ + duration)
  - **Live:** `T.accentSoft` background, LIVE + inning + score + situation, and an `Open game →` link to the live view.
  - **Scheduled:** date + time + probables (or `Probables not announced`).
  - **If necessary:** date + `If necessary`.
- **Recap:**
  - It plays in a 16:9 `<video>` inside that game's row, with native controls.
  - It **slides down/up**: `grid-template-rows` goes `0fr ↔ 1fr` over 0.28s `cubic-bezier(.22,.61,.36,1)`, with the inner wrapper at `min-height:0; overflow:hidden`. Keep it mounted so the close animates too.
  - One recap open at a time.
  - No recap yet → the button becomes the text `Recap not posted yet`.

## 4. Score-formatting rule (applies everywhere)
- **A dash means a series:** `2–1`, `BOS won 2–0`.
- **A game score pairs each team with its own runs:** `HOU 3 CLE 1`. **Never** write a game score as `3–1` next to a series record.

## 5. Data / backend
- **Per series:** round, bestOf, seeds, teams, wins.
- **Per game:**
  - game number, date + time, host
  - state: `final | live | scheduled | ifNecessary`
  - runs per side, extra innings
  - W/L/SV pitcher names
  - live: inning + outs/runners sentence
  - scheduled: probables
- **Notable line:** computed server-side from the box score with a simple rule: multi-HR > HR + RBI > 3+ hits > pitcher with ≥7 IP or ≥10 K. If nothing qualifies, **omit it**; no filler.
- **⚠️ Recap id: confirm first.** MLB's per-game content feed is believed to tag a "Game Recap" video among each game's highlights.
  - Confirm it's identifiable by **type/keyword tag**, not by matching the title.
  - Then expose `recap: { id, url, duration } | null` per final game.
  - Until then, ship the drawer with every recap `null`: the "not posted yet" state.
  - This shares the `<video>` player and clip fields with `handoff_video_clips/`.

## Not for port
All mock data in `BRACKET` / `SERIES` (pitchers, notable lines, dates, durations), the placeholder video frame, and the `${hi}-${lo}` series-id convention. Use the real series id.

## Acceptance
1. Home shows the bracket instead of Races once all 12 spots are clinched, and not before.
2. All current cards are the same width. The gaps between rounds are equal, and cards are centred under their two-line headers.
3. Finished cards: winner first on pale green, counts right-aligned, loser not faded.
4. Upcoming cards: logos or logo pairs + a date, no empty circles.
5. Connectors are one colour and touch every card, including a narrow card in a wide round and both sides of the WS card.
6. The live footer reads `LIVE · ▼6 HOU 3 CLE 1`. No game score anywhere uses a dash.
7. Clicking a current or finished card opens the drawer with the correct games. Esc, ✕ and a backdrop click all close it.
8. Recap slides open and closed. A game without a recap shows `Recap not posted yet`.
9. The horizontal scrollbar never covers a card at narrow widths.
