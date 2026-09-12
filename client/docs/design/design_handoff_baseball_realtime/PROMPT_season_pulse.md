# Season pulse — team page Overview card

**Version:** rev 1 · Sep 11, 2026
**Gated on new data.** Do not start the port until §3 is answered — most of this card has
no source in the current API.

**Supersedes:** `handoff_2026-09-10_consistency/PROMPT_team_page_delta.md` §5, which said
Season pulse ships as a placeholder card. It is now designed. The other two placeholders
in that section (**Bullpen status**, **Injuries & roster moves**) are unchanged and still
ship as placeholders.

---

## 1. What the card is

Top-right card on the team page Overview. It answers one question — **is this team getting
better or worse** — and then shows which parts of the game are driving it.

Two zones, in this order:

**Headline.** The club's overall rank among 30 teams, over the last twelve weeks, as a
line. Current mark large in mono (`5th`) with a movement chip beside it (`▲4`), a one-line
plain-language read underneath ("12th in July · best mark of the season"), and the line
itself to the right with `1st` / `30th` axis labels at its left edge and a dashed line at
the league median.

**The rank axis is inverted — 1st at the TOP.** Up on the chart means improving. Getting
this backwards inverts the meaning of the whole card.

**Phase rows.** Four rows — Offense, Starting pitching, Bullpen, Defense — each with:

| element | what it is |
|---|---|
| label | the phase |
| stat | the number driving the rank (`4.82 R/G`, `3.61 ERA`, `+18 OAA`) |
| bar | rank as a proportion, uniform fill, tick at the league median |
| **Prev** | rank in the 30 days *before* last |
| **Now** | rank in the last 30 days, coloured green if improved, red if worse |

Column header row reads `PREV` / `NOW`. Footnote: rank among 30 clubs · tick marks the
league median · **Prev** is the 30 days before last.

## 2. Three design decisions that are load-bearing

**Rank out of 30, not a 0–10 score.** An earlier version scored each phase out of ten
while the footnote said "percentile" — two scales in one row, neither of them how a
baseball reader thinks. Rank is the native unit.

**The driving stat is always shown.** Without it the card is a black box asking the reader
to trust five numbers, and it needed a "How we score" link to a page that does not exist.
Showing the stat means the card explains itself.

**One bar colour, not a traffic light.** An earlier version coloured each bar green/gold/grey
by threshold — five judgements competing with the rank numbers. Uniform fill; the numbers
carry the judgement, the bar carries the comparison, the median tick gives it a reference.

Window is **30 days**, fixed. Not a control — confirmed by the design owner.

## 3. Data — read this before estimating

Each of the four phases needs a different source, and they are not equally available.
**Nothing on this card exists in the API today.**

| Phase | Stat | Source | Difficulty |
|---|---|---|---|
| Offense | runs per game | game logs, date-ranged | easy |
| Starting pitching | ERA, starters only | appearance-level with a starter flag | medium |
| Bullpen | ERA, relievers only | same, plus a rule for pitchers who do both | medium |
| Defense | **OAA** (Outs Above Average) | Statcast ingest (already exists) | medium |

**Defense is OAA, not DRS.** DRS is a third-party metric we cannot source. OAA comes from
the Statcast ingest that landed in July. Caveat to know: OAA only covers balls in play, so
a team whose defensive value is in its catcher (framing, arm) will look flatter than it is.

**Baserunning was dropped from this card** — BsR is a computed sabermetric stat with no
clean source. Do not add it back without a conversation.

Per team, the card needs:

1. Each phase's rank **for two windows** — last 30 days, and the 30 days before that.
2. Each phase's current stat value.
3. The league median for each phase (the bar tick).
4. **A weekly series of the club's overall rank, twelve weeks back** (12 points).

**Item 4 is the heavy one.** It is the same league-wide rank calculation run once per week
of history, for all 30 clubs. It must be a **cached nightly job**, not computed per page
view. Items 1–3 are also league-wide calculations — ranking one team means ranking all
thirty — so they belong in the same job.

### ⚠️ The one open decision — "Overall" is not defined

The headline line and the `5th` are labelled **Overall** with no stated definition. It could
be the average of the four phase ranks, rank by run differential, or rank by record.

**The design recommends run differential** — it is a real quantity rather than an average of
ranks, and it is the standard way of saying how good a team actually is. **This has not been
confirmed by the design owner.** Do not pick one silently: whatever it is must be named in
the card's footnote, which means the copy changes with the decision.

## 4. Fidelity notes

- Rows are 13px body text; `PREV`/`NOW` headers 11px (the project's small-label floor).
- All numbers mono with tabular figures, including the rank ordinals.
- Movement chip uses the shared win/loss chip colours — `#cce7a4`/`#3a6330` for improvement,
  `#f4bdb5`/`#8a2721` for decline. **Do not use rust**: rust means live in this app.
- Axis labels sit at the **left** of the chart. They were on the right and collided with the
  current-mark dot.
- The line, its fill and the end dot are rust — that is a shape, not text, so it is fine.
- Card body is a flex column with the footnote pushed to the bottom (`margin-top:auto`) so
  the card matches the height of whatever sits beside it.

## 5. Acceptance

- Chart reads 1st at top; a rising line means the team is improving.
- Every row shows a stat value; no row is a bare score.
- Bars are one colour; the median tick is visible on each.
- `Now` is green when the rank improved, red when it worsened, neutral when unchanged.
- The footnote names what "Overall" means.
- Nothing renders a fabricated number — if a phase has no data yet, it does not render.
