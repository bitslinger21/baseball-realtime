# Half-inning transition — design pass on the shipped "Due Up" tile

**Status:** design signed off Sep 6, 2026. Ungated — no new API, no new endpoint.
**Supersedes:** the visual spec in `HANDOFF_due_up_tile.md` (the ad-hoc build's dashed-border
tile and equal-size batter rows). Everything in that document's *root cause* and *client logic*
sections still stands; only the presentation and the surrounding surfaces change.
**Design source of truth:** `holistic/game-v2.jsx` (copy included in this folder).
Open `review-game-v2.html` and toggle the dashed **"Mock: rewind to between innings"** pill.

---

## 1. What changed, in one line

The shipped tile fixed the stale batter in *one block* of the left card. The gap is a real
minute-plus window, and three other surfaces were still describing the at-bat that had ended —
so this pass makes the whole screen agree, and drops the tile's provisional styling.

---

## 2. Decisions (the four open questions in the incoming handoff, answered)

| Question | Decision |
|---|---|
| 1. Is dashed border + reused atoms the right treatment? | **No.** No dashed border, no tint, no nested panel. The cell keeps the card's own surface. Dashed reads "loading/broken"; this is a normal phase of baseball. |
| 2. The incoming pitcher | **Named.** The mound strip re-points at the pitcher for the incoming half — `Coming in · TEAM` when there is a change, `Returning · TEAM` when the same arm comes back out. Never the outgoing pitcher, dimmed. |
| 3. `MatchupContext`'s own "Due up" | **Gives up the slot.** Batters belong to the tile; two "who's up" lists a few inches apart, disagreeing, was the actual bug. That half becomes **Half just ended**. |
| 4. Scorecard-flip mode | **Out of scope.** It is an analysis view; nobody watches the scorecard waiting for first pitch. |

Two further decisions made during review:

- **Equal weight for all three batters.** An emphasised leadoff batter (bigger headshot + slash
  line, smaller rows 2 and 3) was built and rejected: reading order already says who is first,
  and shrinking the others made them look like a lesser class of information. All three carry the
  live batter's headshot size and identical content.
- **No component may change height between states.** See §6.

---

## 3. Spec by surface

All of this is inside the live game view. `gap` below = `isHalfInningTransition(latest)`,
i.e. `latest.outs === 3`.

### 3a. `MatchupLeft` — play-state eyebrow (already shipped, keep)
Inning/half arrow flips to the incoming half, bases clear, BALLS / STRIKES / OUTS all read 0.
Empty pip circles stay `textFaint` outline, empty bases `borderStrong` @ strokeWidth 2.

### 3b. `MatchupLeft` — strike zone
Zone renders with **no dots**. The pitch-type legend region is replaced by
*"No pitches yet this half"* (italic, `textFaint`) at the **same reserved height**, so the zone
does not move. The rewind context strip above the zone reads **BETWEEN INNINGS** with a hollow
`textFaint` ring in place of the rust live dot — same 30px height as the live/rewind strips.

### 3c. `MatchupLeft` — the Due Up tile (replaces the batter half)
Replaces the batter-identity block **and its stat rows** ("Today", the At-bats scorebook row,
"vs PITCHER"). Those all describe the batter who just made the out; leaving them is the same
staleness bug one level down.

- **One container.** `padding: 18`, the card's own surface — no tint, no border, no radius, no
  nested panel. The zone's `border-right` already separates the halves.
- **Header row:** team logo (`TeamDot`, 22) · `{team.short} due up` (14/700) · incoming half
  (`▼ 9th`, mono, right-aligned).
- **Three batter rows, identical treatment**, `gap: 14`:
  - `Headshot` at **68** — the same size as the live at-bat headshot, through the shared atom
    (portrait ratio, never a square).
  - `OrderSpot` + name at 18/700, links to the player page.
  - `{pos} · {hand} · {today}` — mono 11, `textMuted`, `white-space: nowrap`.
  - Slash line — mono 14/600, tabular-nums.
- **Footer:** *"Waiting for first pitch"* (italic 11.5, `textMuted`), pinned to the bottom.

### 3d. `MatchupContext` — mound strip
Same 56px strip, same three-column grid. In the gap:
- Eyebrow: `Coming in · TEAM` (a change is announced) or `Returning · TEAM` (same pitcher).
- **No pill on that row.** A pill is taller than the eyebrow text and grew the strip ~5px, which
  moved the card every time the gap opened. State the change in the right half instead.
- Right-hand numbers are that pitcher's line **so far**, and must stay **monotonic** across the
  break — the same pitcher cannot show fewer innings or pitches after the gap than during it.

### 3e. `MatchupContext` — left half
`This matchup` → **`Next matchup`**: the incoming half's leadoff batter vs the pitcher who will
face him, with Today and Career lines for that pair.

### 3f. `MatchupContext` — right half
`Due up` → **`Half just ended`**: team logo + `{Team} · {half}`, then
`Result` (plain-language, e.g. "Retired in order") · `Line` (`0 R · 0 H · 0 BB`) ·
`Pitches` (`11 · 3 batters`). All derivable from the existing play-by-play.
**When there IS a pitching change, the outgoing arm's final line goes here instead.**

### 3g. Pitch-by-pitch feed — pre-stage the coming at-bat
This is the surface the user is actually looking at, so a live-looking pinned batter here was the
most visible instance of the bug.

- Section title: `▼9 Between innings` (was the live batter's name).
- The pinned canvas does **not** keep the finished batter with a LIVE pill. It **pre-stages the
  at-bat we already know is coming**: inning marker + team dot, `OrderSpot`, the leadoff batter's
  name, `· leading off · 0-0`, and a soft **DUE UP** pill (never `tone="live"`).
- Body holds **only** the note *"Waiting for the first pitch of the {half}."* No box-score trio —
  the half's line lives in `Half just ended` (§3f).
- The canvas's rust accents drop to neutral (`surfaceAlt` background, `borderStrong` left rule)
  because nothing is live. The first pitch then simply fills the region already sitting there.
- **The batter named here MUST be the same batter the tile leads with.** One answer, two places.
- A retrospective "half over" panel was built here first and rejected: if we know who is coming,
  the feed should be ready for him rather than narrating what just finished.

### 3h. Leverage card
The situational sentence is at-bat-specific and goes stale. In the gap it reads
*"Between innings — recalculates on the first pitch of the next half."* in place of the
runners/outs description.

---

## 4. The due-up batters are a PROJECTION, not feed data

Important, and it is the one genuinely new idea in this pass.

Everything else in the live game view is *reported*: the feed says what happened. The moment the
third out lands, the next three names cannot come from the feed — they are derived by cycling the
lineup order forward (`deriveDueUpNext`). That makes the tile **the live game view's first
projected content**, and it will sometimes be wrong: a pinch hitter, a double switch, or a
pitcher's spot due up in a spot the manager will not use.

The app already has a vocabulary for this — the Upcoming tab's rotation-projected starters
(`StarterChip`, `ProjectionBanner`, dashed confidence ring, PR 9.6). **Decide whether the tile
borrows it.** Not designed here; the alternative is a projection that presents itself as fact.

---

## 5. Open question for the dev — is a mid-gap pitching change detectable?

§3d assumes we can tell, during the break, that a new arm is coming in. The incoming handoff says
the pitcher was not addressed at all, so this is unverified. If the feed only reveals the change
when the new pitcher throws, then:

- `Returning · TEAM` is the only branch that can ship now, and it is the common case anyway;
- `Coming in · TEAM` waits for a warming/announced signal.

Please confirm which, and say so in the PR — do not fabricate a change indicator.

---

## 6. Height lock (explicit user constraint)

**No component may change height between the live and gap states.** Two real offenders were found
and fixed in the design; both will recur in a naive port:

1. A pill next to the strip's eyebrow → strip grew ~5px. Removed.
2. `MatchupContext`'s bottom row is shorter in the gap than the live "Due up" → 8px, which shifted
   that card and everything below it, twice per half-inning. Pinned to the taller (live) height.

Verified in the design at 1600: pitcher strip 56/56, left card and page identical in both states,
`MatchupContext` 694.6/694.6. Please re-measure after the port rather than assuming.

This is the same class as the shipped fixed-height Scout zones — the layout must not jump when
zones pop in and out.

---

## 7. NOT for port

- **The `Mock: rewind to between innings` toggle and its caption.** Mock scaffolding. The app only
  moves forward: `outs === 3` opens the gap, the first pitch closes it. A static mock has no clock,
  so the toggle rewinds the same game to the break before the half now in progress — which is why
  the caption says so out loud.
- **The incoming-half PA filter** (`visiblePAs`). It exists because the mock is frozen mid-half and
  its feed therefore contains at-bats from a half the gap state claims has not started. On real
  data those plays do not exist yet, so the equivalent filter is a **no-op**. Do not implement it.
- **Mock data corrections** (listed in the README). They fix the design file's internal consistency;
  the app derives all of them from the feed and cannot drift the same way.

---

## 8. Out of scope, explicitly

- **Scorecard-flip mode** during the gap — untouched, undesigned (decision §2.4).
- **Scout mode** (`game-scout.jsx`) — needs the same treatment, not designed.
- **Pregame band** — unrelated, still on its old three-zone form.
- A half-inning **break divider in the feed** — considered and dropped in favour of pre-staging
  (§3g). If the pre-staged canvas ships and still feels abrupt, that is the next thing to try.
