# Highlights page: all of a day's clips, grouped by game

**Rev 1 · Sep 30, 2026.** Net-new page. It's **gated on the clips ingest** in `handoff_video_clips/` (PROMPT §6), and needs **one new endpoint** (§5 below). Build it after, or with, the video-clips PR, because it reuses that PR's clip card, thumbnail, `<video>` player and on-top player.

Design reference: `Clips - Options.html` → the **Highlights page** artboards. Code: `HighlightsPage` + `HL_GAMES` in `holistic/clips.jsx`. Port the values verbatim.

## 1. Where it lives (no new nav item)
- It's a **second view of Games**, not a new top-nav entry. The header's active nav item stays **Games**.
- It's reached from a **`Scores | Highlights` segmented switch**, left-aligned, at the top of the content column.
  - Add the same switch to **Today's games**, with `Scores` active there.
  - The two views share one date, so switching views keeps the date.
- Give it its own URL, e.g. `/games/highlights?date=2026-05-24`, so back/forward and sharing work.

## 2. Page layout (1240 max column, 28px side padding)
- `BrandHeader active="games"`.
- **PageTitle** `Highlights`. The subtitle reads `Sun May 24 · 4 games · 11 clips`, with the counts in Mono.
- **Date control** on the right of the title, the same as Today's games: `‹ Prev` · `Sun May 24` (Mono 12.5/700) · `Next ›` · `Today`. Buttons are 30px pills, 1px `T.border`, DM Sans 12/700.
- Then, with a 16px gap between items: the switch, then **one card per game**.

### Game card (`Card padless`)
**Header row:** `T.surfaceAlt`, padding 12 18, bottom border, flex, gap 12.
- away `TeamDot` 22 · `HOU 8` · `–` · `5 CHC` · home `TeamDot` 22. Mono 15/700; the leader is `T.text`, the trailer `T.textMuted`.
  - ⚠️ **Score format is pending a decision** (the score-rule question: should it read `HOU 8 CHC 5` app-wide?). Build it to match the rest of the app's game scores. If the rule is extended, this header changes with everything else.
- State: `LivePill` + half-inning (`▼9`, Mono 12.5/700 muted), or a soft `Final` pill.
- Pushed right: `N clips` (Mono 11.5 muted), then `Open game →` (DM Sans 13/700), which goes to that game's game view.

**Body:** a grid of `repeat(4, minmax(0,1fr))`, gap 18, padding 16 18 18. It wraps to more rows; **no inner scroll, no truncation to N**.
- Each cell is the existing **`ClipCard`**: 16:9 thumbnail with the duration; `▼9 · 1B` + team dot; player name 14/700; the clip's title, 2-line clamp.
- Order within a game: **newest first**, the same as the game page's Highlights row.

**Game order:**
1. Live games first.
2. Then finals, by start time.
3. Scheduled games with no clips yet are **left out**. No empty cards.

## 3. Playing a clip
- Clicking a card opens the **on-top player** (`ClipOverlay`, option 1). This page has no at-bat box to play inside, which is why it differs from the game page.
- **Layout:**
  - dim backdrop `rgba(21,22,26,.74)`
  - panel 96px from the top, `min(1240px, 100% − 64px)` wide
  - grid of video column + 340px list column
- **Live game:** a thin ink strip across the top of the video column: `LIVE ▼9 HOU 8 CHC 5 · note`. It keeps updating while you watch.
- **List column:** **that game's** clips only (`More from this game · N`). Picking one swaps the video.
- **Close:** ✕, Esc, or a backdrop click.
- Same component as Home's Following player. Build it once.

## 4. States
- **No clips for the day** (off day, or before first pitch): the switch, then one quiet line: `No highlights yet for Sun May 24`. The page title keeps the date.
- **A clip with no play link** (unmatched in ingest): it still shows here. Its card uses the clip's inning if known; otherwise it goes last, with no inning label.
- **Endpoint failure:** treated as no clips (the same "clips are additive" rule as the clips PR). Never an error screen.
- **Live games:** re-fetch every 60s while any game on the page is live.

## 5. Backend
**New endpoint:** `GET /clips?date=YYYY-MM-DD` → `[{ gameId, away, home, score, state, half, clips: Clip[] }]`.
- `Clip` = the object from `handoff_video_clips/PROMPT_video_clips.md` §6b; nothing new on it.
- Games are ordered by §2's rule. Each `clips` list is newest first (at-bat index descending, unmatched clips last).
- Game header data (score, state, half) can come from the existing scoreboard payload if it's easier to join on the client.
- **Past dates:** the same endpoint. Clips stay available for as long as the source keeps them; don't re-host them.

## Not for port
`HL_GAMES` mock data, the placeholder video frame, and the static Prev/Next buttons in the mock.

## Acceptance
1. The Games nav stays active. `Scores | Highlights` shows on both views, and switching keeps the date.
2. Prev / Next / Today move the date, and the URL follows.
3. One card per game with clips: live games first, then finals by start time; games without clips are left out.
4. Clips sit in a 4-column grid that wraps, newest first, with nothing cut off.
5. Clicking a clip opens the on-top player with that game's clips in the list. The live strip updates, and ✕ / Esc / backdrop close it.
6. A day with no clips shows the one quiet line.
7. An endpoint failure looks the same as no clips.
