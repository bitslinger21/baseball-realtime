# Port — Bullpen status &amp; Injuries cards (Team page · Overview)

**Rev 1 · cut Sep 12, 2026.** Frozen. If the design changes, a new dated folder supersedes
this one — do not patch this file.

Design source: `Team Page - Overview v2.html` (right-hand `.rstack` column, bottom two
cards). Edge states: `Team Page - Bullpen and Injuries states.html`.

**Port order:** after `handoff_2026-09-10_consistency/` (it introduces the win/loss chip
colours both cards use) and independent of `handoff_2026-09-11_season_pulse/`.

---

## 1. What this replaces

Two placeholder cards on the team Overview page:

- `Bullpen status` — placeholder text, no data
- `Injuries & roster moves` — placeholder text, no data

Both are now designed. **Neither is gated on Statcast.** Both are computable from feeds the
app already ingests, plus one new endpoint for transactions.

**The title changes:** `Injuries & roster moves` → **`Injuries`**. Roster moves moved behind
the `All transactions →` link (decision below).

---

## 2. Bullpen status

### Shape: a per-pitcher list, not aggregate counts

The placeholder was four counts (Available / Used yesterday / Back-to-back / Over 20 pitches).
**Rejected.** "7 available" does not tell a reader *which* arms, and the name is the thing they
act on — the difference between seven available relievers with the closer among them and seven
without is the whole question. The card is taller as a result; it lives in the stacked right
column, which has the room.

Row anatomy, one per reliever:

```
Josh Hader                              [ READY ]
LHP · Closer · rested 2 days
```

- **Name** — 13px/600, links to the player page (`mlbId`).
- **Meta** — `{throws} · {role, if any} · {evidence}`. Role is only shown where the club has
  a defined one (Closer, Setup); most arms have none and the segment is omitted, not padded.
- **Chip** — the verdict. The meta line is the evidence *behind* the verdict, so the rule is
  never a black box.

### The availability rule (settled)

> **Unavailable = pitched on consecutive days, OR 25+ pitches across the last two days.**

Either condition is sufficient. Three states:

| Chip | Class | When | Evidence copy |
|---|---|---|---|
| `Ready` | `.bp-s.rdy` | No appearance in 2+ days | `rested N days` |
| `Available` | `.bp-s.av` | Pitched yesterday only, under the pitch threshold | `threw N p yesterday` |
| `Rest` | `.bp-s.un` | Either unavailable condition met | `back-to-back days` or `N p over 2 days` |

The chip reads **`Rest`**, not `Unavailable` — it is a three-character-shorter word that says
the same thing and does not shout. The group label above those rows carries the word
`Unavailable`.

`Ready` and `Rest` use the app's ONE win/loss colour pair (`#cce7a4`/`#3a6330` and
`#f4bdb5`/`#8a2721`); `Available` uses the neutral surface. Do not introduce a fourth colour.

### Sort and grouping

Available arms first (Ready, then Available), then a hairline `Unavailable` group label, then
the resting arms. **The order never changes**, so the top of the card is always the answer to
"who can pitch tonight".

When nobody is unavailable, **drop the group label entirely** — a label over no rows reads as
a loading failure. See the states file.

### Header and footer

- Header note: `5 of 8 available` (mono numerals). No action link — there is no bullpen-usage
  page designed yet. Do not invent one.
- Footer: the rule, stated. `Unavailable = pitched on consecutive days, or 25+ pitches in the
  last two. Starters and injured arms are not listed.` This is what makes an all-green column
  trustworthy, and it is the only place the threshold is written down for the reader.

### Who is in the list

Active-roster pitchers **minus the starting rotation minus anyone on the IL**. The rotation
exclusion needs a reliever/starter determination — if the app has no role field, derive it
(appearances where the pitcher recorded the first out of the game, over the last ~30 days).
Flag this if it is harder than it sounds; a wrong list is worse than a late card.

### Data required

Per active reliever, over a 3-day window:

| Field | Source |
|---|---|
| `mlbId`, name, throws (L/R) | existing roster data |
| appearance dates | existing play-by-play / game logs |
| pitch count per appearance | existing play-by-play (pitch events per pitcher per game) |
| role label (Closer/Setup), optional | not currently available — omit the segment if absent |

Derive `rested N days`, `threw N p yesterday`, `N p over 2 days` and the chip state
server-side, so the threshold lives in one place.

---

## 3. Injuries

### Injuries only; roster moves behind the link

**Decision:** the card lists the injured list. Call-ups, options, DFAs, trades and signings
live behind `All transactions →`. A season of option/recall churn buries the two players who
are actually hurt, which is the question the card exists to answer.

Row anatomy:

```
[photo]  Lance McCullers Jr.                          Out for season
         RHP · 60-day IL (elbow) · since Aug 12
```

- **Photo** — the shared portrait crop (`.lshot`, 30×38, `object-position: center top`).
  Never a square: it cuts the chin. Same rule as `Headshot` in `shared.jsx`.
- **Name** — links to the player page.
- **Meta** — `{pos} · {IL type} ({injury}) · since {date}`. Day numeral in mono; the month abbreviation is a word and stays sans — an all-mono `Aug 12` opens a visible gap at 11.5px.
- **Right column** — **expected return**, the one thing a reader wants next.

A two-item column header (`Injured list` / `Est. return`) sits above the rows, because the
right column is otherwise an unlabelled date.

### Missing data (this will be common)

MLB's feed frequently carries no injury description and no return estimate.

- **No description** → omit the parenthetical. Do not write `(undisclosed)`.
- **No return estimate** → the column reads `Unknown`. **Not a dash** — in a mono column a
  dash looks like a number that failed to load.
- **Day-to-day** (not formally on the IL) → include it, with `day-to-day` in place of the IL
  type and no `since` date.

### Order

Longest-term first: 60-day IL, then 15-day, then 10-day, then day-to-day. Within a tier, most
recently placed first. Severity is the reader's question; recency is the tiebreak.

### Empty state

**The card stays and says so.** Hiding it reflows the column and leaves the reader unable to
tell "nobody hurt" from "failed to load".

```html
<div class="inj-e">No players on the injured list. Recent call-ups, options and other
moves are in <a href="#">all transactions</a>.</div>
```

Drop the column header with the rows. Keep the `All transactions →` action link — roster moves
still exist when the IL is empty.

### Data required

| Field | Source |
|---|---|
| `mlbId`, name, position | existing roster data |
| IL type (`60-day`, `15-day`, `10-day`, `day-to-day`) | **new** — transactions feed |
| injury description | **new** — transactions feed (often null) |
| date placed | **new** — transactions feed |
| expected return | **new** — transactions feed (often null) |
| full transaction list (for the link destination) | **new** — same feed |

MLB's transactions endpoint covers most of this. The `All transactions →` destination is **not
designed** — leave the link inert, or point it at a plain list, and flag it.

---

## 4. CSS

Both blocks are in the design source, commented. Copy verbatim — the class names are used by
the states file too.

```css
/* bullpen */
.bp{display:flex;align-items:center;gap:10px;margin:0 -10px;padding:8px 10px;border-bottom:1px solid #e0dccd;border-radius:5px}
.bp:hover{background:#efeae0;cursor:pointer}
.bp-n a,.inj-n a{color:#15161a}
.bp:last-of-type{border-bottom:0}
.bp>div{flex:1;min-width:0}
.bp-n{font-size:13px;font-weight:600;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bp-m{font-size:11.5px;color:#5c574f;font-weight:500;margin-top:2px}
.bp-s{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 7px;border-radius:4px;border:1px solid;white-space:nowrap;flex-shrink:0}
.bp-s.rdy{background:#cce7a4;color:#3a6330;border-color:#3a633033}
.bp-s.av{background:#efeae0;color:#5c574f;border-color:#b4ae9b66}
.bp-s.un{background:#f4bdb5;color:#8a2721;border-color:#8a272133}
.bp-grp{display:flex;align-items:center;gap:9px;padding:13px 0 5px;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#6f685f}
.bp-grp::after{content:"";flex:1;height:1px;background:#e0dccd}
.bp-f{margin-top:auto;padding-top:12px;border-top:1px solid #e0dccd;font-size:11.5px;line-height:1.45;color:#5c574f;font-weight:500;text-wrap:pretty}
.bp-card>.card-b{display:flex;flex-direction:column}

/* injuries */
.inj{display:flex;align-items:center;gap:10px;margin:0 -10px;padding:9px 10px;border-bottom:1px solid #e0dccd;border-radius:5px}
.inj:hover{background:#efeae0;cursor:pointer}
.inj:last-of-type{border-bottom:0}
.inj>div{flex:1;min-width:0}
.inj-n{font-size:13px;font-weight:600;line-height:1.2}
.inj-m{font-size:11.5px;color:#5c574f;font-weight:500;margin-top:2px}
.inj-d{font-size:11.5px;color:#6f685f;font-weight:600;text-align:right;white-space:nowrap;flex-shrink:0}
.inj-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:7px;border-bottom:1px solid #cfc8b4;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#6f685f}
.inj-e{font-size:13px;line-height:1.55;color:#5c574f;padding:4px 0 2px;text-wrap:pretty}
```

`.bp-f` uses `margin-top:auto`, so the rule footer pins to the bottom of the card however tall
the column grows. That needs the `.bp-card>.card-b` flex declaration.

---

## 5. Acceptance

1. Bullpen rows are available-first, unavailable last, with the group label present **only**
   when there are unavailable arms.
2. Every chip's meta line states the evidence for that chip (rested N days / threw N p
   yesterday / back-to-back / N p over 2 days).
3. The header count matches the number of Ready + Available rows.
4. The rule footer is present and states the 25-pitch threshold.
5. Starters and injured pitchers do not appear in the bullpen list.
6. Injury rows with no description show no parenthetical; no return estimate shows `Unknown`.
7. Injuries are ordered 60-day → 15-day → 10-day → day-to-day.
8. With an empty IL, the card renders the empty line, drops the column header, and keeps the
   action link.
9. Headshots are the portrait crop — no square photos, no clipped chins.
10. Every numeral in both cards is mono with `tabular-nums`.

---

## 6. Not for port

Every name, date, pitch count and return estimate in the design files is fabricated. The
Astros roster used is approximate and the injury list is invented. Take the structure, not
the content.

## 7. Still open

- The `All transactions →` destination does not exist. Not designed.
- Role labels (Closer / Setup) are shown where present but the app has no such field yet.
- A bullpen-usage page (the natural home for a per-appearance history) is not designed.
- Mobile layout for either card, like the rest of the team page, is not designed.
