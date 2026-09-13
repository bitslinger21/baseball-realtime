# PROMPT — Team page, Transactions tab

**rev 1 · written Sep 13, 2026 · design SIGNED OFF Sep 13, 2026**
⚠️ **GATED ON NEW API** — needs a club transactions feed (§6). The layout can be built
against the mock shape, but nothing ships until the feed exists.

---

## 1. Scope

A **third tab** on the team page: `Overview · Schedule · Transactions`.

**Team-level, not player-level.** A single player's moves are already served by the
player view's History tab, and a league-wide firehose needs filtering before it is
useful — so the club's own ledger is the one worth building.

Design file: `Team Page - Transactions.html`. It is hand-built static HTML (like the
other two team pages), not the shared React atoms — in the app it uses the real
`BrandHeader` / hero / `.ttabs` components.

---

## 2. The ledger

**A dated ledger, not a stack of cards.** Two columns:

```
┌──────────┬──────────────────────────────────────────────────────────────┐
│ Sep 11   │  +  [📷]  Jose Altuve                            ( INJURY ) │
│ FRIDAY   │           2B · #27                                          │
│          │           Activated from the 10-day injured list. …         │
│          │  −  [📷]  Shay Whitcomb                          ( ROSTER ) │
│          │           INF · #75                                         │
│          │           Optioned to Triple-A Sugar Land …                 │
├──────────┼──────────────────────────────────────────────────────────────┤
│ Sep 8    │  …                                                          │
```

- **Date gutter: `122px`, sticky** (`top: 74px`, below the app bar). Date in mono
  13/700, day-of-week beneath it in 11px uppercase muted.
- **One heading per DAY**, not per row. A five-move deadline day must read as one
  event, not five unrelated ones.
- Row grid: `18px (direction) · 30px (headshot) · 1fr (body) · auto (tag)`, `12px` gap.
  Day rows separated by a `#e0dccd` hairline; row hover lifts to `surface`.
- Headshots go through the standard portrait treatment (30×38, `object-position:
  center top`) — the global no-chin-clipping rule.
- Body: name (linked to the player page, 14.5/700) · `POS · #number` eyebrow ·
  one sentence of description at 13.5px, with the operative phrase in `<b>` ink
  ("**10-day injured list**", "**Designated for assignment**") and any date or
  count in mono.

### Direction is the leftmost column

`+` in `positive` green = the move **adds** a player to the active roster.
`−` in `textFaint` = it **removes** one. Mono, 15px, `title` attribute for the
tooltip. Legend in the page footer.

This is the first thing anyone asks of a transaction, so it gets a column and a
colour rather than being buried in the sentence. For organisation-level moves
(a minor-league signing, a prospect traded away) the same glyph reads as
in/out of the organisation — the tooltip says which.

### Type tag

Right-aligned pill. **The colour is carried by the whole chip** — tinted ground,
matching border, type-coloured text:

| Type | Ground | Border | Text |
|---|---|---|---|
| Injury | `#fbf3df` | `#e6d3a1` | `#7a5c0e` (`highlightText`) |
| Trade | `#e9edf5` | `#bcc8dd` | `#2c4a78` (`info`) |
| Signing | `#eaf1e6` | `#c0d3b6` | `#3f6b34` (`positive`) |
| Roster | `#efeae0` (neutral) | `#cfc8b4` | `#5c574f` (`textMuted`) |

**Roster stays the neutral chip on purpose** — it is the most common and least
newsworthy type, so it is the baseline the other three read as departures from.

> **Iterated:** the first version was four identical neutral chips differentiated
> only by a 6px coloured dot. Rejected in review — not enough difference to read
> from the side of the page. Don't reintroduce the dot.

Gold is `highlightText`, never raw `highlight`, per the contrast pass.

### League-calendar marker

The **trade deadline** is drawn as a rule across the ledger, brand diamond on the
left, `Trade deadline · Jul 31, 5:00 PM CT` in 11.5px uppercase muted. A deadline
is not a transaction — it is the reason for the five moves above it. Same treatment
would suit other calendar events (Opening Day, 40-man roster deadline, waiver
expiry) if you have the dates.

---

## 3. Hero stats are tab-specific

Same posture as `PageTitle`'s `right` slot: each team tab's hero stats describe
**that tab's** subject. Transactions shows the standing state the ledger produces:

| Active roster | 40-man | On the IL | Moves |
|---|---|---|---|
| `26` / of 26 | `39` / 1 open | `4` (gold) / 1 on 60-day | `11` / in September |

Overview keeps Record / Division / Run diff / Streak; Schedule keeps
Record / Home / Away / Remaining. Nothing else in the hero changes.

---

## 4. Controls

Same `.bar` as the Schedule tab: filter left, month jump right.

- **Filter:** `All · Injuries · Roster · Trades & signings` (segmented).
  Note it is **three** buttons over four types — trades and signings share one,
  because "the club acquired someone" is one question.
- **Month jump:** `SEP AUG JUL JUN MAY APR MAR`, mono 11px, current month in ink.
  Anchors to the first day-group of each month.

**Filtering cascades.** Hide the rows, then hide any day-group left with nothing
under it, **and hide the deadline marker** on any filter but All. A dangling date
heading with no moves beneath it reads as a data error. An all-empty result shows
one line: "No moves of this type this season."

---

## 5. Footer

`34 moves · 2026 season · + joins the active roster, − leaves it` — the count and
the direction legend, muted 12px.

---

## 6. Data — what this needs

**All ledger content in the design file is MOCK** and marked as such in a comment.
Do not port any of it.

Needed: a **club transactions feed**, one entry per move, assumed shape:

```
{ date,                       // ISO date; grouped by day in the UI
  type,                       // 'injury' | 'roster' | 'deal'
  direction,                  // 'in' | 'out' | 'none'
  player: { name, mlbId, pos, number },
  description }               // ONE sentence, prose
```

Notes on the shape:

- `type` drives the tag; `deal` splits into the Trade / Signing tags. If the feed
  distinguishes them, pass the finer value; if not, a trade has a counterparty club
  and a signing does not.
- `direction` must be **derivable, not guessed**. If the feed only gives a move
  string, map it server-side (activated/recalled/selected/acquired/signed → `in`;
  placed on IL/optioned/DFA'd/released/traded away → `out`) and send the resolved
  value, so the client never parses English.
- `description` is one sentence, already written. The design's rhythm depends on it
  being one sentence — a paragraph breaks the row.
- `mlbId` is required: every name links to the player page.
- The hero counts (active / 40-man / IL / moves this month) are a separate small
  roster-state query, not derivable from the ledger alone.

---

## 7. Acceptance

- [ ] Third tab present on all three team pages; the strip matches on each.
- [ ] Date gutter is sticky under the app bar while its day's rows scroll past.
- [ ] A multi-move day shows ONE date heading.
- [ ] `+` is green, `−` is muted, and the footer legend says which is which.
- [ ] The four type chips are told apart **without reading the label** — tinted grounds, not dots.
- [ ] Filtering to Injuries leaves no empty day headings and no deadline marker.
- [ ] Every player name navigates to that player's page.
- [ ] At 820px the ledger stacks to one column with the date inline above its rows.

---

## 8. Not designed

Pagination or lazy-load beyond one season · a season picker (the page is 2026 only) ·
minor-league-only moves as a separate stream · mobile beyond the 820px single-column
stack · whether calendar markers other than the deadline appear.
