# Video clips: game page, replay, Home Following

**Rev 1 · Sep 26, 2026** (incl. backend/API requirements, §6). Design source of truth: the files in this folder (same paths as the design project).
Open `Clips - Options.html` for the game-page pieces and `Home - Following with Clips.html` for Home.
**Mock data only.** No real mp4s are loaded; each player shows a "Video plays here" frame.

---

## 1. The clip record (what the feed gives us)

Each clip arrives with:

| Field | Example | Use |
|---|---|---|
| title / headline | `Connor Wong's go-ahead double` | **The clip's name everywhere**: Following video layer, clip lists, the heading above/beside the player |
| blurb | (same text as title) | **Ignore.** It duplicates the title in every sample checked |
| description | `Connor Wong lines a go-ahead double to left field to give the Red Sox a 4-3 lead in the bottom of the 7th inning` | **Only in the player** (under or beside the video). Too long for any card |
| duration | `00:00:30` | Display as `0:30` (drop zero hours and the leading zero; `00:01:05` → `1:05`), mono + tabular-nums |
| mp4 URL | | `<video src controls playsInline preload="metadata">` |

**Must confirm with the feed:** what links a clip to its **play / at-bat**. Every surface below attaches a clip
to an at-bat. If there's no play id, matching on inning + batter + event is the fallback. Flag it before
building rather than guessing.
**Thumbnail:** none supplied. Use the file's own frame: `src + '#t=1'`, `preload="metadata"`, muted.
The mock's fallback (ink tile + result code + faint team logo) is for when the frame can't load.

**Not every play has a clip.** Every affordance below renders **only when a clip exists**. No disabled
buttons, no empty slots.

---

## 2. Game page

### 2a. Watch button on finished at-bats (APPROVED)
- In the at-bat list ("Earlier at-bats"), a finished at-bat with a clip gets `▶ Watch 0:42` at the right end
  of its line, before the expand chevron (`WatchButton` in `clips.jsx`).
- Neutral at rest (surface, `borderStrong` outline), ink on hover. While that clip plays it reads `Playing`.
- Clicking it does NOT expand the at-bat (`stopPropagation`).

### 2b. Scorecard mark (APPROVED)
- A box whose play has a clip gets a small ink tab **bottom-left**: 22×14, 3px radius, white ▶, with a
  **2px ring in the box's own background colour** (`box-shadow: 0 0 0 2px var(--surface)`) so it never touches a line.
- Tapping it plays the clip. The scorecard is a pan/zoom surface, so treat a pointer-up that moved **less
  than 5px** as a tap and read `data-clip-pa` from the element under it. A drag must never play a clip.
- Code: `scorebook-cell.js` (search "Clip mark") + the `onPointerUp` wrapper in `PitchByPitchV2`.

### 2c. Where the video plays: the at-bat list box (CHOSEN: option 3)
- The clip **covers the content region of the at-bat list box**, the same region the scorecard slides into.
  The box's header row (inning · batter · transport · Scorecard) and the timeline stay put and live.
- Bar across the top of the region: `← At-bats` (returns) · clip title (one line, ellipsis) · `‹ 2 of 6 ›`
  (steps through this game's clips). Video fills the rest, black ground, `object-fit: contain`.
- Show the **description** in this bar's tooltip or under the video. Space is tight, so your call, but never on a card.
- Esc closes. Closing returns the box exactly as it was (scroll position, expanded at-bat).
- Code: `ClipInPlace` (`clips.jsx`) mounted through `PitchByPitchV2`'s `inPlace` prop.
- Options 1 (on top of the page) and 2 (panel from the right) are in the options file for reference.
  **Don't port them for the game page.**

### 2d. Highlights row, at the BOTTOM of the page
- Last thing on the game page, **below** win probability + leverage. Those describe the moment you're
  watching; highlights look back, and recent plays already have Watch buttons.
- Card: `Highlights · this game` + `6 clips · latest first`. Horizontal row of 232px cards (thumbnail with
  duration, `▲8 · HR`, team logo, name, title clamped to 2 lines).
- Scrolls sideways only when it overflows, with the shared `EdgeButton` arrows revealed on hover.
- Clicking a card plays it in the at-bat list box (2c) and scrolls the page up to that box.
- Code: `GameHighlightsRow`.
- ⚠️ **Open:** the user asked for Following clips in **game order** (inning 1 → end). This row is currently
  **latest first**. Confirm with the user which order the game-page row uses before building.

### 2e. Replay mode: only plays the marker has passed
- In replay (the play-head/timeline view), a clip is offered **only once the marker has passed the end of
  its at-bat**. With the marker at ▼3rd, a 9th-inning walk-off clip must not appear anywhere.
- Row header reads `N clips · through ▼3rd`. As the marker advances, clips join when each play finishes.
  Rewinding removes them again.
- Zero clips → the row stays, with one line: `No clips yet — nothing through ▼1st has one. They appear here
  as the marker passes each play.`
- Opening a clip **pauses** playback.
- Code: `SCOUT_CLIPS` + `clipsSoFar` in `game-scout.jsx`. (In the design, replay opens clips on top of the
  page. Use the at-bat list box like the live view, since option 3 is chosen.)
- ⚠️ **Gap:** the Watch button (2a) isn't wired into the replay feed in the design. Same rule applies:
  a button appears once the marker passes that at-bat.

---

## 3. Home: Following cards

This section carries **two** changes. Only the second needs clip data.

### 3a. Following card redesign (no clip data needed)
Built in `Home - Following with Clips.html` only; **`Home.html` is unchanged in the design**. Port to the real Home.

- **Every layer is three lines at a fixed height** (so cycling never moves the list):
  1. `Name · LABEL` (label = `TODAY` / `SEASON` / `NEXT GAME` / `VIDEO`, 11px caps, muted, `VIDEO` in ink)
  2. content line (mono)
  3. content line (mono, muted)
- Examples:
  - `Aaron Judge · TODAY` / `3-for-4 · 3 HR · 5 RBI` / `@ TOR · ▲8th · NYY 7–2`
  - `Aaron Judge · SEASON` / `.329 · 47 HR · 118 RBI` / `.452 OBP · .688 SLG`
- **Off day says so:** `Shohei Ohtani · TODAY` / `No game today` / `Next: Sat vs SFG · 4:05`, then SEASON.
  Teams the same. *This changes the earlier rule, where an idle follow led with the season line.*
- **Layer counter `1/5`** at the right end of line 1, mono, muted, on any card with more than one layer.
  It updates as you step. There is **no ▶ mark** (the counter replaced it).
- **Previous AND next edge buttons**, left and right edges, 24px, wrapping both ways.
  - **Each appears only when the pointer is ON its own strip**, not on card hover (`EdgeButton self`).
  - The card reserves 34px of left padding for the left strip.
- Faces data shape: `[{ label, lines: [line2, line3] }]` (`FOLLOW_FACES` in `clips.jsx` is the mock).

### 3b. Video layers
- **One layer per clip**, placed right after the first layer (clips are today's), in **game order: inning 1 → end**.
  Judge with 3 clips: TODAY → VIDEO ×3 → SEASON (`1/5` … `5/5`).
- Video layer: line 1 `Name · VIDEO`; lines 2–3 have a 22px ink round play button spanning both, then:
  - line 2 = **clip title** (`Judge's third homer of the night`). Now that titles exist, use the title here
    instead of the design's play-derived text. It already names the player, so team cards need no prefix.
  - line 3 = `▲7th · NYY 7–2 · 0:41` (half-inning ordinal · score after the play · duration)
- Play button → clip **on top of Home** (option 1 is correct here, since Home has no at-bat list).
  - The player shows the title and description.
  - The side list is headed `Aaron Judge · today` and holds that card's clips in game order.
  - A **live strip** above the video (LIVE · half · score · situation) keeps updating while it plays.
  - Esc / ✕ / backdrop close. Clicking the card elsewhere still opens the player/team page.
- **Teams get video layers too**: every clip from today whose **subject player is on that team**, including players you don't follow. The opponent's highlights don't appear on your team's card.
- **The same clip may appear on a player card AND his team's card.** Allowed by decision; no de-duplication.
- Code: `RailRow` (`home.jsx`), `HomeClipsDemo` + `FOLLOW_CLIPS` (`clips.jsx`), `ClipOverlay`.

---

## 4. Scorecard fix (ship with this PR, independent of clips)

Hit lines to 1st/3rd now run **parallel to the baselines**. The home dot and every hit line's start moved from
`(50, 90)` to **`(50, 85.76)`**. The old point sat at the square's sharp corner, below the rounded
home plate, which skewed the line. Two edits in `scorebook-cell.js`: the `<circle cx="50" cy="85.76">` in
`SCOREBOOK_FIELD_SVG`, and `HOME = [50, 85.76]` in the hit-path code. Applies to every scorecard.

---

## 5. Not in this PR

- **Highlights page** (all of today's games, grouped by game, reached from a `Scores / Highlights` switch under
  Games). It's in the options file, but **not signed off**.
- Clips on the player page (Overview/tab). Not designed.
- Autoplay-next, captions, sharing, download. Not designed.

---

## 6. Backend / API requirements

The client needs **no video processing**. It plays an mp4 URL and reads the fields below. Everything else
is a join the backend does once, at ingest, not per request.

### 6a. Ingest job
- **Source:** the clip feed the user checked, which supplies title, blurb, description, duration and media.
  Run it as a **batch/cached job**, not a per-request pass-through (same posture as the Statcast ingest).
- **Cadence:** poll each **live** game every ~60s, since clips usually land a few minutes after the play.
  Poll **final** games a few more times for late clips, then stop.
- **Choose ONE playback URL per clip:** an **mp4** rendition (the `<video>` tag needs mp4/H.264).
  Prefer ~720p, fall back to the highest available mp4. Skip streaming-only formats (HLS `.m3u8`) unless
  we add a player library, which isn't in scope.
- **Normalise duration** `00:00:30` → `durationSec: 30` (integer). The client formats it for display.
- **Drop `blurb`** when it equals `title` (every sample so far). Keep it only if it ever differs.
- **Link each clip to its play (required).** Store the game id + **at-bat index** (the same play/at-bat
  identifier the play-by-play feed already uses: the id on the at-bat rows, the scorecard boxes, the
  replay marker).
  - Use a play id if the source provides one.
  - Otherwise match on game + inning + half + batter + event type, and **log unmatched clips** rather
    than attaching them to a guessed play.
  - A clip with no play still shows in the Highlights row, but gets no Watch button and no scorecard mark.
- **Tag the subject player(s) and their team** (batter for hits/HRs, pitcher for strikeouts, fielder for
  defensive plays) from the source's player tags, falling back to the linked play's batter.
  This drives the Following layers (6c).
- Stable **clip id** (the source's id). Upsert on it, so re-polls never duplicate.

### 6b. Clip object (returned by every endpoint)
```json
{
  "id": "src-clip-id",
  "gameId": "824164",
  "atBatIndex": 57,               // null if unmatched (6a)
  "inning": 7, "half": "bottom",
  "title": "Connor Wong's go-ahead double",
  "description": "Connor Wong lines a go-ahead double to left field to give the Red Sox a 4-3 lead in the bottom of the 7th inning",
  "durationSec": 30,
  "mp4Url": "https://…/clip_720p.mp4",
  "thumbnailUrl": null,            // if the source ever supplies one; else the client uses the video frame
  "players": [{ "id": 657136, "teamId": 111, "role": "batter" }],
  "scoreAfter": { "away": 3, "home": 4 },   // from the linked play; drives "BOS 4–3" on cards
  "publishedAt": "2026-09-26T23:41:07Z"
}
```

### 6c. Endpoints
| Endpoint | Used by | Notes |
|---|---|---|
| `GET /games/{gameId}/clips` | Game page: Watch buttons, scorecard marks, Highlights row, the in-box player | All clips for the game, **ordered by at-bat index**. The client filters to the replay marker (`atBatIndex <= marker's at-bat`), so replay needs no extra endpoint. Live games: the client re-fetches on each play update or every 60s, whichever is first. |
| `GET /clips/following?players=…&teams=…&date=today` | Home Following video layers + the on-top player | Returns `{ [entityKey]: Clip[] }`, **each list in game order** (inning, then at-bat index). A clip appears under **every** matching key (player AND team). The same clip under two keys is intended. |
| `GET /games/{gameId}/live-strip` *(or reuse the existing live game payload)* | The live strip above the on-top player | half-inning, score, outs, runners, current batter + count. Probably already served by the scoreboard/live feed. Only list it as new if it isn't. |

- **Errors:** an endpoint that fails returns an empty list, never an error the page must handle. Clips are
  additive: no clips = today's page, unchanged.
- **Empty state is normal.** Most at-bats have no clip. Don't pad, and don't return placeholders.
- **Rights:** personal/private deployment (same posture as the Statcast decision). Don't re-host or
  transcode files. Store the URL and let the client stream it.

### 6d. Following card data that isn't clips (3a)
Most of this is already served for Home. Listed so nothing is assumed:
- **TODAY:** today's batting or pitching line + game context (opponent, half-inning, score) while live or
  final; tonight's start time + **probable pitchers** when scheduled; a flag for **no game today**.
- **SEASON:** slash line + HR/RBI (hitters) or W–L / ERA / K / WHIP (pitchers); team record, division
  place, games back.
- **NEXT GAME:** date, opponent, time, and probables when known (the "No game today" layer's second line).

---

## 7. Acceptance

1. A finished at-bat with a clip shows `▶ Watch m:ss`; one without shows nothing.
2. Watch → the clip plays inside the at-bat list box; header + timeline still update live; `← At-bats` restores the list exactly.
3. Scorecard: a box with a clip shows the bottom-left tab with a visible halo; tap plays, drag pans (never plays).
4. Highlights row is the last card on the game page; hidden-overflow arrows appear only when it overflows.
5. Replay at ▼3rd: no clip from after the ▼3rd appears anywhere; stepping forward adds clips; rewinding removes them.
6. Durations: `00:00:30` → `0:30`, `00:01:05` → `1:05`, mono.
7. Following: every card is 3 lines, same height across all layers; counter correct; each edge button only on its own hover.
8. Judge's video layers run ▲1st → ▲5th → ▲7th; titles on line 2; play opens them on top of Home with a live strip.
9. A clip of a followed player on a followed team appears on both cards.
10. Ohtani on an off day: `TODAY / No game today / Next: …`.
11. Hit lines from home to 1st/3rd are parallel to the baselines; the home dot sits where they start.
12. Backend: a re-poll never duplicates a clip; an unmatched clip is logged and appears in the Highlights row only; a clip endpoint that fails leaves the page exactly as it is without clips.
