# PORT 3 of 3 — team page

**Version:** rev 1 · Sep 10, 2026
**Order: run AFTER `PROMPT_consistency_pass.md`.** This page uses the shared `ResultChip`,
the row rule and the link convention built there.

**Design source of truth: the files in THIS folder.** `Team Page - Overview v2.html`,
`Team Page - Schedule.html`, `Team Page - Today card states.html`,
`Team Page - Cards pending data.html`, and `design-files/`. They were copied from the live
design workspace on Sep 10, 2026 and match this prompt.

Ignore `archive/handoff_2026-06_baseball_realtime/` (formerly `design_handoff_baseball_realtime`) entirely — it is a **June snapshot**, frozen when
an earlier handoff was delivered, and it predates every decision in this folder. It also
contains a *different* `PROMPT_team_page.md`; where this prompt disagrees with it, this one
wins.

> ⚠️ The Sep 10 audit reported "no v2 exists" and "Season pulse / Bullpen / Injuries have
> no design artifact anywhere." **That finding is wrong** — it searched the stale handoff
> folder only. All four exist at the root. Everything else in that audit stands; this is
> the one place to disregard it. Sections E1, E5 and the §3 scoping note are void.

---

## What's already right — don't touch

From the audit: the LIVE pill is already the shared `<LivePill/>`. Start time is already
neutral, not rust. The schedule already avoids all three anti-patterns (no result row
tinting, no home/away coloured edge, no duplicate link column). Recent form, Roster,
Division standings, Next game and Team leaders are all real data — and Team leaders is
correctly team-scoped server-side, not a client-side filter of a global list.

---

## 1. Next up → five games, not three

The card fetches 3. **The design is five, and that's the decision.** Rename to
"Next 5 games", fetch 5.

Each row is one game and is currently **not clickable at all** — the consistency pass
covers making it a whole-row link.

## 2. Tab strip — Overview / Schedule

**The design has one; the app doesn't.** `Team Page - Overview v2.html` carries a strip
directly under the page header: two items, `Overview` and `Schedule`, underlined rust on
the current one, hairline under the strip.

The audit reported "no tab strip — ABSENT, but consistent with the only design source
found." That conclusion came from reading the June snapshot. **Build the strip.**

Both pages already exist as routes (`/team/:abbr` and `/team/:abbr/schedule`), so this is
navigation for two pages that are currently only reachable one-way, via a "Full schedule →"
link buried in a card. Keep that link as well — it's a contextual shortcut, not the
navigation.

Position it per the project's header pattern: the strip is a **content-level switch**, so it
sits BELOW the page header, left-aligned with the content, exactly like the player page's
tab strip and Leaders' Batting/Pitching switch. It does **not** go in the page header's
control slot.

The tab strip is the only structural addition in this prompt. Everything else is a delta.

## 3. FINAL pill

The team page hand-rolls `.tp__tag` where the daily-games final card uses the shared
`Pill`. They look close today, which is exactly how they drift apart tomorrow. Adopt the
shared atom.

## 4. Schedule page

Settled look, all three previously-explored alternatives rejected:

- Result column: the shared `ResultChip` pill. **No whole-row tinting by result** — it was
  built, reviewed and rejected; a season of tinted rows reads as a chart, not a table.
- Table sits in a card, as everywhere else. (Two other surfaces were explored — borderless
  ruled lines, and a warmer "scorebook paper" sheet — both rejected.)
- Home vs away is the `vs` / `@` tag alone. The coloured left edge was removed.
- One link per row, no trailing action column.
- Live-game row keeps its status tint and its distinct hover — that's status, not result.

## 5. The three cards with no data

**Season pulse**, **Bullpen status** and **Injuries & roster moves** are designed and in
the v2 file, but the audit confirms **none of the data exists**:

- **Season pulse** — percentile ranks per phase of the game. The only percentile code in
  the app is player-level (batter vs batter population); nothing rolls up to a team.
- **Bullpen status** — available / used yesterday / back-to-back / over 20 pitches in the
  last 3 days. Needs per-appearance pitch counts and dates for every reliever, team-wide.
  Current game logs have no pitch-count field and are fetched one player at a time. There
  is also no rule anywhere defining "available" — that's a product decision before it's an
  engineering one.
- **Injuries & roster moves** — no transactions source in the app at all.

**Ship all three as placeholder cards, not as absences.** The design owner's call: an
empty slot reads as something broken or forgotten, whereas a placeholder tells the reader
the feature is coming and tells the next developer what it needs.

The placeholder is in `Team Page - Overview v2.html` — same card shell in the same grid
slot, slightly recessed surface, muted title, one sentence describing what will go there,
and a footed line naming the missing data. **No action link** (the destination doesn't
exist either) and no fabricated numbers, bars or avatars.

The full designs are preserved in `Team Page - Cards pending data.html` — build from that
file when the data lands. Every number in it is fabricated and it is not for port.

## 6. Bullpen appears three times

The v2 design references the bullpen in three places: the Bullpen status card, a Season
pulse percentile row, and bullpen ERA in Recent form. Only the last is portable today, so
this doesn't bite yet — but flag it before the other two land. Three cards answering
"how's the bullpen" is one question with three answers.

## 7. Acceptance

- Next up shows 5 games; every row opens that game; whole row shades.
- FINAL uses the shared `Pill`.
- Schedule: chip in the result cell, no row tinting, no left edge, one link per row.
- Season pulse / Bullpen / Injuries absent, with no layout hole where they'd go.
- Nothing on the page renders a fabricated number.
- Tab strip present, below the page header, Overview and Schedule both reachable from it.

## 8. Reference file, not a port target

`Team Page - Today card states.html` is a **spec sheet**, not a screen — the Next-game card
in all three states (upcoming, live, final) side by side, so the treatments can be compared.
Use it to check the card; don't build a page from it.
